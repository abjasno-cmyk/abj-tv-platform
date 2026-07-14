import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";

type HeaderDictionary = {
  tagline: string;
  nav: {
    live: string;
    latestVideos: string;
    news: string;
    opinions: string;
    channels: string;
    myVerox: string;
    signIn: string;
    signOut: string;
  };
  authReason: {
    live: string;
    default: string;
  };
  language: {
    label: string;
    cs: string;
    en: string;
  };
};

type FooterDictionary = {
  privacy: string;
  terms: string;
  dataDeletion: string;
};

type SiteDictionary = {
  header: HeaderDictionary;
  footer: FooterDictionary;
  metadata: {
    title: string;
    description: string;
  };
};

const cs: SiteDictionary = {
  header: {
    tagline: "MAINSTREAMOVÝ DETOX",
    nav: {
      live: "ŽIVĚ",
      latestVideos: "NEJNOVĚJŠÍ VIDEA",
      news: "ZPRÁVY",
      opinions: "NÁZORY",
      channels: "KANÁLY",
      myVerox: "MŮJ VEROX",
      signIn: "PŘIHLÁSIT",
      signOut: "ODHLÁSIT",
    },
    authReason: {
      live: "Přihlaste se pro komentáře k videím a uložení průběhu sledování.",
      default: "Přihlaste se zdarma a zapojte se do VEROX.",
    },
    language: {
      label: "Jazyk",
      cs: "CZ",
      en: "EN",
    },
  },
  footer: {
    privacy: "Ochrana osobních údajů",
    terms: "Podmínky užívání",
    dataDeletion: "Smazání účtu",
  },
  metadata: {
    title: "VEROX • Mainstreamový detox",
    description: "Mainstreamový detox — živé vysílání, videa a souhrny v kostce z alternativních kanálů.",
  },
};

const en: SiteDictionary = {
  header: {
    tagline: "MAINSTREAM DETOX",
    nav: {
      live: "LIVE",
      latestVideos: "LATEST VIDEOS",
      news: "NEWS",
      opinions: "OPINION",
      channels: "CHANNELS",
      myVerox: "MY VEROX",
      signIn: "SIGN IN",
      signOut: "SIGN OUT",
    },
    authReason: {
      live: "Sign in to comment on videos and save your viewing progress.",
      default: "Sign in for free and join VEROX.",
    },
    language: {
      label: "Language",
      cs: "CZ",
      en: "EN",
    },
  },
  footer: {
    privacy: "Privacy policy",
    terms: "Terms of use",
    dataDeletion: "Account deletion",
  },
  metadata: {
    title: "VEROX • Mainstream Detox",
    description: "Mainstream Detox — live broadcasting, videos and concise context from independent channels.",
  },
};

export function getDictionary(locale: VeroxLocale): SiteDictionary {
  return locale === LOCALE_EN ? en : cs;
}
