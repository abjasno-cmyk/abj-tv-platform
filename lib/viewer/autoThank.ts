import { isLikelyCommentQuestion } from "@/lib/viewer/commentQuestion";

export function buildThankMessage(body: string): string {
  if (isLikelyCommentQuestion(body)) {
    return "Díky za otázku — váš hlas je tu důležitý. Redakce ji vidí a kde to půjde, navážeme v dalších pořadech.";
  }
  return "Díky, že jste se zapojili do diskuse. Každý váš komentář nám pomáhá držet komunitu živou.";
}

export function buildAutoThankReply(body: string): string {
  if (isLikelyCommentQuestion(body)) {
    return "Díky za otázku! Váš komentář je tu vidět — tým Veroxu ho sleduje. Když bude prostor, můžeme téma rozvinout v dalším vysílání.";
  }
  return "Děkujeme za komentář — rádi, že jste součástí diskuse na Veroxu. Vaše zpětná vazba má smysl.";
}

export function buildCommentEngagementResponse(
  body: string,
  parentId: string | null,
): { thankMessage: string; shareSuggested: boolean } {
  return {
    thankMessage: buildThankMessage(body),
    shareSuggested: !parentId,
  };
}
