+++
weight = 70
outputs = ["Reveal"]
+++

# Alias tracking

## (continued)

---

## Aliasing between parameters

- Vocabulary for expressing whether parameters are disjoint or may overlap
- If disjoint, caller has to have a proof
  - Gives the callee more information
- "May overlap" is the default

---

## Aliasing between parameters

### 🦀 Not an issue in Rust

- "Shared XOR mutable" means reference parameters can't interact
- Parameter aliasing is additional information needed for safe non-exclusive mutable references

---

## Aliasing in data structures

### Types with external pointers

- Pointer in classes must specify explicitly what they can point to
- Classes that reference something external need to have a place parameter

```carbon{}
class HasPtr(`^A of i32`) {
  var p: `^A` i32*;
}

fn Example() {
  var i: i32 = 1;
  var has_ptr: HasPtr(`^i`) = {.p = &i};
}
```

🦀 Rust similarly requires a lifetime parameter when fields reference something outside that struct.

{{% note %}}

- If a type is going to reference a place that isn't a field or owned, it needs **Click** a place parameter.
- This introduces a name that can be used in **Click** the types within the class.
- **Click** Which is then specified when instantiating that type.

References: [safety unit 33](https://docs.google.com/document/d/198w8Zr6ZaLT7sTzp2zIb5mB_jRNYbP0Girhwqfnt85Y/edit?tab=t.0)  

{{% /note %}}

---

## Places compared to Rust's lifetimes

In both cases:

- Additional parameters to functions and types for safety
- Capturing a compile-time approximation of runtime behavior
- Used only for safety checking

However:

- Places are about _space_ (memory), not lifetime
- Carbon uses invalidation effects for lifetimes instead
- Additional precision from field granularity

{{% note %}}

- Carbon places are about space, and whether they overlap.
- Places are concerned with whether two fields of the same object don't overlap each other, but do overlap their containing object.
- Those fields are distinguished since they occupy different memory, even though they have the same lifetime.
- Lifetimes in Carbon are instead managed through safety effect annotations.
  - Those annotations are parameterized which places they affect.
- Carbon decouples invalidating owned data from the owner.

{{% /note %}}
