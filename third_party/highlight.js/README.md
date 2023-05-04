[Highlight.js](https://highlightjs.org/) built using [languages.txt]:

```sh
node tools/build.js -n (cat path/to/languages.txt)
```

The non-minified JS is copied into `assets/js` and then `base16/dracula.css`
into `assets/css` but converted to `.scss` so it can be imported where desired.
