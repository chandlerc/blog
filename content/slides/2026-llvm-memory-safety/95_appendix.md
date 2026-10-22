+++
weight = 95
outputs = ["Reveal"]
+++

# Appendix

---

## Places compared to Rust's lifetimes

In both cases:

- Additional parameters to functions and types for safety
- Capturing a compile-time approximation of runtime behavior
- Used only for safety checking

However:

- Places are about _space_ (memory), not lifetime
  - Carbon uses invalidation effects to prevent use after free instead
- Need additional information about place overlap for safe non-exclusive mutable references

{{% note %}}

- Carbon places are about space, and what overlaps.
- Rust uses lifetime parameters to determine when references are valid.
- Carbon instead uses the effect system to mark _when_ pointers and references become invalid.

{{% /note %}}
