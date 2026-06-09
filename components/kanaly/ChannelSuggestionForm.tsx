"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ChannelSuggestionForm() {
  const [channelName, setChannelName] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/kanaly/channel-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, channelUrl, reason }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Návrh se nepodařilo odeslat.");
      }

      setChannelName("");
      setChannelUrl("");
      setReason("");
      setState("success");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Návrh se nepodařilo odeslat.");
    }
  };

  return (
    <section className="kanaly-suggest" aria-labelledby="kanaly-suggest-heading">
      <h2 id="kanaly-suggest-heading" className="kanaly-suggest-title">
        Navrhněte kanál
      </h2>
      <p className="kanaly-suggest-lead">
        Chybí vám tu oblíbený YouTube kanál? Napište jeho název, odkaz a proč by měl být součástí VEROX.
      </p>

      <form className="kanaly-suggest-form" onSubmit={handleSubmit}>
        <label className="kanaly-suggest-field">
          <span>Název kanálu</span>
          <input
            type="text"
            name="channelName"
            value={channelName}
            onChange={(event) => setChannelName(event.target.value)}
            required
            maxLength={200}
            autoComplete="off"
            placeholder="např. Název kanálu"
          />
        </label>

        <label className="kanaly-suggest-field">
          <span>Odkaz na kanál</span>
          <input
            type="url"
            name="channelUrl"
            value={channelUrl}
            onChange={(event) => setChannelUrl(event.target.value)}
            required
            maxLength={500}
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.youtube.com/@..."
          />
        </label>

        <label className="kanaly-suggest-field">
          <span>Proč by ho chtěli vidět</span>
          <textarea
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            maxLength={2000}
            rows={4}
            placeholder="Stručně vysvětlete, proč by kanál měl být v nabídce."
          />
        </label>

        <button type="submit" className="kanaly-suggest-submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Odesílám…" : "Odeslat návrh"}
        </button>

        {state === "success" ? (
          <p className="kanaly-suggest-feedback kanaly-suggest-feedback--success" role="status">
            Děkujeme — váš návrh jsme přijali.
          </p>
        ) : null}
        {state === "error" ? (
          <p className="kanaly-suggest-feedback kanaly-suggest-feedback--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}
