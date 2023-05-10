+++
weight = 7
outputs = ["Reveal"]
+++

## Data-oriented semantics!

{{% note %}}

{{% /note %}}

---

## Core idea: model semantics _as an IR_

- IR here in the sense of a compiler's Intermediate Representation
  - Generally structured in blocks with an order of execution
- For runtime code, this generates exactly the structure we want
  - First, to type check and validate the semantics
  - Then, to lower into a lower level IR like LLVM's
- We map other parts of semantic analysis into the IR space:
  - Declaring names, types, etc., are compile time evaluation
  - Type checking is evaluation, constant propagation, and then verifying
  - Template instantiation similar to "specialization" in optimizing compilers

{{% note %}}

{{% /note %}}

---

## Result feels a _bit_ like a "metaprogramming" IR

- Imperative model for building all constructs in the language
- Lends itself to well understood techniques for fast compile time:
  - Interpreters
  - Efficient streaming data structures
- Some hope that this lends itself to implementing actual metaprogramming features
  - But *way* too early to tell...
- Really, this is *very* early and an area of active work

{{% note %}}

{{% /note %}}

---

## Live _tiniest_ demo of Semantics IR 

{{% note %}}

{{% /note %}}

---

## Built by walking the postorder parse tree

- Primary consumer driving the parse tree design
- Walk observes the parse structure
  - Uses a stack data structure to provide any context or other details
- Efficiency hinges on a single pass over the parse tree
  - This is difficult though
  - Some places we defer subtrees: nested function bodies
  - Other places use intermediate data structures
  - Template instantiations are a fundamental challenge, but tolerable

---

## Gets more help from the language

- Single pass is easier if we emit things before they're needed
- Carbon has a principle of [information accumulation]
  - Toolchain leverages this to directly emit complete semantics
  - Limiting _necessary_ repeated passes to monomorphization & instantiation

[information accumulation]: https://github.com/carbon-language/carbon-lang/blob/trunk/docs/project/principles/information_accumulation.md

{{% note %}}

{{% /note %}}

---

## Again, really early days on semantics.<br/>More to come!

{{% note %}}

{{% /note %}}
