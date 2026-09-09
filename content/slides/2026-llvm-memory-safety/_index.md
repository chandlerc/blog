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


Hello, I'm Josh Levenberg from the Carbon programming language team.

- This is an early preview of Carbon's memory safety model, that we have been hard at work on and is now ready for community feedback.
- Presentation is going to focus mainly on the question "what is Carbon's memory safety design", with a little bit of comparison to Rust.
- You can see a copy of these slides at that URL, with speaker notes available.

**click**

- This is just the first chapter, not the full Carbon memory safety story:
  - There is more to the design than I will cover
  - I won't be covering how we arrived at this design, other models we considered, or why we prefer this approach.
  - There won't be much about implementing this design, we are coming to you early so we can incorporate your feedback while things are still flexible
- I also would like to make clear that this is the result of a collaboration with multiple members of the Carbon team and community, not just me.

{{% /note %}}

---

## Goal of Carbon's memory safety design

#### <span class="fragment highlight-current-green" data-fragment-index="2">Smooth</span> and <span class="fragment highlight-current-green" data-fragment-index="3">incremental</span> transition from C++ to <span class="fragment highlight-current-green" data-fragment-index="1">memory safety</span> in Carbon

<div class="fragment" data-fragment-index="1">

- Result needs to be memory safe

</div><div class="fragment" data-fragment-index="2">

- Expressivity to represent common C++ code patterns
  - Makes the transition _smooth_

</div><div class="fragment" data-fragment-index="3">

- Incremental in two ways
  - Migrate to Carbon a little at a time
  - Incrementally add safety once migrated

</div>

{{% note %}}

- Clear goals lead to good designs.
- These goals are different than other languages, like Rust.
- The differences in the design of Carbon's memory safety arise from the differences in goals.

There are three components of this goal

- **click** Compiler-checked memory safety, either at compile-time or runtime

{{% /note %}}

---

## Incremental migration from C++

- Carbon supports rich interop with C++, in both directions
  - Allows code to continue to work while partially migrated
  - Can migrate code in any order
- A Carbon file can be in one of two modes
  - _Permissive mode_ allows code to be migrated to Carbon before adding safety annotations
  - _Strict mode_ is fully memory safe, the end goal

There is a deep story about incrementallity, but out of scope for this talk which will only talk about strict mode.

---

## Strict Carbon is fully memory safe

- Temporal safety ("use after free")
- Data race safety ("thread safety")
- Spatial safety ("bounds checking")
- Initialization safety
- and so on

For time reasons, will only talk about use after free, which is
enforced at compile-time by Carbon.

{{% note %}}

- In this talk I'm only going to talk about the compile-time safety enforcement of use after free.

{{% /note %}}

---

## Comparison to Rust

Carbon has greater expressivity at the cost of more complexity

- Not saying Rust should change: Rust has a successful model that has been shown to be applicable to a wide variety of problems
  - Great for when you can architect your program around its safety model
- Additional complexity of Carbon has a cost
  - More verbose
  - More for users to understand and keep track of
- Carbon's model specifically to make migration from C++ easier
  - Show existing C++ code patterns are safe
  - More closely follows how C++ developers reason about their code

{{% note %}}

I want to be clear that when I compare Carbon to Rust and say it has greater expressivity, I'm not saying Rust has made a mistake in its safety model, or that we expect Carbon to be a replacement for Rust. Rust has a proven safety model that has been shown to work well across many classes of programs. Carbon aims to be complementary, targeting the specific use case of C++ migration, where gaining expressivity at a cost of more complexity and verbosity is a more worthwhile trade-off.

{{% /note %}}

---

## Carbon's increased expressivity

- Non-exclusive mutable pointers
- Support for C++ features like inheritance and specialization
- Allows _smooth_ migration of C++
  - Code patterns translate without cliffs, rearchitecting, or lots of unsafe
