# VEROX HTML handoff

Static HTML/CSS recreation of the approved WEBP layout.

- Source file: `new layout 11 copy.webp`
- Source dimensions: `3323 × 5906`
- Template artboard: `1240 × 2204`, scaled from the source width so the 9:16 composition and measured spacing remain intact.
- Main files: `index.html`, `styles.css`, `assets/`

## Notes

- The VEROX logo, hero/video still, live badge, comment icon, carousel photos, and channel logo art were cropped from the approved WEBP because separate production assets were not provided.
- Text content, navigation, titles, section headings, carousel labels, borders, rules, and layout geometry are recreated in HTML/CSS.
- Brand orange was sampled from the source as approximately `#ff6600`; dark text is approximately `#303030`; navigation gray is approximately `#707070`.
- Typography uses Google-hosted `Roboto Condensed` as a close legal web substitute, with condensed system fallbacks in `styles.css`. The VEROX wordmark itself remains a cropped logo asset for fidelity.
- The template is intended to be reviewed at a `1240px` browser viewport. A small viewport scale rule is included only to keep the full artboard visible on narrower screens.
