+++
title = "Carbon memory safety: a first deep dive"
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
- Don't feel bad dropping out now if this isn't what you are looking for. I don't want to take 2 hours of your time. 

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

---

## Expressivity

- Non-exclusive mutable pointers
  - Directly proving existing correct C++ code is memory safe
- Support for C++ features like inheritance and specialization
- More expressive than Rust, but with a complexity cost
- Allows _smooth_ migration of C++
  - Code patterns translate without cliffs, rearchitecting, or lots of unsafe
