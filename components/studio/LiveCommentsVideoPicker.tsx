"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LiveCommentsVideoOption = {
  videoId: string;
  title: string;
  channel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  blockType: string | null;
  isNowPlaying: boolean;
  source: "program" | "search";
};

type LiveCommentsVideosResponse = {
  program?: LiveCommentsVideoOption[];
  search?: LiveCommentsVideoOption[];
  error?: string;
};

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

function formatProgramTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatProgramLabel(option: LiveCommentsVideoOption): string {
  const time = formatProgramTime(option.startsAt);
  const channel = option.channel ? ` · ${option.channel}` : "";
  const live = option.isNowPlaying ? " · PRÁVĚ TEĎ" : "";
  return `${time} — ${option.title}${channel}${live}`;
}

type LiveCommentsVideoPickerProps = {
  activeVideoId: string;
  videoIdInput: string;
  onVideoIdInputChange: (value: string) => void;
  onSelectVideo: (videoId: string, title?: string | null) => void;
};

export function LiveCommentsVideoPicker({
  activeVideoId,
  videoIdInput,
  onVideoIdInputChange,
  onSelectVideo,
}: LiveCommentsVideoPickerProps) {
  const [programVideos, setProgramVideos] = useState<LiveCommentsVideoOption[]>([]);
  const [searchResults, setSearchResults] = useState<LiveCommentsVideoOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const loadProgramVideos = useCallback(async () => {
    setLoadingProgram(true);
    setPickerError(null);
    try {
      const response = await fetch("/api/studio/live-comments/videos", fetchOpts);
      const payload = (await response.json().catch(() => ({}))) as LiveCommentsVideosResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení programu selhalo.");
      }
      const program = payload.program ?? [];
      setProgramVideos(program);
      const current =
        program.find((item) => item.videoId === activeVideoId) ??
        program.find((item) => item.isNowPlaying) ??
        null;
      if (current) {
        setSelectedProgramId(current.videoId);
      }
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : "Načtení programu selhalo.");
    } finally {
      setLoadingProgram(false);
    }
  }, [activeVideoId]);

  useEffect(() => {
    void loadProgramVideos();
  }, [loadProgramVideos]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setLoadingSearch(false);
      return undefined;
    }

    setLoadingSearch(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: trimmed });
          const response = await fetch(`/api/studio/live-comments/videos?${params.toString()}`, fetchOpts);
          const payload = (await response.json().catch(() => ({}))) as LiveCommentsVideosResponse;
          if (!response.ok) {
            throw new Error(payload.error ?? "Vyhledávání selhalo.");
          }
          setSearchResults(payload.search ?? []);
        } catch (error) {
          setPickerError(error instanceof Error ? error.message : "Vyhledávání selhalo.");
          setSearchResults([]);
        } finally {
          setLoadingSearch(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const programOptions = useMemo(() => programVideos, [programVideos]);

  const applyProgramSelection = () => {
    const selected = programOptions.find((item) => item.videoId === selectedProgramId);
    if (!selected) return;
    onSelectVideo(selected.videoId, selected.title);
  };

  const useNowPlaying = () => {
    const current = programOptions.find((item) => item.isNowPlaying);
    if (!current) return;
    setSelectedProgramId(current.videoId);
    onSelectVideo(current.videoId, current.title);
  };

  const hasNowPlaying = programOptions.some((item) => item.isNowPlaying);

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-[#2b3345] bg-[#0b0f16] p-4">
      <div>
        <p className="text-sm font-semibold text-white">Vyberte video</p>
        <p className="mt-1 text-xs text-[#9fb0cc]">
          Z programu dnešního vysílání, podle názvu v archivu, nebo ručně přes YouTube ID.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="live-comments-program-select" className="block text-xs text-[#b7c1d3]">
            Z programu
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            <select
              id="live-comments-program-select"
              value={selectedProgramId}
              onChange={(event) => setSelectedProgramId(event.target.value)}
              disabled={loadingProgram || programOptions.length === 0}
              className="min-w-[240px] flex-1 rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00] disabled:opacity-60"
            >
              <option value="">
                {loadingProgram ? "Načítám program…" : "Vyberte pořad z programu"}
              </option>
              {programOptions.map((option) => (
                <option key={option.videoId} value={option.videoId}>
                  {formatProgramLabel(option)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyProgramSelection}
              disabled={!selectedProgramId}
              className="rounded-md border border-[#ff6a00] bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e95f00] disabled:opacity-50"
            >
              Použít
            </button>
          </div>
          {hasNowPlaying ? (
            <button
              type="button"
              onClick={useNowPlaying}
              className="mt-2 text-xs text-[#ffd0ad] underline hover:text-[#ff6a00]"
            >
              Přepnout na právě vysílané video
            </button>
          ) : null}
        </div>

        <div>
          <label htmlFor="live-comments-title-search" className="block text-xs text-[#b7c1d3]">
            Hledat podle názvu videa
          </label>
          <input
            id="live-comments-title-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Např. Bobošíková, Rajchl, Na rovinu…"
            className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
          />
          {loadingSearch ? <p className="mt-2 text-xs text-[#9fb0cc]">Hledám…</p> : null}
          {searchQuery.trim().length >= 2 ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
              {searchResults.length === 0 && !loadingSearch ? (
                <li className="text-xs text-[#9fb0cc]">Nic nenalezeno.</li>
              ) : (
                searchResults.map((option) => (
                  <li key={option.videoId}>
                    <button
                      type="button"
                      onClick={() => onSelectVideo(option.videoId, option.title)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs hover:border-[#ff6a00]/70 ${
                        activeVideoId === option.videoId
                          ? "border-[#ff6a00] bg-[#2b1d12] text-[#ffd0ad]"
                          : "border-[#30384a] bg-[#101625] text-[#d8e2f3]"
                      }`}
                    >
                      <span className="block font-medium">{option.title}</span>
                      <span className="mt-0.5 block text-[#8fa0bb]">
                        {option.channel ?? "Kanál neuveden"} · {option.videoId}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[#8fa0bb]">Zadejte alespoň 2 znaky názvu.</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="live-comments-video-id" className="block text-xs text-[#b7c1d3]">
          Ručně: YouTube video ID
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="live-comments-video-id"
            value={videoIdInput}
            onChange={(event) => onVideoIdInputChange(event.target.value)}
            placeholder="Např. dQw4w9WgXcQ"
            className="min-w-[220px] flex-1 rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
          />
          <button
            type="button"
            onClick={() => onSelectVideo(videoIdInput.trim())}
            disabled={!videoIdInput.trim()}
            className="rounded-md border border-[#30384a] bg-[#101625] px-4 py-2 text-sm text-[#d8e2f3] hover:border-[#ff6a00]/70 disabled:opacity-50"
          >
            Načíst podle ID
          </button>
        </div>
      </div>

      {pickerError ? (
        <p className="rounded-md border border-[#7a3d2b] bg-[#2a1814] px-3 py-2 text-xs text-[#ffcebd]">{pickerError}</p>
      ) : null}
    </div>
  );
}
