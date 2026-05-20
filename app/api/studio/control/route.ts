import { NextResponse } from "next/server";

import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";
import { getStudioGateCookieName, isStudioGateTokenValid, readCookieValueFromHeader } from "@/lib/studio/gate";

export const dynamic = "force-dynamic";

type Payload = Record<string, string | undefined>;

type StudioAction =
  | "return_to_auto"
  | "editorial_mark_edited"
  | "editorial_withdraw"
  | "editorial_return_to_auto"
  | "breaking_create"
  | "breaking_publish"
  | "breaking_withdraw"
  | "program_override_create"
  | "comment_hide"
  | "comment_restore"
  | "role_assign";

const ASSIGNABLE_ROLES = new Set(["moderator", "editor", "senior_editor", "analyst", "admin", "owner"]);

function asString(value: string | undefined): string {
  return (value ?? "").trim();
}

function asBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "on" || normalized === "1" || normalized === "true" || normalized === "yes";
}

function pickRedirectTarget(payload: Payload): string {
  const raw = asString(payload.redirect_to);
  if (!raw.startsWith("/")) return "/studio";
  return raw;
}

async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, typeof value === "string" ? value : value == null ? undefined : String(value)]),
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return {};
  const result: Payload = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

async function appendAuditLog(params: {
  supabase: Awaited<ReturnType<typeof resolveStudioAccessContext>>["supabase"];
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  request: Request;
}) {
  const userAgent = params.request.headers.get("user-agent");
  const forwardedFor = params.request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  const auditInsert = await params.supabase.from("audit_log").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    reason: params.reason ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  if (auditInsert.error) {
    throw new Error(`Audit log insert failed: ${auditInsert.error.message}`);
  }
}

