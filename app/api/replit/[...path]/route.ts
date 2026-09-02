// Historický název cesty z doby, kdy engine běžel na Replitu. Ponecháno jako
// alias na /api/engine/*, protože playout smyčka běží v prohlížeči a starší
// otevřené karty volají ještě tuhle adresu. Odstranit po dojetí relací.
export { GET, POST } from "@/app/api/engine/[...path]/route";

export const dynamic = "force-dynamic";
