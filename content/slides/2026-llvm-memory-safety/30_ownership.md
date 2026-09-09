+++
weight = 30
outputs = ["Reveal"]
+++

# Ownership

## 2nd safety ingredient

---

## `buf` owns the places for its elements

```carbon{}
class buf(T: ...) {
  disjoint `<1>owned ^Elts of T`;

  // More later
}

var x: buf(i32) = {1, 20, 300};
```

<div class="fragment" data-fragment-index="1">

- Owning types, like `buf`, have a place set member for the places they own
- ``^x.Elts`` has the places for the elements of ``x``
- No distinguishing between `x[0]` and `x[1]`

</div>

{{% note %}}

- `buf` is our example owning type. It is a generic type with parameter `T`, which will be set to `i32` in our example.
- **Click** the `owned ^Elts` declaration names the places that `buf` owns.
  Ownership is declared explicitly in Carbon as part of types, unlike Rust.

{{% /note %}}

---

## Ownership means "independent fate"

- Fields share fate with their containing object
- Owned data can be invalidated earlier
  - Like when the buffer is resized

---

## Always a single owner

- Owner enforces invariants
  - Never invalid
  - No double free
  - Automatically avoid leaks
  - Ownership may be transferred, never duplicated
- Two objects are disjoint if their owners are disjoint
  - Used to reduce unnecessary invalidations

{{% note %}}

- Having a single owner for objects allows us to put all the enforcement of invariants 
  into the implementation of owning types.

{{% /note %}}

---

## Owning enforcement in very few types

- Few fundamental owning types:
  - `Box`, `HeapArray`: does heap allocation
  - `InlineStorage`: used by sum types, and for small-size optimization
- Okay that they have unsafe code
- Other owning types like `buf` are built on top
