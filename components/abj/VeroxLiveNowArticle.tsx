import { VeroxDoubleDivider } from "@/components/abj/VeroxDoubleDivider";

type VeroxLiveNowArticleProps = {
  title: string;
  channel: string;
};

export function VeroxLiveNowArticle({ title, channel }: VeroxLiveNowArticleProps) {
  return (
    <section className="verox-live-mobile-only verox-live-now-block py-3">
      <p className="verox-live-now-label verox-font-myriad-bold uppercase leading-normal tracking-normal text-[#F37021]">
        <span aria-hidden="true">● </span>
        PRÁVĚ BĚŽÍ
      </p>
      <h2 className="verox-live-now-headline verox-font-myriad-bold mt-1.5 leading-none tracking-[0.025em] text-[#303030]">{title}</h2>
      <p className="verox-live-now-source verox-font-myriad-regular mt-1 leading-normal tracking-[0.025em] text-[#717171]">{channel}</p>
      <VeroxDoubleDivider partial thick className="mt-3" />
    </section>
  );
}
