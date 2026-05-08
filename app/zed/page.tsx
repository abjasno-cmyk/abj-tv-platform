import { WallBoard } from "@/components/wall/WallBoard";

export const dynamic = "force-dynamic";

export default function ZedPage() {
  return (
    <WallBoard
      heading="Zeď diváků"
      intro="Tohle je místo pro vaše vzkazy, postřehy a reakce na pořady ABJ. Pište slušně, věcně a pod svou přezdívkou."
      showHero={true}
    />
  );
}

