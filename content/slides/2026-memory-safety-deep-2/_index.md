+++
title = "Carbon memory safety: a first deep dive (v2)"
outputs = ["Reveal"]
date = "2026-06-10"
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

## A <span class="fragment highlight-current-green">first</span> deep dive

{{% note %}}

- Presentation is going to focus mainly on the question "what is Carbon's memory safety design", with a little bit of comparison to Rust.

**click**

- This is just the first chapter, not the full Carbon memory safety story:
  - There is more to the design than I will cover
  - I won't be covering how we arrived at this design, other models we considered, and why we prefer this approach.
  - There won't be much about implementing this design, we are coming to you early so we can incorporate your feedback while things are still flexible
  - If we don't have time to finish answering your questions or you have feedback to deliver afterwards, hopefully your invitation to this presentation included some method to reach me. If not, I have a slide at the end of the presentation with contact info.
- Don't feel bad dropping out now if this isn't what you are looking for. If that is the case, I really don't want to take 2 hours of your time. We will continue to engage with the community in a variety of ways.
- I also would like to make clear that this is the result of a collaboration with multiple members of the Carbon team and community, many of whom are in this call.

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

**click**

{{% /note %}}

---

## Two modes: _strict_ and _permissive_

- _Strict_ Carbon is fully memory safe
- _Permissive_ mode, along with C++ interop, supports incremental migration

---

## Strict Carbon is fully memory safe

- Temporal: Preventing "use after free" (UAF) at compile time
- Spatial: Runtime bounds checking as in 🦀 Rust and being added to C++
- Type, initialization, null pointer, and data race safety

{{% note %}}

- In this talk I'm only going to talk about the compile-time safety enforcement, with a focus on preventing use after free.
- I will briefly touch on initialization safety and data race safety.

{{% /note %}}

---

## Expressivity

- Non-exclusive mutable pointers
  - Directly proving existing correct C++ code is memory safe
- Support for C++ features like inheritance and specialization
- More expressive than Rust, but with a complexity and verbosity cost
- Allows _smooth_ migration of C++
  - Code patterns translate without cliffs, rearchitecting, or lots of unsafe

{{% note %}}

I want to be clear that when I compare Carbon to Rust and say it has greater expressivity, I'm not saying Rust has made a mistake in its safety model, or that we expect Carbon to be a replacement for Rust. Rust has a proven safety model that has been shown to work well across many classes of programs. Carbon aims to be complementary, targetting the specific use case of C++ migration, where gaining expressivity at a cost of more complexity and verbosity is a more worthwhile trade-off.

{{% /note %}}