function redirectWithMessage(request: Request, target: string, status: "ok" | "error", message: string) {
  const url = new URL(target, request.url);
  url.searchParams.set("studio_status", status);
  url.searchParams.set("studio_message", message.slice(0, 160));
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const action = asString(payload.action) as StudioAction;
  const redirectTo = pickRedirectTarget(payload);
  const gateCookieValue = readCookieValueFromHeader(request.headers.get("cookie"), getStudioGateCookieName());
  if (!isStudioGateTokenValid(gateCookieValue)) {
    return NextResponse.json({ error: "Studio je uzamčeno. Nejprve zadejte přihlašovací údaj a heslo." }, { status: 401 });
  }

  const access = await resolveStudioAccessContext();
  if (!access.user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }
  if (!access.canAccessStudio) {
    return NextResponse.json({ error: "Do Studia nemáte přístup." }, { status: 403 });
  }

  const supabase = access.supabase;
  const actorId = access.user.id;

  try {
    switch (action) {
      case "return_to_auto": {
        if (!hasStudioCapability(access, "program_override")) {
          return NextResponse.json({ error: "Nedostatečná role pro zásah do programu." }, { status: 403 });
        }
        const reason = asString(payload.reason) || "Manual override ukončen";
        const insert = await supabase
          .from("broadcast_schedule_overrides")
          .insert({
            action: "return_to_auto",
            content_type: "system",
            title: "Vrátit řízení automatu",
            status: "active",
            reason,
            created_by: actorId,
            starts_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insert.error || !insert.data) {
          throw new Error(insert.error?.message ?? "Nelze uložit override.");
        }
        await appendAuditLog({
          supabase,
          actorId,
          action: "return_to_auto",
          entityType: "broadcast_schedule_overrides",
          entityId: insert.data.id,
          newValue: { action: "return_to_auto" },
          reason,
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", "Řízení vráceno automatu.");
      }

      case "editorial_mark_edited":
      case "editorial_withdraw":
      case "editorial_return_to_auto": {
        if (!hasStudioCapability(access, "editorial_edit")) {
          return NextResponse.json({ error: "Nedostatečná role pro editaci zpráv." }, { status: 403 });
        }
        const itemId = asString(payload.item_id);
        if (!itemId) {
          return NextResponse.json({ error: "item_id je povinné." }, { status: 400 });
        }
        const current = await supabase
          .from("editorial_items")
          .select("id, status, manual_override")
          .eq("id", itemId)
          .maybeSingle();
        if (current.error || !current.data) {
          throw new Error(current.error?.message ?? "Položka nebyla nalezena.");
        }
        const targetStatus =
          action === "editorial_withdraw"
            ? "withdrawn"
            : action === "editorial_return_to_auto"
              ? "auto_published"
              : "edited_after_publish";
        if (action === "editorial_withdraw" && !hasStudioCapability(access, "editorial_publish")) {
          return NextResponse.json({ error: "Stahování vyžaduje vyšší roli." }, { status: 403 });
        }
        const update = await supabase
          .from("editorial_items")
          .update({
            status: targetStatus,
            manual_override: targetStatus !== "auto_published",
            updated_by: actorId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId)
          .select("id, status, manual_override")
          .single();
        if (update.error || !update.data) {
          throw new Error(update.error?.message ?? "Položku se nepodařilo upravit.");
        }

        await supabase.from("editorial_revisions").insert({
          item_id: itemId,
          changed_by: actorId,
          change_type: action,
          old_value: current.data,
          new_value: update.data,
          change_note: asString(payload.reason) || null,
        });

        await appendAuditLog({
          supabase,
          actorId,
          action,
          entityType: "editorial_items",
          entityId: itemId,
          oldValue: current.data as Record<string, unknown>,
          newValue: update.data as Record<string, unknown>,
          reason: asString(payload.reason) || null,
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", "Redakční položka byla upravena.");
      }

      case "breaking_create": {
        if (!hasStudioCapability(access, "breaking_write")) {
          return NextResponse.json({ error: "Nedostatečná role pro breaking news." }, { status: 403 });
        }
        const title = asString(payload.title);
        if (!title) return NextResponse.json({ error: "title je povinný." }, { status: 400 });
        const initialStatus = asString(payload.initial_status) === "published" ? "published" : "draft";
        if (initialStatus === "published" && !hasStudioCapability(access, "breaking_publish")) {
          return NextResponse.json({ error: "Publikace breaking news vyžaduje vyšší roli." }, { status: 403 });
        }
        const nowIso = new Date().toISOString();
        const insert = await supabase
          .from("breaking_news")
          .insert({
            title,
            short_text: asString(payload.short_text) || null,
            body: asString(payload.body) || null,
            priority: Number(asString(payload.priority) || "0") || 0,
            show_on_homepage: asBoolean(payload.show_on_homepage),
            show_as_top_banner: asBoolean(payload.show_as_top_banner),
            show_in_news_section: payload.show_in_news_section ? asBoolean(payload.show_in_news_section) : true,
            include_in_next_jasne_zpravy: asBoolean(payload.include_in_next_jasne_zpravy),
            insert_into_broadcast: asBoolean(payload.insert_into_broadcast),
            status: initialStatus,
            created_by: actorId,
            published_by: initialStatus === "published" ? actorId : null,
            published_at: initialStatus === "published" ? nowIso : null,
            metadata: {},
          })
          .select("id, status")
          .single();
        if (insert.error || !insert.data) {
          throw new Error(insert.error?.message ?? "Breaking news se nepodařilo uložit.");
        }
        await appendAuditLog({
          supabase,
          actorId,
          action: "breaking_create",
          entityType: "breaking_news",
          entityId: insert.data.id,
          newValue: { status: insert.data.status, title },
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", initialStatus === "published" ? "Breaking news publikováno." : "Breaking news uloženo jako draft.");
      }

      case "breaking_publish":
      case "breaking_withdraw": {
        const needCapability = action === "breaking_publish" ? "breaking_publish" : "breaking_publish";
        if (!hasStudioCapability(access, needCapability)) {
          return NextResponse.json({ error: "Nedostatečná role pro publikaci/stahování breaking news." }, { status: 403 });
        }
        const breakingId = asString(payload.breaking_id);
        if (!breakingId) return NextResponse.json({ error: "breaking_id je povinné." }, { status: 400 });
        const current = await supabase
          .from("breaking_news")
          .select("id, status, published_at")
          .eq("id", breakingId)
          .maybeSingle();
        if (current.error || !current.data) throw new Error(current.error?.message ?? "Breaking news nebyla nalezena.");
        const nowIso = new Date().toISOString();
        const status = action === "breaking_publish" ? "published" : "withdrawn";
        const update = await supabase
          .from("breaking_news")
          .update({
            status,
            published_by: action === "breaking_publish" ? actorId : null,
            published_at: action === "breaking_publish" ? nowIso : current.data.published_at,
            withdrawn_by: action === "breaking_withdraw" ? actorId : null,
            withdrawn_at: action === "breaking_withdraw" ? nowIso : null,
            updated_at: nowIso,
          })
          .eq("id", breakingId)
          .select("id, status")
          .single();
        if (update.error || !update.data) throw new Error(update.error?.message ?? "Breaking news se nepodařilo upravit.");
        await appendAuditLog({
          supabase,
          actorId,
          action,
          entityType: "breaking_news",
          entityId: breakingId,
          oldValue: current.data as Record<string, unknown>,
          newValue: update.data as Record<string, unknown>,
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", action === "breaking_publish" ? "Breaking news publikována." : "Breaking news stažena.");
      }

      case "program_override_create": {
        if (!hasStudioCapability(access, "program_override")) {
          return NextResponse.json({ error: "Nedostatečná role pro programové override." }, { status: 403 });
        }
        const overrideAction = asString(payload.override_action);
        if (!overrideAction) return NextResponse.json({ error: "override_action je povinné." }, { status: 400 });
        const insert = await supabase
          .from("broadcast_schedule_overrides")
          .insert({
            action: overrideAction,
            content_type: "manual",
            content_id: asString(payload.content_id) || null,
            title: asString(payload.title) || "Manual override",
            reason: asString(payload.reason) || null,
            created_by: actorId,
            status: "active",
            starts_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insert.error || !insert.data) {
          throw new Error(insert.error?.message ?? "Programový override se nepodařilo uložit.");
        }
        await appendAuditLog({
          supabase,
          actorId,
          action: "program_override_create",
          entityType: "broadcast_schedule_overrides",
          entityId: insert.data.id,
          newValue: { action: overrideAction },
          reason: asString(payload.reason) || null,
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", "Programový override uložen.");
      }

      case "comment_hide":
      case "comment_restore": {
        if (!hasStudioCapability(access, "comments_moderate")) {
          return NextResponse.json({ error: "Nedostatečná role pro moderaci komentářů." }, { status: 403 });
        }
        const commentId = asString(payload.comment_id);
        if (!commentId) return NextResponse.json({ error: "comment_id je povinné." }, { status: 400 });
        const current = await supabase
          .from("comments")
          .select("id, user_id, status, entity_type, entity_id")
          .eq("id", commentId)
          .maybeSingle();
        if (current.error || !current.data) {
          throw new Error(current.error?.message ?? "Komentář nebyl nalezen.");
        }
        const nextStatus = action === "comment_hide" ? "hidden" : "published";
        const update = await supabase
          .from("comments")
          .update({ status: nextStatus })
          .eq("id", commentId)
          .select("id, status")
          .single();
        if (update.error || !update.data) throw new Error(update.error?.message ?? "Komentář se nepodařilo upravit.");

        const moderation = await supabase.from("moderation_actions").insert({
          moderator_id: actorId,
          target_user_id: current.data.user_id,
          target_type: "comment",
          target_id: commentId,
          action: nextStatus === "hidden" ? "hide" : "restore",
          reason: asString(payload.reason) || null,
          metadata: {
            old_status: current.data.status,
            new_status: nextStatus,
            entity_type: current.data.entity_type,
            entity_id: current.data.entity_id,
          },
        });
        if (moderation.error) throw new Error(moderation.error.message);

        await appendAuditLog({
          supabase,
          actorId,
          action,
          entityType: "comments",
          entityId: commentId,
          oldValue: current.data as Record<string, unknown>,
          newValue: update.data as Record<string, unknown>,
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", action === "comment_hide" ? "Komentář byl skryt." : "Komentář byl obnoven.");
      }

      case "role_assign": {
        if (!hasStudioCapability(access, "roles_manage")) {
          return NextResponse.json({ error: "Nedostatečná role pro správu rolí." }, { status: 403 });
        }
        const targetUserId = asString(payload.target_user_id);
        const role = asString(payload.role);
        if (!targetUserId || !role) {
          return NextResponse.json({ error: "target_user_id a role jsou povinné." }, { status: 400 });
        }
        if (!ASSIGNABLE_ROLES.has(role)) {
          return NextResponse.json({ error: "Neplatná role." }, { status: 400 });
        }
        const insert = await supabase.from("admin_roles").upsert(
          {
            user_id: targetUserId,
            role,
            created_by: actorId,
          },
          { onConflict: "user_id,role" },
        );
        if (insert.error) throw new Error(insert.error.message);
        await appendAuditLog({
          supabase,
          actorId,
          action: "role_assign",
          entityType: "admin_roles",
          entityId: targetUserId,
          newValue: { role },
          request,
        });
        return redirectWithMessage(request, redirectTo, "ok", "Role byla přidělena.");
      }

      default:
        return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return redirectWithMessage(request, redirectTo, "error", message);
  }
}
