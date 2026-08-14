# The _Coding in Old Entish_ blog source code.

https://chandlerc.blog/

This is primarily a blog for the author, but may contain guest posts. All the
code is provided here as well as an open source project.

## Contributing

While this is primarily a personal blog project, I'm happy to have folks
contribute improvements, fixes, and suggestions.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## Testing Visual Changes

If you are modifying the site's styles, templates, or layouts, use the **Visual
Site Difference Tool** to compare your local rendering against staging or the
live site:

```bash
hugo server        # in one terminal
./site-diff.sh     # in another
```

It captures every page and every slide, compares them pixel for pixel, and
writes a self-contained `tools/site-diff/report.html` explaining anything that
differs, along with an ephemeral link to an uploaded copy (`--no-share` to
skip).

See [`tools/site-diff/README.md`](tools/site-diff/README.md) for details.

## Freezing Published Pages

No URL published here is allowed to break or change. To keep that promise while
still being free to change the site's templates, styles, and dependencies, a
page can be **frozen**: captured as it renders today into a tree of raw files
under `archive/`, which is what the URL serves from then on.

```bash
./archive.sh freeze /slides/2023-cppnow-compiler/   # capture one page
./archive.sh check                                  # verify every frozen URL
./archive.sh list                                   # what is frozen
```

Nothing in the build reaches a frozen page. Its source under `content/` is
retired to a generated placeholder that keeps it in every list, feed, and
sitemap, and its URL and every URL beneath it serve the same bytes however the
rest of the site changes.

See [`tools/archive/README.md`](tools/archive/README.md) for details.

## License

This project is licensed under the Apache License v2.0 with LLVM Exceptions.
Additionally, the non-source code materials in this project are licensed under
Creative Commons - Attribution
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

The subdirectories under `third_party` are not part of this project and under
the license included in each subdirectory.

See [`LICENSE.md`](LICENSE.md) for details.

## Disclaimer

This project is not an official Google project. It is not supported by Google
and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.
