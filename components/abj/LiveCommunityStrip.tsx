export function LiveCommunityStrip() {
  return (
    <section className="verox-community-strip w-full bg-[#F37021] px-3 py-2.5">
      <p className="verox-font-myriad-bold text-center text-[18px] uppercase leading-normal tracking-normal text-[#303030]">
        KOMUNITA
      </p>
      <p className="verox-font-myriad-regular mt-0.5 text-center text-[9px] uppercase leading-normal tracking-[0.05em] text-[#303030]">
        ZDE NAPIŠTE ZPRÁVU
      </p>
      <input
        type="text"
        aria-label="Napsat zprávu do komunity"
        className="verox-font-myriad-regular mt-1.5 block h-[28px] w-full rounded-none border-0 bg-white px-2 text-[12px] text-[#303030] outline-none ring-0"
      />
    </section>
  );
}
