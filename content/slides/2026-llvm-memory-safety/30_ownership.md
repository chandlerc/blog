+++
weight = 30
outputs = ["Reveal"]
+++

# Ownership

## 3rd safety ingredient

{{% note %}}

Our third safety ingredient is ownership.

{{% /note %}}

---

## `buf` owns the places for its elements

```carbon{}
class buf(`<1>T: ...`) {
  disjoint `<2>owned ^Elts of T`;

  // More later
}

var x: buf(i32) = (1, 20, 300);
```

<div class="fragment" data-fragment-index="2">

- Owning types, like `buf`, have a place set member for the places they own
-  <code><span class="fragment highlight-code" data-fragment-index="3">^x.Elts</span></code> has the places for the elements of ``x``
- No distinguishing between `x[0]` and `x[1]`

</div>

{{% note %}}

- In general, types and function signatures are responsible for the safety annotations in Carbon code.
- They explain how client code may safely use its API.
- `buf` is our example of an owning type.
- **click** It is a generic type with parameter `T`, which will be set to `i32` in our example.
- **click** the `owned ^Elts` declaration introduces a name for the places that `buf` owns.
- **click** That name is then a member of a `buf`'s places, so we write `^x.Elts` for the elements of a `buf` `x`.
- This is a compile-time analysis, so we can't distinguish different elements of the `buf`, since the index will generally only be known at runtime.
- Ownership is declared explicitly in Carbon as part of types, unlike Rust.

{{% /note %}}

---

## Always a single owner

- Owner enforces invariants
  - Never invalid
  - No double free
  - Automatically avoid leaks
  - Ownership may be transferred, never duplicated
- Two objects are disjoint if their owners are disjoint

{{% note %}}

- Having a single owner for objects allows us to put all the enforcement of invariants 
  into the implementation of owning types.
- All we really need is a small set of primitive owning types provided by Carbon's standard library correctly enforce these invariants, for anything built with those primitive types to benefit.
- It also gives the compiler important information that data owned by different containers don't overlap.

{{% /note %}}

---

## Owned elements have independent fate

- Fields share fate with their containing object
- Owned data can be invalidated earlier or later
  - Like when the buffer is resized or when ownership is transferred

{{% note %}}

- Owned data is different from fields, because they don't always have the same lifetime as their containing object.
- The elements of a buffer can be relocated when it is resized, while the containing object stays in the same place.
- And if the owned data is transferred to a new container, it can outlive its original owner.

{{% /note %}}

