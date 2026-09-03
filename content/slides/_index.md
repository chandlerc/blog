+++
title = "Slides"

# Deck sections are pages only so reveal-hugo can stitch them into their
# parent deck's single rendering; nothing is ever served at their own URLs.
# Without this, the sitemap advertises every one of them -- about a hundred
# URLs that 404 on every deployment.
[[cascade]]
  [cascade.sitemap]
    disable = true
  [cascade.target]
    kind = "page"
+++
