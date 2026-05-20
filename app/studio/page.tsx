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
  if (tone === "error") return "border-[#ff5a5a]/60 bg-[#2b1414] text-[#ffb3b3]";
  if (tone === "warning") return "border-[#ff6a00]/60 bg-[#2b1d12] text-[#ffd0ad]";
  return "border-[#3f5f4f] bg-[#142017] text-[#b4efc5]";
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
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-6 text-[#edf2fb] shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">VEROX Studio</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Vstup do Studia</h1>
          <p className="mt-3 text-sm text-[#b7c1d3]">
            Studio je dostupné pouze přes přihlašovací údaj a heslo. Odkaz je pouze v zápatí webu.
          </p>
          {hasLoginError ? (
            <p className="mt-3 rounded-md border border-[#7a3d2b] bg-[#2a1814] px-3 py-2 text-xs text-[#ffcebd]">
              Neplatný přihlašovací údaj nebo heslo.
            </p>
          ) : null}
          <form action="/api/studio/gate" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="redirect_to" value="/studio" />
            <div>
              <label htmlFor="studio-credential" className="block text-xs text-[#b7c1d3]">
                Přihlašovací údaj
              </label>
              <input
                id="studio-credential"
                name="credential"
                required
                className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
              />
            </div>
            <div>
              <label htmlFor="studio-password" className="block text-xs text-[#b7c1d3]">
                Heslo
              </label>
              <input
                id="studio-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md border border-[#ff6a00] bg-[#ff6a00] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e95f00]"
            >
              Odemknout Studio
            </button>
          </form>
          <Link href="/" className="mt-4 inline-flex text-xs text-[#9fb0cc] underline hover:text-[#c8d5ea]">
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
    <main className="mx-auto w-full max-w-[1450px] px-4 py-6 text-[#edf2fb] md:py-8">
      <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">VEROX Studio / Control Room</p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Řídicí vrstva automatizované platformy</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#b7c1d3]">
              Automatizace je default (AUTO MODE). Manuální zásahy jsou výjimečné, auditovatelné a po zásahu se systém vrací
              do automatu (RETURN TO AUTO).
            </p>
          </div>
          <div className="rounded-xl border border-[#2b3345] bg-[#0b0f16] px-4 py-3 text-xs text-[#c4cede]">
            <p>Režim: {isPreviewMode ? "Přístup přes údaj + heslo" : "Interní OAuth přístup"}</p>
            <p className="mt-1">Uživatel: {access.displayName ?? access.email ?? "studio-operátor"}</p>
            <p className="mt-1">Role: {access.effectiveRoles.join(", ")}</p>
            <p className="mt-1">Aktualizace: {formatDateTime(snapshot.nowIso)}</p>
            <form action="/api/studio/gate" method="post" className="mt-2">
              <input type="hidden" name="mode" value="logout" />
              <input type="hidden" name="redirect_to" value="/studio" />
              <button className="rounded-md border border-[#30384a] bg-[#101625] px-2 py-1 text-[11px] text-[#d8e2f3] hover:border-[#ff6a00]/70">
                Uzamknout Studio
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#3f5f4f] bg-[#142017] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b4efc5]">
            AUTO MODE
          </span>
          <span className="rounded-full border border-[#ff6a00]/55 bg-[#2b1d12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ffd0ad]">
            Manual override
          </span>
          <span className="rounded-full border border-[#35508b] bg-[#111a2e] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#bfd3ff]">
            Vrátit řízení automatu
          </span>
        </div>
      </section>

      {isPreviewMode ? (
        <section className="mt-5 rounded-xl border border-[#35508b] bg-[#111a2e] p-4 text-sm text-[#bfd3ff]">
          Studio je otevřené přes údaj/heslo. Pro plné zásahové akce je stále potřeba interní OAuth přístup.
        </section>
      ) : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.overviewCards.map((card) => (
          <article key={card.id} className={`rounded-xl border p-3 ${toneClass(card.tone)}`}>
            <p className="text-[11px] uppercase tracking-[0.11em] opacity-85">{card.label}</p>
            <p className="mt-2 text-xl font-semibold">{card.value}</p>
            {card.hint ? <p className="mt-1 text-xs opacity-80">{card.hint}</p> : null}
          </article>
        ))}
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="mt-5 rounded-xl border border-[#7a3d2b] bg-[#2a1814] p-4 text-sm text-[#ffcebd]">
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
          className={`mt-5 rounded-xl border p-4 text-sm ${
            studioStatus === "ok"
              ? "border-[#3f5f4f] bg-[#142017] text-[#b4efc5]"
              : "border-[#7a3d2b] bg-[#2a1814] text-[#ffcebd]"
          }`}
        >
          {studioMessage}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4 xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-sm font-semibold text-white">Sekce Studia</h2>
          <ol className="mt-3 space-y-2 text-sm text-[#c4cede]">
            <li><a href="#prehled" className="hover:text-[#ff6a00]">1. Přehled</a></li>
            <li><a href="#automatizace" className="hover:text-[#ff6a00]">2. Automatizace</a></li>
            <li><a href="#zpravy" className="hover:text-[#ff6a00]">3. Zprávy</a></li>
            <li><a href="#breaking" className="hover:text-[#ff6a00]">4. Breaking news</a></li>
            <li><a href="#program" className="hover:text-[#ff6a00]">5. Program / živé vysílání</a></li>
            <li><a href="#videa" className="hover:text-[#ff6a00]">6. Videa</a></li>
            <li><a href="#kanaly" className="hover:text-[#ff6a00]">7. Kanály</a></li>
            <li><a href="#komentare" className="hover:text-[#ff6a00]">8. Komentáře a komunita</a></li>
            <li><a href="#divaci" className="hover:text-[#ff6a00]">9. Diváci</a></li>
            <li><a href="#statistiky" className="hover:text-[#ff6a00]">10. Statistiky</a></li>
            <li><a href="#nastaveni" className="hover:text-[#ff6a00]">11. Nastavení</a></li>
            <li><a href="#audit" className="hover:text-[#ff6a00]">12. Audit log</a></li>
          </ol>
        </aside>

        <section className="space-y-6">
          <article id="prehled" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">1. Přehled</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Okamžitý newsroom pohled: co se děje teď, kde je riziko a kde je nutný výjimečný zásah.
            </p>
          </article>

          <article id="automatizace" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">2. Automatizace</h2>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.1em] ${toneClass(snapshot.automation.status)}`}>
                {snapshot.automation.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Dohled nad strojem, nikoli ruční výrobní linka. AUTO MODE zůstává default.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                <p>Další vydání Jasných zpráv: <strong>{snapshot.automation.nextEditionHint}</strong></p>
                <p className="mt-1">Další přepočet programu: <strong>{snapshot.automation.nextProgramRebuildHint}</strong></p>
              </div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.1em] text-[#ff6a00]">Vrátit řízení automatu</p>
                {canProgramOverride ? (
                  <form action="/api/studio/control" method="post" className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="action" value="return_to_auto" />
                    <input type="hidden" name="redirect_to" value="/studio#automatizace" />
                    <input
                      name="reason"
                      placeholder="Důvod zásahu"
                      className="min-w-[220px] rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-xs text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                    />
                    <button className="rounded-md border border-[#35508b] bg-[#15233f] px-3 py-2 text-xs font-semibold text-[#cfe0ff]">
                      Vrátit řízení automatu
                    </button>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-[#93a0b8]">Pro tuto akci je potřeba role senior_editor / admin / owner.</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Health checks</h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.automation.healthChecks.slice(0, 8).map((check) => (
                    <li key={check.id} className="rounded-md border border-[#2f3647] bg-[#0c1018] px-3 py-2 text-sm">
                      <p className="font-medium text-[#e6ecf9]">{check.id}</p>
                      <p className="text-xs text-[#aab5c9]">{check.status} · {check.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Poslední běhy</h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.automation.lastRuns.slice(0, 6).map((run) => (
                    <li key={run.id} className="rounded-md border border-[#2f3647] bg-[#0c1018] px-3 py-2 text-sm">
                      <p className="font-medium text-[#e6ecf9]">{run.status}</p>
                      <p className="text-xs text-[#aab5c9]">
                        {formatDateTime(run.startedAt)} → {formatDateTime(run.finishedAt)}
                      </p>
                      {run.errorText ? <p className="mt-1 text-xs text-[#ffbdbd]">{run.errorText}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article id="zpravy" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">3. Zprávy</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Defaultní flow je generated → auto_published. Ruční zásah je výjimečný override nad publikovaným výstupem.
            </p>
            <div className="mt-4 overflow-auto rounded-lg border border-[#2f3647]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#131929] text-xs uppercase tracking-[0.08em] text-[#9aabc7]">
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
                    <tr key={row.id} className="border-t border-[#232a3a] align-top">
                      <td className="px-3 py-2">
                        <p className="font-medium text-[#e8edf7]">{row.title}</p>
                        <p className="text-xs text-[#96a5be]">Priorita: {row.priority} · {row.autoPublished ? "Automaticky publikováno" : "Manual"}</p>
                      </td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{row.status}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{row.edition}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{formatDateTime(row.publishedAt)}</td>
                      <td className="px-3 py-2">
                        {canEditEditorial ? (
                          <div className="flex flex-wrap gap-2">
                            <form action="/api/studio/control" method="post">
                              <input type="hidden" name="action" value="editorial_mark_edited" />
                              <input type="hidden" name="item_id" value={row.id} />
                              <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                              <button className="rounded-md border border-[#35508b] bg-[#15233f] px-2 py-1 text-[11px] text-[#cfe0ff]">
                                Upraveno po publikaci
                              </button>
                            </form>
                            {canPublishEditorial ? (
                              <>
                                <form action="/api/studio/control" method="post">
                                  <input type="hidden" name="action" value="editorial_withdraw" />
                                  <input type="hidden" name="item_id" value={row.id} />
                                  <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                                  <button className="rounded-md border border-[#7a3d2b] bg-[#2a1814] px-2 py-1 text-[11px] text-[#ffcebd]">
                                    Stáhnout z webu
                                  </button>
                                </form>
                                <form action="/api/studio/control" method="post">
                                  <input type="hidden" name="action" value="editorial_return_to_auto" />
                                  <input type="hidden" name="item_id" value={row.id} />
                                  <input type="hidden" name="redirect_to" value="/studio#zpravy" />
                                  <button className="rounded-md border border-[#3f5f4f] bg-[#142017] px-2 py-1 text-[11px] text-[#b4efc5]">
                                    Vrátit AUTO MODE
                                  </button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-[#8b98b0]">Bez oprávnění</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="breaking" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">4. Breaking news</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Ruční injekce do běžící automatizace. Breaking news nesmí zastavit celý systém.
            </p>
            {canPublishBreaking ? (
              <form action="/api/studio/control" method="post" className="mt-4 grid gap-2 rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 md:grid-cols-2">
                <input type="hidden" name="action" value="breaking_create" />
                <input type="hidden" name="redirect_to" value="/studio#breaking" />
                <input
                  name="title"
                  required
                  placeholder="title"
                  className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                />
                <input
                  name="short_text"
                  placeholder="short_text"
                  className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                />
                <textarea
                  name="body"
                  placeholder="body"
                  className="md:col-span-2 min-h-[82px] rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                />
                <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-xs text-[#b8c2d3]">
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
                    className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-xs font-semibold text-[#d3dbeb]"
                  >
                    Uložit draft
                  </button>
                  <button
                    name="initial_status"
                    value="published"
                    className="rounded-md border border-[#ff6a00] bg-[#ff6a00] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Publikovat breaking news
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-3 text-sm text-[#93a0b8]">Pro publikaci breaking news je potřeba role senior_editor / admin / owner.</p>
            )}

            <div className="mt-4 space-y-2">
              {snapshot.breakingNews.rows.slice(0, 12).map((row) => (
                <div key={row.id} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[#e6ecf9]">{row.title}</p>
                    <span className="text-xs text-[#9fb0cc]">{row.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#9fb0cc]">
                    Platnost: {formatDateTime(row.validFrom)} - {formatDateTime(row.validTo)} · Priority {row.priority}
                  </p>
                  {canPublishBreaking ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="breaking_publish" />
                        <input type="hidden" name="breaking_id" value={row.id} />
                        <input type="hidden" name="redirect_to" value="/studio#breaking" />
                        <button className="rounded-md border border-[#35508b] bg-[#15233f] px-2 py-1 text-[11px] text-[#cfe0ff]">
                          Publikovat
                        </button>
                      </form>
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="breaking_withdraw" />
                        <input type="hidden" name="breaking_id" value={row.id} />
                        <input type="hidden" name="redirect_to" value="/studio#breaking" />
                        <button className="rounded-md border border-[#7a3d2b] bg-[#2a1814] px-2 py-1 text-[11px] text-[#ffcebd]">
                          Stáhnout
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="program" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">5. Program / živé vysílání</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Override nad automatickým plánovačem. Klíčové tlačítko: <strong>Vrátit řízení automatu</strong>.
            </p>
            <div className="mt-3 rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
              <p>Právě běží: <strong>{snapshot.program.nowPlaying.title ?? "Nedostupné"}</strong></p>
              <p className="text-xs text-[#9fb0cc]">
                Typ: {snapshot.program.nowPlaying.type ?? "—"} · Kanál: {snapshot.program.nowPlaying.channel ?? "—"} · Konec:{" "}
                {formatDateTime(snapshot.program.nowPlaying.endsAt)}
              </p>
            </div>
            {canProgramOverride ? (
              <form action="/api/studio/control" method="post" className="mt-3 grid gap-2 rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 md:grid-cols-2">
                <input type="hidden" name="action" value="program_override_create" />
                <input type="hidden" name="redirect_to" value="/studio#program" />
                <select name="override_action" required className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb]">
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
                  className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb]"
                />
                <input
                  name="content_id"
                  placeholder="content_id / video_id"
                  className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb]"
                />
                <input
                  name="reason"
                  placeholder="Důvod"
                  className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb]"
                />
                <button className="md:col-span-2 rounded-md border border-[#ff6a00] bg-[#ff6a00] px-3 py-2 text-xs font-semibold text-white">
                  Vložit do programu
                </button>
              </form>
            ) : null}
            <div className="mt-3 space-y-2">
              {snapshot.program.overrides.slice(0, 10).map((row) => (
                <div key={row.id} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                  <p className="font-medium text-[#e6ecf9]">{row.title}</p>
                  <p className="text-xs text-[#9fb0cc]">
                    {row.action ?? "override"} · {row.status} · {formatDateTime(row.startsAt)} - {formatDateTime(row.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article id="videa" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">6. Videa</h2>
            <div className="mt-3 overflow-auto rounded-lg border border-[#2f3647]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#131929] text-xs uppercase tracking-[0.08em] text-[#9aabc7]">
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
                    <tr key={row.videoId} className="border-t border-[#232a3a]">
                      <td className="px-3 py-2 text-[#e6ecf9]">{row.title}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{row.channel}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{formatDateTime(row.publishedAt)}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{row.starts}</td>
                      <td className="px-3 py-2 text-[#c5d1e6]">{row.completions}</td>
                      <td className="px-3 py-2 text-xs">{row.suitableForBroadcast ? "vhodné" : "nevhodné"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="kanaly" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">7. Kanály</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {snapshot.channels.rows.slice(0, 20).map((row) => (
                <div key={row.channelId} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                  <p className="font-medium text-[#e6ecf9]">{row.channelName}</p>
                  <p className="text-xs text-[#9fb0cc]">ID: {row.channelId}</p>
                  <p className="mt-1 text-xs text-[#b9c6dd]">
                    Videa: {row.videosCount} · Followers: {row.followersCount} · 7d: {row.starts7d} · 30d: {row.starts30d}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article id="komentare" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">8. Komentáře a komunita</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Skrytí/obnovení řešíme stavově s auditní stopou, nikoli fyzickým mazáním.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Nové za hodinu: {snapshot.comments.lastHourCount}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Nahlášené: {snapshot.comments.flaggedCount}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Skryté: {snapshot.comments.hiddenCount}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Potenciální spam účty: {snapshot.comments.potentialSpamUsers}</div>
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.comments.latest.slice(0, 20).map((comment) => (
                <div key={comment.id} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                  <p className="text-[#e6ecf9]">{comment.body}</p>
                  <p className="mt-1 text-xs text-[#9fb0cc]">
                    {comment.status} · {comment.entityType}/{comment.entityId} · {formatDateTime(comment.createdAt)}
                  </p>
                  {canModerateComments ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="comment_hide" />
                        <input type="hidden" name="comment_id" value={comment.id} />
                        <input type="hidden" name="redirect_to" value="/studio#komentare" />
                        <button className="rounded-md border border-[#7a3d2b] bg-[#2a1814] px-2 py-1 text-[11px] text-[#ffcebd]">
                          Skrýt komentář
                        </button>
                      </form>
                      <form action="/api/studio/control" method="post">
                        <input type="hidden" name="action" value="comment_restore" />
                        <input type="hidden" name="comment_id" value={comment.id} />
                        <input type="hidden" name="redirect_to" value="/studio#komentare" />
                        <button className="rounded-md border border-[#3f5f4f] bg-[#142017] px-2 py-1 text-[11px] text-[#b4efc5]">
                          Obnovit komentář
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="divaci" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">9. Diváci</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Registrovaní celkem: {snapshot.viewers.registeredTotal}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Noví dnes: {snapshot.viewers.newToday}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Aktivní dnes: {snapshot.viewers.activeToday}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Aktivní 7 dní: {snapshot.viewers.active7d}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Aktivní 30 dní: {snapshot.viewers.active30d}</div>
              <div className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">Rozkoukáno: {snapshot.viewers.resumeUsers}</div>
            </div>
            <div className="mt-3 rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-xs text-[#b8c2d3]">
              <p className="font-semibold text-[#dfe7f8]">Přihlášení podle provideru</p>
              <ul className="mt-1 grid gap-1 md:grid-cols-3">
                {Object.entries(snapshot.viewers.providerBreakdown).map(([provider, count]) => (
                  <li key={provider}>
                    {provider}: {count}
                  </li>
                ))}
              </ul>
            </div>
            {canReadSensitiveViewers ? (
              <div className="mt-3 overflow-auto rounded-lg border border-[#2f3647]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#131929] text-xs uppercase tracking-[0.08em] text-[#9aabc7]">
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
                      <tr key={row.id} className="border-t border-[#232a3a]">
                        <td className="px-3 py-2 text-[#dce4f3]">{row.email ?? "—"}</td>
                        <td className="px-3 py-2 text-[#dce4f3]">{row.displayName ?? "—"}</td>
                        <td className="px-3 py-2 text-[#dce4f3]">{row.role ?? "viewer"}</td>
                        <td className="px-3 py-2 text-[#dce4f3]">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2 text-[#dce4f3]">{formatDateTime(row.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#93a0b8]">
                Detailní divácké údaje jsou omezeny pouze na admin/owner.
              </p>
            )}
          </article>

          <article id="statistiky" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">10. Statistiky</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Dashboardy jsou připraveny i pro budoucí doplnění dat. Chybějící metriky nezpůsobí pád aplikace.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {Object.entries(snapshot.statistics.events24h).slice(0, 15).map(([eventName, count]) => (
                <div key={eventName} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                  <p className="text-[#dce4f3]">{eventName}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{count}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="nastaveni" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">11. Nastavení</h2>
            <p className="mt-2 text-sm text-[#b7c1d3]">
              Interní uživatelé, role a povolené akce. Každá změna role musí být auditována.
            </p>
            <div className="mt-3 rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-xs text-[#b8c2d3]">
              Přístup je omezen na allowlist: {snapshot.settings.allowedEmails.join(", ")}
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.settings.internalUsers.map((user) => (
                <div key={user.userId} className="rounded-lg border border-[#2f3647] bg-[#0c1018] p-3 text-sm">
                  <p className="font-medium text-[#e6ecf9]">{user.displayName ?? user.email ?? user.userId}</p>
                  <p className="text-xs text-[#9fb0cc]">
                    Profil role: {user.profileRole ?? "viewer"} · Extra role: {user.extraRoles.join(", ") || "—"}
                  </p>
                  {canManageRoles ? (
                    <form action="/api/studio/control" method="post" className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="action" value="role_assign" />
                      <input type="hidden" name="target_user_id" value={user.userId} />
                      <input type="hidden" name="redirect_to" value="/studio#nastaveni" />
                      <select name="role" className="rounded-md border border-[#30384a] bg-[#101625] px-3 py-1 text-xs text-[#edf2fb]">
                        <option value="moderator">moderator</option>
                        <option value="editor">editor</option>
                        <option value="senior_editor">senior_editor</option>
                        <option value="analyst">analyst</option>
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                      </select>
                      <button className="rounded-md border border-[#35508b] bg-[#15233f] px-2 py-1 text-[11px] text-[#cfe0ff]">
                        Přidat roli
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="audit" className="rounded-xl border border-[#2f3647] bg-[#0f131b] p-4">
            <h2 className="text-lg font-semibold text-white">12. Audit log</h2>
            <div className="mt-3 overflow-auto rounded-lg border border-[#2f3647]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#131929] text-xs uppercase tracking-[0.08em] text-[#9aabc7]">
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
                    <tr key={row.id} className="border-t border-[#232a3a]">
                      <td className="px-3 py-2 text-[#dce4f3]">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2 text-[#dce4f3]">{row.action}</td>
                      <td className="px-3 py-2 text-[#dce4f3]">
                        {row.entityType} {row.entityId ? `(${row.entityId})` : ""}
                      </td>
                      <td className="px-3 py-2 text-[#dce4f3]">{row.actorId ?? "system"}</td>
                      <td className="px-3 py-2 text-[#dce4f3]">{row.reason ?? "—"}</td>
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
