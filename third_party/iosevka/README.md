Build of the [Iosevka](https://typeof.net/Iosevka/) font for the blog.

See [`private-build-plans.toml`](private-build-plans.toml) for details on the
build configuration. Built by copying this into the Iosevka repository and
running:

```sh
npm run build -- webfont::iosevka-custom
```

The generated CSS isn't quite what we need though, so it is modified:

- The extra "... Oblique" family entries are removed as we'll just use the
  italics -> oblique fallback path.
- Use the absolute path in the Hugo VFS where the fonts will be deployed.
- Turn the CSS into a Hugo template that will fingerprint all the font files and
  use relative links to the fingerprinted versions.
