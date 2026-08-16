// Detekce vestavěného (in-app) prohlížeče Meta aplikací — Facebook,
// Messenger, Instagram. Google v nich blokuje OAuth přihlášení
// (403 disallowed_useragent) a YouTube embed přehrávání je nespolehlivé,
// takže divákům zobrazujeme výzvu k otevření webu v plnohodnotném prohlížeči.
// FBAN/FBAV/FB_IAB jsou oficiální markery FB rodiny; Instagram si přidává
// vlastní token na konec UA.
const META_IN_APP_UA = /FBAN|FBAV|FB_IAB|FBIOS|Instagram/i;

export function isMetaInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return META_IN_APP_UA.test(userAgent);
}
