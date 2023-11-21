+++
title = "Summer of Code: Editor Integration"
date = "2023-11-28"
author = "Manmeet Singh"

[cover]
image = "syntax_highlighting.png"
alt = "Carbon code syntax highlighting in Vim"
caption = "Carbon code syntax highlighting in Vim"
+++

> Note: This is the second of two guest blog posts from Carbon's
> Google-Summer-of-Code contributors this year.

## Introduction

I'm Manmeet Singh, and I took part in Google Summer of Code 2023, contributing
to the Editor Integration for the Carbon Language.

In the realm of software development, a seamless editor experience is of
paramount importance. My Google Summer of Code project was to improve the
developer experience for Carbon programming language enthusiasts by integrating
Carbon into various editors and IDEs. This post takes you on a journey through
the Editor Integration project for Carbon, highlighting its accomplishments,
current state, challenges, and future prospects.

## Project goals and implementation

The project's overarching goal was to facilitate smoother coding for Carbon
developers by integrating Carbon language support into popular editors and IDEs.
To achieve this, I divided the project into three distinct components:

- Tree-sitter grammar,
- Refining TextMate syntax highlighting, and
- Developing a Language Server.

### Tree-sitter grammar

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) is a parser generator
that provides robust parsing capabilities. Tree-sitter highlighting is more
accurate compared to TextMate syntax highlighting because the editor has the
complete parse tree. Neovim uses Tree-sitter grammar for syntax highlighting.
Tree-sitter grammars can also be used for
[structural code navigation](https://github.com/ziontee113/syntax-tree-surfer).
Emacs also supports Tree-sitter, although an Emacs plugin for Carbon is not
implemented yet.

My mentor's reviews were very helpful to find edge cases and incorrect grammar.
I faced a hard case of distinguishing between a postfix _ and infix _ operators.
This is already handled by
[Symbolic Tokens](https://github.com/carbon-language/carbon-lang/blob/trunk/docs/design/lexical_conventions/symbolic_tokens.md).
Tree-sitter grammar for Carbon is
[tested against existing explorer test data](https://github.com/carbon-language/carbon-lang/blob/f63834c71d7a73188e2676d9a37bd498d70e0dda/utils/treesitter/BUILD#L22-L30)
to ensure its completeness. For integration with the rest of the project, I used
Bazel for building and testing Tree-sitter grammar. I had
[support for arm64 platforms](https://github.com/Maan2003/rules_tree_sitter/commit/cc4b283d796358f6575ff3a30e3639a7fcd85cc2)
in [rules_tree_sitter](https://github.com/elliottt/rules_tree_sitter).

### TextMate syntax highlighting

TextMate is a regex-based syntax highlighting approach. Carbon already had basic
support for TextMate syntax highlighting. As part of this project, I improved
the syntax highlighting. I updated keywords to align with the evolving Carbon
language. Moreover, I added a
[Visual Studio Code (VSCode) extension](https://github.com/carbon-language/carbon-lang/tree/trunk/utils/vscode)
that utilizes the TextMate syntax file for improved syntax highlighting.
Currently, TextMate syntax highlighting is functional in both VSCode and
JetBrains IDEs.

### Language Server

The third part of the project involved the implementation of a Language Server
for Carbon. A Language Server is meant to provide the language-specific smarts
and communicate with development tools over a protocol that enables
inter-process communication. The idea behind the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
(LSP) is to standardize the protocol for how such servers and development tools
communicate. This way, a single Language Server can be reused in multiple
development tools.

I developed a basic language server for Carbon. Language server uses the Carbon
toolchain. I reused language server protocol code and its helpers from clangd to
avoid reimplementation. Language server supporting code outlining. I implemented
Carbon language server clients for VSCode and Neovim.

{{< figure src="vscode_outline.png"
           alt="VSCode with code outline for Carbon"
           caption="VSCode with code outline for Carbon" >}}

## The current state and what lies ahead

I added support for 3 editors:

- **Neovim**: Tree-sitter for syntax highlighting and the language server for
  semantics.
- **VSCode**: TextMate for syntax highlighting and the language server.
- **JetBrains IDEs**: TextMate for syntax highlighting.

Looking ahead, there are exciting prospects to build on these accomplishments.
Future work includes
[expanding the language server capabilities](https://github.com/carbon-language/carbon-lang/issues/3169)
to encompass features like goto definition, find references, variable renaming,
and auto-complete.

## Conclusion

For setting up your favorite editor with Carbon support, follow the
[editor integration documentation](https://github.com/carbon-language/carbon-lang/blob/trunk/utils/README.md).
If your favorite editor supports Language server protocol or Tree-sitter,
contribute by adding instructions for your editor. Use existing
[editor](https://github.com/carbon-language/carbon-lang/blob/b7245bce9a61d8454fe26fb5c334badc70862936/utils/vscode/src/extension.js)
[plugins](https://github.com/carbon-language/carbon-lang/blob/b7245bce9a61d8454fe26fb5c334badc70862936/utils/nvim/carbon.lua)
as a reference.

In closing, a heartfelt thank you to the mentors for their meticulous reviews
and guidance throughout the project. The community's support has been
instrumental in shaping the success of this endeavor.

## Links to pull requests

- [Treesitter parser](https://github.com/carbon-language/carbon-lang/pull/2902)
- [update keywords in textmate syntax](https://github.com/carbon-language/carbon-lang/pull/2953)
- [Add basic VS Code extension using textmate syntax](https://github.com/carbon-language/carbon-lang/pull/2969)
- [Treesitter: fix where clause](https://github.com/carbon-language/carbon-lang/pull/2998)
- [treesitter: add more highlight rules](https://github.com/carbon-language/carbon-lang/pull/3036)
- [Language Server](https://github.com/carbon-language/carbon-lang/pull/3112)
- [neovim: add treesitter and lsp config](https://github.com/carbon-language/carbon-lang/pull/3129)
- [Editor support documentation](https://github.com/carbon-language/carbon-lang/pull/3132)
