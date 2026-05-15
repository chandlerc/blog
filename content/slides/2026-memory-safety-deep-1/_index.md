+++
title = "Carbon Memory Safety: A first deep dive"
outputs = ["Reveal"]
date = "2026-04-13"
+++

# Carbon's memory safety story

## A first deep dive

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

---

## Safety, with _strict_ and _permissive_ modes

- _Strict_ Carbon is fully memory safe:
  - Temporal: Preventing "use after free" (UAF) at compile time
  - Spatial: Runtime bounds checking as in 🦀 Rust and being added to C++
  - Type, initialization, null pointer, and data race safety
- _Permissive_ Carbon is an intermediate step between C++ and strict Carbon
  - No safety annotations required
  - Safer than C++
- Every step toward strict Carbon reduces undefined behavior (UB)
  - Strict checking doesn't _introduce_ UB even when unsafe code misbehaves

---

## Expressivity

- Non-exclusive mutable pointers
  - Directly proving existing correct C++ code is memory safe
- Support for C++ features like inheritance and specialization
- More expressive than Rust, but with a complexity cost
- Allows _smooth_ migration of C++
  - Code patterns translate without cliffs or rearchitecting

{{% note %}}

- [Doc on Carbon complexity](https://docs.google.com/document/u/0/d/1ik7A37z46QQYgzqw9ZeBkWi9MvIw0CDLjdMOeaRjjM8/edit)

{{% /note %}}

---

## Incremental migration from C++

- "Permissive" mode
  - intermediate step between C++ and strict Carbon
  - syntax and semantics of Carbon, but safety checks are relaxed
  - call C++ freely, don't have to migrate all at once
  - migrate C++ code to permissive mode first, then add safety later
- C++ interop, even from strict mode
