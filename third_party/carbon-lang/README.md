The [Highlight.js](https://highlightjs.org/) language configuration for Carbon
comes from
https://github.com/carbon-language/carbon-lang/blob/trunk/utils/highlightjs/highlightjs_carbon_lang.js
and is edited to work well when minified and merged into a single JS file.

The TextMate grammar in `assets/textmate/` comes from
https://github.com/carbon-language/carbon-lang/blob/trunk/utils/vscode/carbon.tmLanguage.json
and is consumed by `tools/hl` for build-time highlighting. It is vendored
from the overhaul in carbon-lang#7746 at commit
e515b8c386aa95044e66db2632cbbe344c8730a4, ahead of trunk, because that
version scopes declarations as `entity.name.*` rather than `support.*`, so a
theme can tell a function from a type. Note any local edits here; there are
none.
