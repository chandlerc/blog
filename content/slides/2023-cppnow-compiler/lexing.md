+++
weight = 5
outputs = ["Reveal"]
+++

## Data-oriented lexing!

{{% note %}}

{{% /note %}}

---

## Lexing directly fits the desired pattern

- Lex into a token buffer
  - Dense array of tokens
  - Side arrays of identifiers, strings, literals
- Expose a "token" as a flyweight index into the buffer

{{% note %}}

{{% /note %}}

---

## Lexing details: source locations

- Classical challenge is mapping tokens back to source locations
  - Very expensive -- one of the most optimized parts of Clang's lexer
- Carbon instead has a token _be_ the source location
  - Directly encodes its location within the source
  - Computes the location _extents_ on demand
- Result is a single 32-bit token ID gives both token & location

{{% note %}}

{{% /note %}}

---

## Lexing details: balanced delimiters

- Another challenge in parsing is recovering from unbalanced delimiters
- To make the parser much simpler, lexer pre-computes balanced delimiters
  - Also lets it synthesize tokens to re-balance when necessary
  - Parser never has to handle unbalanced token streams

{{% note %}}

{{% /note %}}

---

## Lexing implementation: a guided tour, live!

{{% note %}}

Areas to cover:
- macro-generation of enums
- macro-generation of tokens
- the core tokenized buffer data structure
  - flyweight API
  - identifiers
  - literals

{{% /note %}}
