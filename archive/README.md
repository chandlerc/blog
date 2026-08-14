# Frozen pages

`site/` holds published URLs that have been taken out of Hugo's hands. Every
file in it is served exactly as it is: the page as Hugo last rendered it, the
images it shows, and the stylesheets, scripts, and fonts it loads. Nothing here
is generated at build time, and nothing here should be edited.

The tree is rooted at the site root and mounted into Hugo's `static`, so an
ordinary build publishes it. Copying `site/` into a bucket also works on its
own, with no generator involved.

A frozen page has no source under `content/`. What remains there is a generated
placeholder that keeps the page in the lists and the sitemap and tells Hugo to
publish nothing for it; the source is in version control, in the commit that
froze the page.

`manifest.json` records what is frozen, when, with which Hugo, where each
placeholder lives, the files each page needs, and the references it could not
capture: third-party embeds, and links that were already broken.

Both are generated. See
[`../tools/archive/README.md`](../tools/archive/README.md) for how, and
`./archive.sh check` from the repo root to verify that every frozen URL still
serves what it claims.
