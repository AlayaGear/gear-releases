# Alaya Lab Releases

One download page and changelog for every Alaya Lab desktop app (Gear Zero Desktop and Gear Cadre): <https://alayagear.github.io/gear-releases/>

## Products

| Product | What it is | Platforms | Download |
|---|---|---|---|
| **Gear Zero Desktop** | Create and share games: the playful side of the Gear line, on your Mac. | macOS (Apple Silicon) | [Latest](https://github.com/AlayaGear/gear-zero-desktop-releases/releases/latest) |
| **Gear Cadre** | The AI game studio for your desktop. Describe a game, play it, refine it by talking; exports Godot projects. | macOS (Apple Silicon), Windows x64, Linux x64 | [Latest](https://github.com/AlayaGear/gear-cadre-releases/releases/latest) |

Both apps update themselves once installed. Neither is code-signed yet, so the first launch shows a warning:

- macOS: System Settings → Privacy & Security → Open Anyway
- Windows: on the SmartScreen prompt, click More info → Run anyway
- Linux: `chmod +x Gear.Cadre_*.AppImage`, then run it

## How this repository works

It is an index only and holds no installers. Each product keeps publishing to its own releases repository, because each app's auto-updater reads `latest.json` from there; moving the installers would cut existing installs off from updates.

```
products.json                 the product list: name, copy, releases repo, which files count as installers
scripts/build-data.mjs        reads each repo's GitHub Releases and writes site/data/releases.json
notes/<product>/<tag>.md      replaces a release's notes on the page (English translations of older notes)
site/index.html               the page (static, no build step), styled with the Alaya Lab design system
.github/workflows/pages.yml   rebuilds and deploys to GitHub Pages
```

The page is rebuilt:

- **right after a release**: the publishing workflows in AlayaGear/gear-zero-desktop (`publish.yml`) and AlayaGear/gear-cadre-releases (`release.yml`) send a `product-released` repository_dispatch here;
- every 30 minutes, as a fallback;
- on every push to `main`, and by hand from the Actions tab.

The dispatch needs the secret `GEAR_RELEASES_DISPATCH_TOKEN` in both product repositories: a fine-grained token with **Contents: read and write** on `AlayaGear/gear-releases` only. Without it the release still succeeds and the page catches up on its schedule.

Preview locally:

```sh
node scripts/build-data.mjs        # GITHUB_TOKEN is optional and only raises the API rate limit
npx serve site                     # or any static file server
```

## Adding a product

Add an entry to `products` in `products.json`:

- `repo`: the product's public releases repository
- `assets`: regexes that match installer file names, with their OS (`mac` / `windows` / `linux`); `primary: true` makes it a main download button. Unmatched files (update bundles, `.sig`, `latest.json`) are hidden
- `skipTags`: tags to hide, such as a rolling `latest` alias
- `notesStrip` / `boilerplate`: strip a fixed footer from release notes, or treat template-only notes as "no notes"

Then add the dispatch step to that product's release workflow (copy it from either product above).

## Inventory (2026-10-19)

| | Gear Zero Desktop | Gear Cadre |
|---|---|---|
| Releases repo | [gear-zero-desktop-releases](https://github.com/AlayaGear/gear-zero-desktop-releases) | [gear-cadre-releases](https://github.com/AlayaGear/gear-cadre-releases) |
| Source repo | AlayaGear/gear-zero-desktop (private) | AlayaGear/gear-cadre (private) |
| Latest | v0.1.10 (2026-10-17) | v0.2.22 (2026-10-15) |
| Releases | 2 | 27, plus a rolling `latest` tag |
| First release | v0.1.9 (2026-10-17) | v0.1.14 (2026-09-01) |
| Built by | `publish.yml` on the team's self-hosted Mac | `release.yml` on GitHub-hosted runners in the releases repo |
| Release notes | Every release; v0.1.9–v0.1.10 were written in Chinese, translated in `notes/` | Only v0.2.16–18 and v0.2.22 have notes, in English; the rest are one-line templates |
| Update payload | `.zip` + `latest.json` | `.app.tar.gz` / installers + minisign `.sig` + `latest.json` |

Issues found while taking stock:

- Gear Cadre v0.2.4 is an empty release with no files.
- Gear Cadre skips v0.2.6 and v0.2.14.
- Gear Cadre v0.1.14 ships `latest.versioned.json` instead of `latest.json`, so its feed URL 404s (`release.yml` now checks for this).
- Release titles say "CADRE" while the files say "Gear.Cadre".
- Gear Zero Desktop has no Intel Mac or Windows build.
- Gear Zero Desktop v0.1.9 and v0.1.10 are titled "Gear Zero" with Chinese notes on GitHub; the page shows the English translations in `notes/gear-zero/`. New releases are titled "Gear Zero Desktop" with English notes once AlayaGear/gear-zero-desktop#170 is merged.
