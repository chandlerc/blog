+++
weight = 30
outputs = ["Reveal"]
+++

## Coming up in Part 2 after the break:

- **Expressivity**: common C++ patterns
- **Other kinds of safety**: thread and initialization safety
- **Incremental migration**: C++ → _permissive_ → _strict_
- **C++ interop**: mixing C++ and Carbon, _safely_
- **Eliminating UB**: monotonically reducing undefined behavior

{{% note %}}

This covers the "use after free" part of the talk and the 6 core safety ingredients.

After the break in Part 2, we'll see how this pays off in expressivity for C++ patterns, how the exact same mechanisms enforce thread safety and initialization safety, and how permissive mode and C++ interop let us migrate existing C++ code incrementally to strict memory-safe Carbon.

Questions before the break?

{{% /note %}}

---

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Introducing Carbon's <br/> Memory Safety Model {.title}

## Part 2

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### NDC TechTown 2026

</div></div>
<div class="right">

https://chandlerc.blog/slides/2026-ndc-techtown-memory-safety/#/60

</div>

{{% note %}}


{{% /note %}}

---

# Expressivity

## Support for common C++ patterns

---

## Expressivity is important

Benefits:
- Can show more things memory safe
- Adds flexibility when structuring code
- Enables migration of C++ code to Carbon

Goal: Represent common C++ coding patterns in strict Carbon with minimal use of `unsafe` and rearchitecting.

{{% note %}}

Just going to briefly touch on a number of different ways Carbon is more expressive than Rust. This is in addition to the cases where increased precision in the safety analysis
that I've been talking about leads to more code being accepted as safe.

{{% /note %}}

---

## Mutability without exclusivity

```carbon{}
// Parameters can optionally alias
fn Swap(`<2>ref x: i32`, `<2>ref y: i32`) {
  // Implementation works even if &x == &y.
  let tmp: i32 = x;
  x = y;
  y = tmp;
}

fn FisherYatesShuffle(ref vec: buf(i32)) {
  for (i: i32 in Core.IntRange(vec.Size() - 2)) {
    let j: i32 = Random(i, vec.Size());
    // Two simultaneous mutable references into ``vec``
    Swap(`<1>ref vec[i]`, `<1>ref vec[j]`);
  }
}
```

<div class="fragment" data-fragment-index="3">

- 🦀 Would need changes to work under Rust's "shared XOR mutable" restriction
  - The two references may point to the same element

</div>

<div class="fragment" data-fragment-index="4">

- Unsafe code making an aliasing pointer won't introduce UB

</div>


{{% note %}}

This is the headline expressivity feature of Carbon's safety model.

...

More generally, even unsafe code has fewer restrictions in Carbon, since strict
code won't optimize assuming there aren't aliasing pointers.

{{% /note %}}

---

## Self reference

- An object can have pointers to other fields in the same instance

```carbon{}
class Form {
  var first: strbuf;
  var last: strbuf;
  var current: ^(first, last) strbuf*;
}
```

- This is used in some small-size optimization implementations
  - Pointer either points to an inline buffer or heap allocation

---

## C++ features supported by Carbon but not Rust

Carbon has a large commitment to supporting C++ features independent of safety
- Inheritance
- Specialization
- Templates
- Implicit conversions
- Function overloading
- ...
