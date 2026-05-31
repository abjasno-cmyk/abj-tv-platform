import Link from "next/link";
import { cookies } from "next/headers";

import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";
import { loadStudioSnapshot } from "@/lib/studio/data";
import { getStudioGateCookieName, isStudioGateTokenValid } from "@/lib/studio/gate";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function toneClass(tone: "ok" | "warning" | "error" | undefined): string {
  if (tone === "error") return "border-[#c2451f] bg-[#fbe6de] text-[#8c2d12]";
  if (tone === "warning") return "border-verox-orange/60 bg-verox-orange/12 text-verox-orangeText";
  return "border-[#3f7d57] bg-[#e3f2e8] text-[#27613f]";
}

type StudioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const loginErrorValue = resolvedSearchParams.studio_login_error;
  const statusValue = resolvedSearchParams.studio_status;
  const messageValue = resolvedSearchParams.studio_message;
  const hasLoginError = (Array.isArray(loginErrorValue) ? loginErrorValue[0] : loginErrorValue) === "1";
  const studioStatus = Array.isArray(statusValue) ? statusValue[0] : statusValue;
  const studioMessage = Array.isArray(messageValue) ? messageValue[0] : messageValue;
  const cookieStore = await cookies();
  const gateCookieValue = cookieStore.get(getStudioGateCookieName())?.value ?? null;
  const gateUnlocked = isStudioGateTokenValid(gateCookieValue);

  if (!gateUnlocked) {
    return (
      <main className="mx-auto w-full max-w-md bg-[#FBF8F2] px-4 py-10 text-verox-ink">
        <section className="rounded-[14px] border border-verox-line bg-white p-6 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <p className="vx-kicker text-verox-orangeText">VEROX Studio</p>
          <h1 className="vx-display mt-2 text-verox-ink" style={{ fontSize: "1.7rem", lineHeight: 1 }}>Vstup do Studia</h1>
          <p className="mt-3 text-sm text-verox-charcoal">
            Studio je dostupné pouze přes přihlašovací údaj a heslo. Odkaz je pouze v zápatí webu.
          </p>
          {hasLoginError ? (
            <p className="mt-3 rounded-[10px] border-l-2 border-verox-orange bg-verox-orange/12 px-3 py-2 text-xs text-verox-orangeText">
              Neplatný přihlašovací údaj nebo heslo.
            </p>
          ) : null}
          <form action="/api/studio/gate" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="redirect_to" value="/studio" />
            <div>
              <label htmlFor="studio-credential" className="block vx-meta">
                Přihlašovací údaj
              </label>
              <input
                id="studio-credential"
                name="credential"
                required
                className="mt-1 w-full rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
              />
            </div>
            <div>
              <label htmlFor="studio-password" className="block vx-meta">
                Heslo
              </label>
              <input
                id="studio-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
              />
            </div>
            <button
              type="submit"
              className="vx-btn vx-btn--solid vx-btn--block"
            >
              Odemknout Studio
            </button>
          </form>
          <Link href="/" className="vx-action mt-4 inline-flex">
            Zpět na hlavní web
          </Link>
        </section>
      </main>
    );
  }

  const access = await resolveStudioAccessContext();
  const snapshot = await loadStudioSnapshot(access);
  const isPreviewMode = !access.user || !access.canAccessStudio;
  const canEditEditorial = hasStudioCapability(access, "editorial_edit");
  const canPublishEditorial = hasStudioCapability(access, "editorial_publish");
  const canPublishBreaking = hasStudioCapability(access, "breaking_publish");
  const canProgramOverride = hasStudioCapability(access, "program_override");
  const canModerateComments = hasStudioCapability(access, "comments_moderate");
  const canManageRoles = hasStudioCapability(access, "roles_manage");
  const canReadSensitiveViewers = hasStudioCapability(access, "viewer_sensitive_read");

  return (
    <main className="mx-auto w-full max-w-[1450px] bg-[#FBF8F2] px-4 py-6 text-verox-ink md:py-8">
      <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="vx-kicker text-verox-orangeText">VEROX Studio / Control Room</p>
            <h1 className="vx-display mt-2 text-verox-ink" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1 }}>Řídicí vrstva automatizované platformy</h1>
            <p className="mt-2 max-w-3xl text-sm text-verox-charcoal">
              Automatizace je default (AUTO MODE). Manuální zásahy jsou výjimečné, auditovatelné a po zásahu se systém vrací
              do automatu (RETURN TO AUTO).
            </p>
          </div>
          <div className="rounded-[12px] border border-verox-line bg-verox-paper px-4 py-3 text-xs text-verox-charcoal">
            <p>Režim: {isPreviewMode ? "Přístup přes údaj + heslo" : "Interní OAuth přístup"}</p>
            <p className="mt-1">Uživatel: {access.displayName ?? access.email ?? "studio-operátor"}</p>
            <p className="mt-1">Role: {access.effectiveRoles.join(", ")}</p>
            <p className="mt-1">Aktualizace: {formatDateTime(snapshot.nowIso)}</p>
            <form action="/api/studio/gate" method="post" className="mt-2">
              <input type="hidden" name="mode" value="logout" />
              <input type="hidden" name="redirect_to" value="/studio" />
              <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                Uzamknout Studio
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="vx-badge vx-badge--ink">
            AUTO MODE
          </span>
          <span className="vx-badge">
            Manual override
          </span>
          <span className="rounded-none border border-verox-line bg-verox-paperDeep px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-verox-charcoal">
            Vrátit řízení automatu
          </span>
        </div>
      </section>

      {isPreviewMode ? (
        <section className="mt-5 rounded-[12px] border-l-2 border-verox-orange bg-verox-paperDeep p-4 text-sm text-verox-charcoal">
          Studio je otevřené přes údaj/heslo. Pro plné zásahové akce je stále potřeba interní OAuth přístup.
        </section>
      ) : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.overviewCards.map((card) => (
          <article key={card.id} className={`rounded-[12px] border p-3 ${toneClass(card.tone)}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] opacity-85">{card.label}</p>
            <p className="vx-display mt-2 text-xl">{card.value}</p>
            {card.hint ? <p className="mt-1 text-xs opacity-80">{card.hint}</p> : null}
          </article>
        ))}
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="mt-5 rounded-[12px] border-l-2 border-verox-orange bg-verox-orange/12 p-4 text-sm text-verox-orangeText">
          <p className="font-semibold">Systémová upozornění</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {snapshot.warnings.slice(0, 8).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {studioStatus && studioMessage ? (
        <section
          className={`mt-5 rounded-[12px] border p-4 text-sm ${
            studioStatus === "ok"
              ? "border-[#3f7d57] bg-[#e3f2e8] text-[#27613f]"
              : "border-verox-orange/60 bg-verox-orange/12 text-verox-orangeText"
          }`}
        >
          {studioMessage}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)] xl:sticky xl:top-24 xl:self-start">
          <h2 className="vx-kicker text-verox-gray">Sekce Studia</h2>
          <ol className="mt-3 space-y-2 text-sm text-verox-charcoal">
            <li><a href="#prehled" className="hover:text-verox-orangeText">1. Přehled</a></li>
            <li><a href="#automatizace" className="hover:text-verox-orangeText">2. Automatizace</a></li>
            <li><a href="#zpravy" className="hover:text-verox-orangeText">3. Zprávy</a></li>
            <li><a href="#breaking" className="hover:text-verox-orangeText">4. Breaking news</a></li>
            <li><a href="#program" className="hover:text-verox-orangeText">5. Program / živé vysílání</a></li>
            <li><a href="#videa" className="hover:text-verox-orangeText">6. Videa</a></li>
            <li><a href="#kanaly" className="hover:text-verox-orangeText">7. Kanály</a></li>
            <li><a href="#komentare" className="hover:text-verox-orangeText">8. Komentáře a komunita</a></li>
            <li><a href="#divaci" className="hover:text-verox-orangeText">9. Diváci</a></li>
            <li><a href="#statistiky" className="hover:text-verox-orangeText">10. Statistiky</a></li>
            <li><a href="#nastaveni" className="hover:text-verox-orangeText">11. Nastavení</a></li>
            <li><a href="#audit" className="hover:text-verox-orangeText">12. Audit log</a></li>
          </ol>
        </aside>

        <section className="space-y-6">
          <article id="prehled" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>1. Přehled</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Okamžitý newsroom pohled: co se děje teď, kde je riziko a kde je nutný výjimečný zásah.
            </p>
          </article>

          <article id="automatizace" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>2. Automatizace</h2>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.1em] ${toneClass(snapshot.automation.status)}`}>
                {snapshot.automation.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-verox-charcoal">
              Dohled nad strojem, nikoli ruční výrobní linka. AUTO MODE zůstává default.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                <p>Další vydání Jasných zpráv: <strong>{snapshot.automation.nextEditionHint}</strong></p>
                <p className="mt-1">Další přepočet programu: <strong>{snapshot.automation.nextProgramRebuildHint}</strong></p>
              </div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                <p className="vx-kicker text-verox-orangeText">Vrátit řízení automatu</p>
                {canProgramOverride ? (
                  <form action="/api/studio/control" method="post" className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="action" value="return_to_auto" />
                    <input type="hidden" name="redirect_to" value="/studio#automatizace" />
                    <input
                      name="reason"
                      placeholder="Důvod zásahu"
                      className="min-w-[220px] rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-xs text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                    />
                    <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                      Vrátit řízení automatu
                    </button>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-verox-gray">Pro tuto akci je potřeba role senior_editor / admin / owner.</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="vx-kicker text-verox-charcoal">Health checks</h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.automation.healthChecks.slice(0, 8).map((check) => (
                    <li key={check.id} className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-charcoal">
                      <p className="font-semibold text-verox-ink">{check.id}</p>
                      <p className="text-xs text-verox-gray">{check.status} · {check.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="vx-kicker text-verox-charcoal">Poslední běhy</h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.automation.lastRuns.slice(0, 6).map((run) => (
                    <li key={run.id} className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-charcoal">
                      <p className="font-semibold text-verox-ink">{run.status}</p>
                      <p className="text-xs text-verox-gray">
                        {formatDateTime(run.startedAt)} → {formatDateTime(run.finishedAt)}
                      </p>
                      {run.errorText ? <p className="mt-1 text-xs text-verox-orangeText">{run.errorText}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article id="zpravy" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>3. Zprávy</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Defaultní flow je generated → auto_published. Ruční zásah je výjimečný override nad publikovaným výstupem.
            </p>
            <div className="mt-4 overflow-auto rounded-[10px] border border-verox-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-verox-paperDeep text-xs uppercase tracking-[0.08em] text-verox-gray">
                  <tr>
                    <th className="px-3 py-2">Titulek</th>
                    <th className="px-3 py-2">Stav</th>
                    <th className="px-3 py-2">Vydání</th>
                    <th className="px-3 py-2">Publikováno</th>
                    <th className="px-3 py-2">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.news.rows.slice(0, 25).map((row) => (
                    <tr key={row.id} className="border-t border-verox-line align-top">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-verox-ink">{row.title}</p>
                        <p className="text-xs text-verox-gray">Priorita: {row.priority} · {row.autoPublished ? "Automaticky publikováno" : "Manual"}</p>
                      </td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.status}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.edition}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{formatDateTime(row.publishedAt)}</td>
                      <td className="px-3 py-2">
                        {canEditEditorial ? (
                          <div className="flex flex-wrap gap-2">
                            <form action="/api/studio/control" method="post">
                              <input type="hidden" name="action" value="editorial_mark_edited" />
                              <input type="hidden" name="item_id" value={row.id} />
                              <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                              <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                                Upraveno po publikaci
                              </button>
                            </form>
                            {canPublishEditorial ? (
                              <>
                                <form action="/api/studio/control" method="post">
                                  <input type="hidden" name="action" value="editorial_withdraw" />
                                  <input type="hidden" name="item_id" value={row.id} />
                                  <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                                  <button className="vx-btn vx-btn--sm">
                                    Stáhnout z webu
                                  </button>
                                </form>
                                <form action="/api/studio/control" method="post">
                                  <input type="hidden" name="action" value="editorial_return_to_auto" />
                                  <input type="hidden" name="item_id" value={row.id} />
                                  <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                                  <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                                    Vrátit AUTO MODE
                                  </button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-verox-gray">Bez oprávnění</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="breaking" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>4. Breaking news</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Ruční injekce do běžící automatizace. Breaking news nesmí zastavit celý systém.
            </p>
            {canPublishBreaking ? (
              <form action="/api/studio/control" method="post" className="mt-4 grid gap-2 rounded-[10px] border border-verox-line bg-verox-paper p-3 md:grid-cols-2">
                <input type="hidden" name="action" value="breaking_create" />
                <input type="hidden" name="redirect_to" value="/studio#breaking" />
                <input
                  name="title"
                  required
                  placeholder="title"
                  className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <input
                  name="short_text"
                  placeholder="short_text"
                  className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <textarea
                  name="body"
                  placeholder="body"
                  className="md:col-span-2 min-h-[82px] rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-xs text-verox-charcoal">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="show_on_homepage" /> show_on_homepage</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="show_as_top_banner" /> show_as_top_banner</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="show_in_news_section" defaultChecked /> show_in_news_section</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="include_in_next_jasne_zpravy" /> include_in_next_jasne_zpravy</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="insert_into_broadcast" /> insert_into_broadcast</label>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <button
                    name="initial_status"
                    value="draft"
                    className="vx-btn vx-btn--sm vx-btn--ghost-ink"
                  >
                    Uložit draft
                  </button>
                  <button
                    name="initial_status"
                    value="published"
                    className="vx-btn vx-btn--sm vx-btn--solid"
                  >
                    Publikovat breaking news
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-3 text-sm text-verox-gray">Pro publikaci breaking news je potřeba role senior_editor / admin / owner.</p>
            )}

            <div className="mt-4 space-y-2">
              {snapshot.breakingNews.rows.slice(0, 12).map((row) => (
                <div key={row.id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-verox-ink">{row.title}</p>
                    <span className="text-xs text-verox-gray">{row.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-verox-gray">
                    Platnost: {formatDateTime(row.validFrom)} - {formatDateTime(row.validTo)} · Priority {row.priority}
                  </p>
                  {canPublishBreaking ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="breaking_publish" />
                        <input type="hidden" name="breaking_id" value={row.id} />
                        <input type="hidden" name="redirect_to" value="/studio#breaking" />
                        <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                          Publikovat
                        </button>
                      </form>
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="breaking_withdraw" />
                        <input type="hidden" name="breaking_id" value={row.id} />
                        <input type="hidden" name="redirect_to" value="/studio#breaking" />
                        <button className="vx-btn vx-btn--sm">
                          Stáhnout
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="program" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>5. Program / živé vysílání</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Override nad automatickým plánovačem. Klíčové tlačítko: <strong>Vrátit řízení automatu</strong>.
            </p>
            <div className="mt-3 rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
              <p>Právě běží: <strong>{snapshot.program.nowPlaying.title ?? "Nedostupné"}</strong></p>
              <p className="text-xs text-verox-gray">
                Typ: {snapshot.program.nowPlaying.type ?? "—"} · Kanál: {snapshot.program.nowPlaying.channel ?? "—"} · Konec:{" "}
                {formatDateTime(snapshot.program.nowPlaying.endsAt)}
              </p>
            </div>
            {canProgramOverride ? (
              <form action="/api/studio/control" method="post" className="mt-3 grid gap-2 rounded-[10px] border border-verox-line bg-verox-paper p-3 md:grid-cols-2">
                <input type="hidden" name="action" value="program_override_create" />
                <input type="hidden" name="redirect_to" value="/studio#program" />
                <select name="override_action" required className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25">
                  <option value="insert_block">insert_block</option>
                  <option value="replace_block">replace_block</option>
                  <option value="skip_block">skip_block</option>
                  <option value="lock_block">lock_block</option>
                  <option value="force_video">force_video</option>
                  <option value="ban_video_from_broadcast">ban_video_from_broadcast</option>
                  <option value="return_to_auto">return_to_auto</option>
                </select>
                <input
                  name="title"
                  placeholder="Název zásahu"
                  className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <input
                  name="content_id"
                  placeholder="content_id / video_id"
                  className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <input
                  name="reason"
                  placeholder="Důvod"
                  className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-2 text-sm text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25"
                />
                <button className="vx-btn vx-btn--sm vx-btn--solid md:col-span-2">
                  Vložit do programu
                </button>
              </form>
            ) : null}
            <div className="mt-3 space-y-2">
              {snapshot.program.overrides.slice(0, 10).map((row) => (
                <div key={row.id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                  <p className="font-semibold text-verox-ink">{row.title}</p>
                  <p className="text-xs text-verox-gray">
                    {row.action ?? "override"} · {row.status} · {formatDateTime(row.startsAt)} - {formatDateTime(row.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article id="videa" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>6. Videa</h2>
            <div className="mt-3 overflow-auto rounded-[10px] border border-verox-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-verox-paperDeep text-xs uppercase tracking-[0.08em] text-verox-gray">
                  <tr>
                    <th className="px-3 py-2">Video</th>
                    <th className="px-3 py-2">Kanál</th>
                    <th className="px-3 py-2">Publikováno</th>
                    <th className="px-3 py-2">Starty</th>
                    <th className="px-3 py-2">Dokoukání</th>
                    <th className="px-3 py-2">Broadcast</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.videos.rows.map((row) => (
                    <tr key={row.videoId} className="border-t border-verox-line">
                      <td className="px-3 py-2 text-verox-ink">{row.title}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.channel}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{formatDateTime(row.publishedAt)}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.starts}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.completions}</td>
                      <td className="px-3 py-2 text-xs">{row.suitableForBroadcast ? "vhodné" : "nevhodné"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="kanaly" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>7. Kanály</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {snapshot.channels.rows.slice(0, 20).map((row) => (
                <div key={row.channelId} className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                  <p className="font-semibold text-verox-ink">{row.channelName}</p>
                  <p className="text-xs text-verox-gray">ID: {row.channelId}</p>
                  <p className="mt-1 text-xs text-verox-charcoal">
                    Videa: {row.videosCount} · Followers: {row.followersCount} · 7d: {row.starts7d} · 30d: {row.starts30d}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article id="komentare" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>8. Komentáře a komunita</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Skrytí/obnovení řešíme stavově s auditní stopou, nikoli fyzickým mazáním.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Nové za hodinu: {snapshot.comments.lastHourCount}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Nahlášené: {snapshot.comments.flaggedCount}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Skryté: {snapshot.comments.hiddenCount}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Potenciální spam účty: {snapshot.comments.potentialSpamUsers}</div>
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.comments.latest.slice(0, 20).map((comment) => (
                <div key={comment.id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                  <p className="text-verox-ink">{comment.body}</p>
                  <p className="mt-1 text-xs text-verox-gray">
                    {comment.status} · {comment.entityType}/{comment.entityId} · {formatDateTime(comment.createdAt)}
                  </p>
                  {canModerateComments ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="comment_hide" />
                        <input type="hidden" name="comment_id" value={comment.id} />
                        <input type="hidden" name="redirect_to" value="/studio#komentare" />
                        <button className="vx-btn vx-btn--sm">
                          Skrýt komentář
                        </button>
                      </form>
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="comment_restore" />
                        <input type="hidden" name="comment_id" value={comment.id} />
                        <input type="hidden" name="redirect_to" value="/studio#komentare" />
                        <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                          Obnovit komentář
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="divaci" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>9. Diváci</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Registrovaní celkem: {snapshot.viewers.registeredTotal}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Noví dnes: {snapshot.viewers.newToday}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Aktivní dnes: {snapshot.viewers.activeToday}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Aktivní 7 dní: {snapshot.viewers.active7d}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Aktivní 30 dní: {snapshot.viewers.active30d}</div>
              <div className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">Rozkoukáno: {snapshot.viewers.resumeUsers}</div>
            </div>
            <div className="mt-3 rounded-[10px] border border-verox-line bg-verox-paper p-3 text-xs text-verox-charcoal">
              <p className="font-semibold text-verox-ink">Přihlášení podle provideru</p>
              <ul className="mt-1 grid gap-1 md:grid-cols-3">
                {Object.entries(snapshot.viewers.providerBreakdown).map(([provider, count]) => (
                  <li key={provider}>
                    {provider}: {count}
                  </li>
                ))}
              </ul>
            </div>
            {canReadSensitiveViewers ? (
              <div className="mt-3 overflow-auto rounded-[10px] border border-verox-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-verox-paperDeep text-xs uppercase tracking-[0.08em] text-verox-gray">
                    <tr>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Display name</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Vytvořeno</th>
                      <th className="px-3 py-2">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.viewers.topUsers.map((row) => (
                      <tr key={row.id} className="border-t border-verox-line">
                        <td className="px-3 py-2 text-verox-charcoal">{row.email ?? "—"}</td>
                        <td className="px-3 py-2 text-verox-charcoal">{row.displayName ?? "—"}</td>
                        <td className="px-3 py-2 text-verox-charcoal">{row.role ?? "viewer"}</td>
                        <td className="px-3 py-2 text-verox-charcoal">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2 text-verox-charcoal">{formatDateTime(row.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-verox-gray">
                Detailní divácké údaje jsou omezeny pouze na admin/owner.
              </p>
            )}
          </article>

          <article id="statistiky" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>10. Statistiky</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Dashboardy jsou připraveny i pro budoucí doplnění dat. Chybějící metriky nezpůsobí pád aplikace.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {Object.entries(snapshot.statistics.events24h).slice(0, 15).map(([eventName, count]) => (
                <div key={eventName} className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                  <p className="text-verox-charcoal">{eventName}</p>
                  <p className="vx-display mt-1 text-lg text-verox-ink">{count}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="nastaveni" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>11. Nastavení</h2>
            <p className="mt-2 text-sm text-verox-charcoal">
              Interní uživatelé, role a povolené akce. Každá změna role musí být auditována.
            </p>
            <div className="mt-3 rounded-[10px] border border-verox-line bg-verox-paper p-3 text-xs text-verox-charcoal">
              Přístup je omezen na allowlist: {snapshot.settings.allowedEmails.join(", ")}
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.settings.internalUsers.map((user) => (
                <div key={user.userId} className="rounded-[10px] border border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                  <p className="font-semibold text-verox-ink">{user.displayName ?? user.email ?? user.userId}</p>
                  <p className="text-xs text-verox-gray">
                    Profil role: {user.profileRole ?? "viewer"} · Extra role: {user.extraRoles.join(", ") || "—"}
                  </p>
                  {canManageRoles ? (
                    <form action="/api/studio/control" method="post" className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="action" value="role_assign" />
                      <input type="hidden" name="target_user_id" value={user.userId} />
                      <input type="hidden" name="redirect_to" value="/studio#nastaveni" />
                      <select name="role" className="rounded-[10px] border border-verox-line bg-verox-paper px-3 py-1 text-xs text-verox-ink outline-none transition focus:border-verox-orange/65 focus:ring-2 focus:ring-verox-orange/25">
                        <option value="moderator">moderator</option>
                        <option value="editor">editor</option>
                        <option value="senior_editor">senior_editor</option>
                        <option value="analyst">analyst</option>
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                      </select>
                      <button className="vx-btn vx-btn--sm vx-btn--ghost-ink">
                        Přidat roli
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="audit" className="rounded-[12px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
            <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.25rem", lineHeight: 1.05 }}>12. Audit log</h2>
            <div className="mt-3 overflow-auto rounded-[10px] border border-verox-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-verox-paperDeep text-xs uppercase tracking-[0.08em] text-verox-gray">
                  <tr>
                    <th className="px-3 py-2">Kdy</th>
                    <th className="px-3 py-2">Akce</th>
                    <th className="px-3 py-2">Entita</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Důvod</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.audit.rows.map((row) => (
                    <tr key={row.id} className="border-t border-verox-line">
                      <td className="px-3 py-2 text-verox-charcoal">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.action}</td>
                      <td className="px-3 py-2 text-verox-charcoal">
                        {row.entityType} {row.entityId ? `(${row.entityId})` : ""}
                      </td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.actorId ?? "system"}</td>
                      <td className="px-3 py-2 text-verox-charcoal">{row.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
