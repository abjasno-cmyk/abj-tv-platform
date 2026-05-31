export function LiveCommunityStrip() {
  return (
    <div className="verox-live-community komunita flex h-full min-h-0 w-full flex-col items-center justify-start overflow-hidden px-[1.8vw] pb-2 pt-[3vw] text-center">
      <p className="verox-live-community-title verox-font-myriad-bold uppercase leading-[0.83] tracking-[0.05em] text-[var(--vx-gray-dark,#303030)]">
        KOMUNITA
      </p>
      <p className="verox-live-community-hint verox-font-myriad-regular mt-[0.5em] uppercase leading-[1.15] tracking-[0.02em] text-[var(--vx-gray-dark,#303030)]">
        ZDE NAPIŠTE
        <br />
        ZPRÁVU
      </p>
      <input
        type="text"
        aria-label="Napsat zprávu do komunity"
        className="verox-font-myriad-regular mt-[0.9em] block h-[7vw] max-h-[30px] w-[84%] max-w-full rounded-none border-0 bg-[var(--vx-white,#FFFFFF)] px-1.5 text-[#303030] outline-none ring-0"
      />
    </div>
  );
}
