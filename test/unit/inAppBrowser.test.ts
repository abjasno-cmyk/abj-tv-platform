import { describe, expect, it } from "vitest";

import { isMetaInAppBrowser } from "@/lib/inAppBrowser";

const FB_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.35.107;FBBV/;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS]";
const FB_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.44.79;]";
const MESSENGER_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/460.0.0.29.107]";
const INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 340.0.0.22.109";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

describe("isMetaInAppBrowser", () => {
  it("detects Facebook app on iOS", () => {
    expect(isMetaInAppBrowser(FB_IOS)).toBe(true);
  });

  it("detects Facebook in-app browser on Android", () => {
    expect(isMetaInAppBrowser(FB_ANDROID)).toBe(true);
  });

  it("detects Messenger on iOS", () => {
    expect(isMetaInAppBrowser(MESSENGER_IOS)).toBe(true);
  });

  it("detects Instagram", () => {
    expect(isMetaInAppBrowser(INSTAGRAM)).toBe(true);
  });

  it("passes regular Safari on iOS", () => {
    expect(isMetaInAppBrowser(SAFARI_IOS)).toBe(false);
  });

  it("passes regular Chrome on Android", () => {
    expect(isMetaInAppBrowser(CHROME_ANDROID)).toBe(false);
  });

  it("handles empty/undefined user agent", () => {
    expect(isMetaInAppBrowser("")).toBe(false);
    expect(isMetaInAppBrowser(undefined)).toBe(false);
  });
});
