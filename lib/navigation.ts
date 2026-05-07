export type MainNavItem = {
  href: string;
  label: string;
};

const MAIN_NAV_ITEMS: MainNavItem[] = [
  { href: "/live", label: "Vysílání" },
  { href: "/videos", label: "Kontext" },
  { href: "/archiv", label: "Přehled dne" },
  { href: "/abj-x", label: "ABJ X" },
  { href: "/program", label: "Program" },
];

export const NAV_LINKS: MainNavItem[] = MAIN_NAV_ITEMS;
export const PRIMARY_NAV_LINKS: MainNavItem[] = MAIN_NAV_ITEMS;
