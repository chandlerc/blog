+++
title = "Carbon memory safety: a brief introduction"
outputs = ["Reveal"]
date = "2026-07-08"
+++

<style>
.reveal .slide-number {
  font-size: 28px;
}
</style>

<br/>

<br/>

<br/>

<br/>

# Carbon memory safety

## A brief introduction

<br/>

<br/>

https://chandlerc.blog/slides/2026-llvm-memory-safety/

{{% note %}}

- Hello, I'm Josh Levenberg, and I'm here to give you an early preview of Carbon's memory safety model.
- This represents the work of multiple people, not just the Carbon programming language team.
- We only have time today for a brief introduction.
- I hope this will provide background for productive discussions during this workshop.

{{% /note %}}

---

## Will talk about today

- Temporal memory safety
  - Preventing use after free
- Compile-time enforcement
  - No runtime overhead
  - Prevents classes of bugs as early as possible
- Expressivity
  - Showing more common C++ code patterns as safe
  - Particularly non-exclusive mutable pointers

{{% note %}}

{{% /note %}}

---

## Out of scope for this talk

- Other kinds of memory safety (data race, initialization, ...)
  - These same ingredients are used to enforce those other kinds of safety
- How this fits into Carbon's larger C++ migration story
- Comparison to other memory safety approaches (e.g. Rust's)

{{% note %}}

There is a lot more to this story than I will have time to cover.

Carbon supports full memory safety, including support for:

- C++ features like inheritance, templates, overloading, specialization
- and features to support smooth and incremental migration from C++

This comes at the cost of some complexity in the memory safety model,
but we hope that this model closely matches how C++ developers
already reason about and document their code.

{{% /note %}}
