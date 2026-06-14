import { detectCommentMood, pickVariant, type CommentMood } from "@/lib/viewer/commentMood";

const INLINE_THANK_BY_MOOD: Record<CommentMood, readonly string[]> = {
  question: [
    "Díky za otázku 🙏 — váš hlas je tu důležitý. Redakce ji vidí a kde to půjde, navážeme v dalších pořadech.",
    "Dobrá otázka 🤔 — děkujeme! Tým Veroxu ji má na radaru.",
    "Díky, že se ptáte 💬 — otázky od diváků nám pomáhají držet směr.",
  ],
  angry: [
    "Chápeme, že vás to štve 😔 — díky, že jste to napsali. I kritika patří do diskuse.",
    "Díky za upřímnost 🙏 — váš názor je tu slyšet, i když je tvrdý.",
    "Rozumíme frustraci 😢 — díky, že jste se zapojili. Bereme to v potaz.",
  ],
  sad: [
    "Díky, že jste se podělili 😔 — váš komentář tu má místo.",
    "Mrzí nás, že se cítíte takto 🙏 — díky za důvěru, že to napíšete.",
    "Děkujeme za upřímnost 💙 — jsme rádi, že jste v diskusi zůstali.",
  ],
  positive: [
    "Díky! 👍 Moc nás těší, že se vám to líbí.",
    "Děkujeme 😊 — pochvala od diváků nám dává smysl.",
    "🍀 Díky za milá slova — komunita Veroxu žije díky vám.",
    "Super zpětná vazba ✨ — děkujeme, že jste tu s námi!",
  ],
  neutral: [
    "Díky, že jste se zapojili do diskuse 👍 Každý komentář nám pomáhá držet komunitu živou.",
    "Děkujeme 😊 — váš hlas v diskusi má smysl.",
    "Díky! 🍀 Jsme rádi, že komentujete.",
    "Děkujeme za komentář 🙏 — těší nás, že jste součástí Veroxu.",
  ],
};

const THREAD_REPLY_BY_MOOD: Record<CommentMood, readonly string[]> = {
  question: [
    "Díky za otázku 🙏 Váš komentář je tu vidět — tým Veroxu ho sleduje. Když bude prostor, můžeme téma rozvinout v dalším vysílání.",
    "Dobrá otázka 🤔 Děkujeme — redakce ji vidí a kde to půjde, navážeme.",
    "Díky, že se ptáte 💬 Otázky od diváků jsou pro nás důležité.",
  ],
  angry: [
    "Chápeme, že vás to štve 😔 Díky, že jste to napsali — i tvrdá kritika patří do diskuse.",
    "Díky za upřímnost 🙏 Váš názor je tu slyšet. Bereme zpětnou vazbu vážně.",
    "Rozumíme frustraci 😢 Děkujeme, že jste se zapojili — pomáhá nám to lépe naslouchat.",
  ],
  sad: [
    "Díky, že jste se podělili 😔 Váš komentář tu má místo a tým Veroxu ho vidí.",
    "Mrzí nás, že se cítíte takto 🙏 Děkujeme za důvěru, že to napíšete.",
    "Děkujeme za upřímnost 💙 Jsme rádi, že jste v diskusi zůstali.",
  ],
  positive: [
    "Díky! 👍 Moc nás těší, že se vám to líbí — děkujeme, že jste součástí diskuse na Veroxu.",
    "Děkujeme 😊 Pochvala od diváků nám dává energii do dalších pořadů.",
    "🍀 Díky za milá slova — rádi, že komentujete.",
    "Super zpětná vazba ✨ Děkujeme, že jste tu s námi!",
  ],
  neutral: [
    "Děkujeme za komentář 👍 Rádi, že jste součástí diskuse na Veroxu. Vaše zpětná vazba má smysl.",
    "Díky! 😊 Těší nás, že se zapojujete — každý hlas v diskusi počítá.",
    "Děkujeme 🍀 — komunita Veroxu žije díky komentářům jako je ten váš.",
    "Díky za komentář 🙏 Váš názor tu dává smysl.",
  ],
};

function thankSeed(body: string, commentId?: string | null): string {
  return `${body.trim()}|${commentId?.trim() ?? ""}`;
}

export function buildThankMessage(body: string, commentId?: string | null): string {
  const mood = detectCommentMood(body);
  return pickVariant(INLINE_THANK_BY_MOOD[mood], thankSeed(body, commentId));
}

export function buildAutoThankReply(body: string, commentId?: string | null): string {
  const mood = detectCommentMood(body);
  return pickVariant(THREAD_REPLY_BY_MOOD[mood], `${thankSeed(body, commentId)}|thread`);
}

export function buildCommentEngagementResponse(
  body: string,
  parentId: string | null,
  commentId?: string | null,
): { thankMessage: string; shareSuggested: boolean } {
  return {
    thankMessage: buildThankMessage(body, commentId),
    shareSuggested: !parentId,
  };
}
