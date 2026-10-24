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
- This represents the work of a number of people, not just me and not just the Carbon language team.
- We only have time today for a brief introduction.
- I hope this will provide background for productive discussions during this workshop and the rest of the conference.

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

- The piece of Carbon's model that I will talk about today is enforcing temporal memory safety,
  specifically how Carbon prevents use-after-free bugs at compile time.
- We think this approach will be particularly interesting to this audience,
  because of Carbon's focus on migrating from C++.
- The model tries to match how C++ developers already document and
  reason about their APIs, in order to be able to show more C++ code
  patterns are safe.

{{% /note %}}

---

## Out of scope for this talk

- Other kinds of memory safety (data race, initialization, ...)
  - These same ingredients are used to enforce those other kinds of safety
- How this fits into Carbon's larger C++ migration story
- Comparison to other memory safety approaches (e.g. Rust's)

{{% note %}}

There is a lot more to the Carbon memory safety story than I will have time to cover.

Carbon supports full memory safety, including support for:

- C++ features like inheritance, templates, overloading, specialization
- and features to support smooth and incremental migration from C++

But I won't be able to talk about that or how it compares to other approaches like Rust's.

{{% /note %}}
