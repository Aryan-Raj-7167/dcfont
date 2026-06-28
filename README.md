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
fonts/<Name>/   .ttf/.otf weights + LICENSE.txt, one folder per font
index.html, css/, js/    the site
functions/      Cloudflare Pages Function that serves generated font.json links
addfont.py      interactive helper for adding a new font folder (see below)
```

## Adding a font

The easy way — run the helper from the repo root, pointing it at the font's files wherever they are on disk:

```
python3 addfont.py
```

It walks the folder you give it (and every subfolder), works out each file's weight from its name regardless of how it's written (`xyzfont_bold.ttf`, `XyzfontBold.ttf`, `xyzFont Bold.ttf` — all fine), prefers `.ttf` over `.otf` when a weight exists in both, finds and renames the license file to `LICENSE.txt`, and shows you the exact folder it's about to create before doing anything. If a folder turns out to contain more than one style family under the same weight names , it'll ask which one you want rather than guessing. You can run it from anywhere — output always lands in this repo, at its root or inside `fonts/`, never wherever you happened to be standing.

Doing it by hand instead: add `fonts/<Name>/` with the font's `.ttf`/`.otf` weights and its `LICENSE.txt`, named `Regular`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`, and their `*Italic` counterparts. Capitalization doesn't matter, but the suffix pattern does — the site's weight-matching depends on it. Those five (plus their Italic versions) are also the only weights `addfont.py` recognizes, since they're exactly what Discord's font.json roles use — a `Light.ttf` or `Thin.ttf` or `Black.ttf` will land under "couldn't tell what weight this is" rather than getting included automatically.

Either way: open a PR. The site discovers new folders on its own — nothing else needs editing or generating.

## Contributing

PRs welcome — new fonts, bug fixes, UI improvements.

- Only add fonts under a license that permits redistribution (OFL, Apache, MIT, etc.), and include the original `LICENSE.txt` in the font's folder.
- Keep changes dependency-free — no build step, no frameworks. That's intentional.
- For anything beyond a small fix, open an issue first so we're aligned before you put in the work.

## License

Each font keeps its own license — see that folder's `LICENSE.txt`. The site code is free to reuse or modify.