# dcfont

Custom font packs for Discord clients that support font replacement (Revenge, Vendetta-style forks, and similar). Browse fonts with live previews, grab a `font.json` link, or mix families across Discord's font roles and get a shareable link for your own combination.

**Live:** [https://dcfont.pages.dev](https://dcfont.pages.dev)

## Using a font

1. Open the site, find a font, hit **Copy font.json**.
2. Paste that link into your client's custom font setting.

Want a mix instead of one font's full set? Use **Create your own font.json** to assign a different family per role, then copy that link the same way.

`font.json` isn't a file sitting in this repo — it's assembled on the fly by the site (and served through the Pages Function in `functions/`) whenever you hit copy, so the link works without anything being pre-generated or committed.

## Repo structure

```
fonts/<Name>/   .ttf weights + LICENSE.txt, one folder per font
index.html, css/, js/    the site
functions/      Cloudflare Pages Function that serves generated font.json links
```

## Adding a font

1. Add `fonts/<Name>/` with the font's `.ttf` weights and its `LICENSE.txt`.
2. Name weight files using the pattern already used elsewhere — `Regular.ttf`, `Medium.ttf`, `SemiBold.ttf`, `Bold.ttf`, `ExtraBold.ttf`, and their `*Italic.ttf` counterparts. Capitalization doesn't matter, but the suffix pattern does — the site's weight-matching depends on it.
3. Open a PR.

The site discovers new folders on its own — nothing else needs editing or generating.

## Contributing

PRs welcome — new fonts, bug fixes, UI improvements.

- Only add fonts under a license that permits redistribution (OFL, Apache, MIT, etc.), and include the original `LICENSE.txt` in the font's folder.
- Keep changes dependency-free — no build step, no frameworks. That's intentional.
- For anything beyond a small fix, open an issue first so we're aligned before you put in the work.

## License

Each font keeps its own license — see that folder's `LICENSE.txt`. The site code is free to reuse or modify.