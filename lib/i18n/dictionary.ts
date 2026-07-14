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
  common: {
    saveVideo: string;
    videoSaved: string;
    saveArticle: string;
    saved: string;
    saveChannel: string;
    channelSaved: string;
    removeChannel: string;
    channelUnavailable: string;
    discuss: string;
    transcriptVideo: string;
    showTranscript: string;
    share: string;
    linkCopied: string;
    copyLink: string;
    play: string;
    pause: string;
    signInForLike: string;
    liking: string;
    liked: string;
    like: string;
  };
  live: {
    nowWatching: (count: string) => string;
    chooseAnotherVideo: string;
    nowPlaying: string;
    currentlyRunning: string;
    channels: string;
    channelHint: string;
  };
  news: {
    lead: string;
    recommended: string;
    moreReading: string;
    domestic: string;
    foreign: string;
    readOriginal: string;
    originalPreview: string;
    author: string;
    emptySection: string;
  };
  channels: {
    title: string;
    lead: (days: number) => string;
    loading: (days: number) => string;
    play: string;
    activeChannel: string;
    selectChannel: string;
    emptyList: string;
    emptyChannel: string;
    loadError: string;
    noRecentVideos: (days: number) => string;
    fallback: (days: number) => string;
  };
  opinions: {
    authorsTitle: string;
    authorsHint: string;
    authorsAria: string;
    previousAuthors: string;
    nextAuthors: string;
    preparingAuthors: string;
  };
  myVerox: {
    heading: string;
    signIn: string;
    savedVideos: string;
    savedOpinions: string;
    savedNews: string;
    favoriteChannel: string;
    emptyVideos: string;
    emptyOpinions: string;
    emptyNews: string;
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
  common: {
    saveVideo: "Uložit video",
    videoSaved: "Video uloženo",
    saveArticle: "Uložit článek",
    saved: "Uloženo",
    saveChannel: "Uložit kanál",
    channelSaved: "Oblíbený",
    removeChannel: "Odebrat z oblíbených kanálů",
    channelUnavailable: "Kanál zatím nemá interní identifikátor",
    discuss: "Diskutovat",
    transcriptVideo: "PŘEPIS VIDEA",
    showTranscript: "Zobrazit přepis videa",
    share: "Sdílet",
    linkCopied: "Odkaz zkopírován",
    copyLink: "Kopírovat odkaz",
    play: "Přehrát",
    pause: "Pozastavit",
    signInForLike: "Přihlásit pro lajk",
    liking: "Ukládám...",
    liked: "Líbí se vám to",
    like: "Líbí se mi",
  },
  live: {
    nowWatching: (count) => `Právě sleduje ${count} diváků`,
    chooseAnotherVideo: "Vyberte jiné video v sekci KANÁLY níže ↓",
    nowPlaying: "PRÁVĚ HRAJE",
    currentlyRunning: "PRÁVĚ BĚŽÍ",
    channels: "KANÁLY",
    channelHint: "KLIKNĚTE NA VYBRANÝ KANÁL PRO ZOBRAZENÍ DETAILU.",
  },
  news: {
    lead: "Hlavní výběr",
    recommended: "Doporučené články",
    moreReading: "Další čtení",
    domestic: "Domácí",
    foreign: "Zahraniční",
    readOriginal: "Číst původní článek",
    originalPreview: "Náhled originálního článku",
    author: "Autor",
    emptySection: "V této části zatím nejsou k dispozici žádné publikované články.",
  },
  channels: {
    title: "KANÁLY",
    lead: (days) => `Vyberte kanál — zobrazí se videa za posledních ${days} dní. Kliknutím na video přejdete do přehrávače.`,
    loading: (days) => `Načítám videa za posledních ${days} dní…`,
    play: "Přehrát",
    activeChannel: "Aktivní kanál",
    selectChannel: "Vyberte kanál a spusťte videa",
    emptyList: "Seznam kanálů se právě připravuje.",
    emptyChannel: "U tohoto kanálu teď nejsou dostupná videa.",
    loadError: "Videa kanálu se nepodařilo načíst.",
    noRecentVideos: (days) => `Za posledních ${days} dní nejsou u tohoto kanálu dostupná videa.`,
    fallback: (days) => `Za posledních ${days} dní bez novinek — zobrazujeme nejnovější videa kanálu.`,
  },
  opinions: {
    authorsTitle: "AUTOŘI",
    authorsHint: "KLIKNĚTE NA VYBRANÉHO AUTORA PRO ZOBRAZENÍ JEHO ČLÁNKŮ.",
    authorsAria: "Autoři",
    previousAuthors: "Předchozí autoři",
    nextAuthors: "Další autoři",
    preparingAuthors: "Připravujeme…",
  },
  myVerox: {
    heading: "VAŠE VIDEA A KANÁLY",
    signIn: "Přihlásit zdarma",
    savedVideos: "Uložená videa",
    savedOpinions: "Uložené články Názorů",
    savedNews: "Uložené články Novin",
    favoriteChannel: "Oblíbený kanál",
    emptyVideos: "Zatím nemáte uložená videa. Klepněte na ☆ Uložit video na stránce Živě nebo Videa.",
    emptyOpinions: "Zatím nemáte uložené články. Na detailu článku klepněte na Uložit článek.",
    emptyNews: "Zatím nemáte uložené články Novin. V sekci Noviny klepněte na ☆ Uložit článek.",
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
  common: {
    saveVideo: "Save video",
    videoSaved: "Video saved",
    saveArticle: "Save article",
    saved: "Saved",
    saveChannel: "Save channel",
    channelSaved: "Favorite",
    removeChannel: "Remove from favorite channels",
    channelUnavailable: "This channel does not have an internal identifier yet",
    discuss: "Discuss",
    transcriptVideo: "VIDEO TRANSCRIPT",
    showTranscript: "Show video transcript",
    share: "Share",
    linkCopied: "Link copied",
    copyLink: "Copy link",
    play: "Play",
    pause: "Pause",
    signInForLike: "Sign in to like",
    liking: "Saving...",
    liked: "You like this",
    like: "Like",
  },
  live: {
    nowWatching: (count) => `${count} viewers watching now`,
    chooseAnotherVideo: "Choose another video in CHANNELS below ↓",
    nowPlaying: "NOW PLAYING",
    currentlyRunning: "ON AIR NOW",
    channels: "CHANNELS",
    channelHint: "CLICK A CHANNEL TO SEE DETAILS.",
  },
  news: {
    lead: "Top story",
    recommended: "Recommended articles",
    moreReading: "More reading",
    domestic: "Domestic",
    foreign: "International",
    readOriginal: "Read original article",
    originalPreview: "Original article preview",
    author: "Author",
    emptySection: "There are no published articles in this section yet.",
  },
  channels: {
    title: "CHANNELS",
    lead: (days) => `Choose a channel — videos from the last ${days} days will be shown. Click a video to open the player.`,
    loading: (days) => `Loading videos from the last ${days} days…`,
    play: "Play",
    activeChannel: "Active channel",
    selectChannel: "Choose a channel and play videos",
    emptyList: "The channel list is being prepared.",
    emptyChannel: "No videos are available for this channel right now.",
    loadError: "Could not load channel videos.",
    noRecentVideos: (days) => `No videos are available for this channel from the last ${days} days.`,
    fallback: (days) => `No new videos in the last ${days} days — showing the channel's latest videos.`,
  },
  opinions: {
    authorsTitle: "AUTHORS",
    authorsHint: "CLICK AN AUTHOR TO VIEW THEIR ARTICLES.",
    authorsAria: "Authors",
    previousAuthors: "Previous authors",
    nextAuthors: "Next authors",
    preparingAuthors: "Coming soon…",
  },
  myVerox: {
    heading: "YOUR VIDEOS AND CHANNELS",
    signIn: "Sign in for free",
    savedVideos: "Saved videos",
    savedOpinions: "Saved opinion articles",
    savedNews: "Saved news articles",
    favoriteChannel: "Favorite channel",
    emptyVideos: "You have no saved videos yet. Tap ☆ Save video on Live or Videos.",
    emptyOpinions: "You have no saved articles yet. Tap Save article on an article detail.",
    emptyNews: "You have no saved news articles yet. Tap ☆ Save article in News.",
  },
};

export function getDictionary(locale: VeroxLocale): SiteDictionary {
  return locale === LOCALE_EN ? en : cs;
}
