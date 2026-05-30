export function LiveCommunityStrip() {
  return (
    <div className="verox-live-community flex h-full min-h-[7.5rem] w-full flex-col items-center justify-center bg-[#F37021] px-[7%] pb-2 pt-2">
      <p className="verox-live-community-title verox-font-myriad-bold text-center uppercase leading-tight tracking-normal text-[#303030]">
        KOMUNITA
      </p>
      <p className="verox-live-community-hint verox-font-myriad-regular mt-1 text-center uppercase leading-tight tracking-[0.05em] text-[#303030]">
        ZDE NAPIŠTE ZPRÁVU
      </p>
      <input
        type="text"
        aria-label="Napsat zprávu do komunity"
        className="verox-font-myriad-regular mt-1.5 block h-[clamp(22px,5.5vw,30px)] w-[85%] max-w-full rounded-none border-0 bg-white px-1.5 text-[#303030] outline-none ring-0"
      />
    </div>
  );
}
