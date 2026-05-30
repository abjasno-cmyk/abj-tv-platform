import { VeroxHeader } from "./_components/VeroxHeader";
import { Ticker } from "./_components/Ticker";
import { BroadcastHero } from "./_components/BroadcastHero";
import { ProgramCarousel } from "./_components/ProgramCarousel";
import { ChannelsRow } from "./_components/ChannelsRow";
import { NewsFeed } from "./_components/NewsFeed";
import { VideoGrid } from "./_components/VideoGrid";
import { KomunitaSection } from "./_components/KomunitaSection";
import { TokenSpecimen } from "./_components/TokenSpecimen";
import { VeroxFooter } from "./_components/VeroxFooter";

// VEROX — modernised design system showcase, composed in the homepage order of
// the zasilka reference: hero → dnešní program → kanály → editorial sections.
// Self-contained, additive route. The live application is untouched.
export default function DesignSystemPage() {
  return (
    <>
      <VeroxHeader />
      <Ticker />
      <BroadcastHero />
      <ProgramCarousel />
      <ChannelsRow />
      <NewsFeed />
      <VideoGrid />
      <KomunitaSection />
      <TokenSpecimen />
      <VeroxFooter />
    </>
  );
}
