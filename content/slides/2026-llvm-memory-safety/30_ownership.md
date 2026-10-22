+++
weight = 30
outputs = ["Reveal"]
+++

# Ownership

## 3rd safety ingredient

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
- ``^x.Elts`` has the places for the elements of ``x``
- No distinguishing between `x[0]` and `x[1]`

</div>

{{% note %}}

- `buf` is our example owning type.
- It is going to have the safety annotations explaining how client code may safely use its API.
- **Click** It is a generic type with parameter `T`, which will be set to `i32` in our example.
- **Click** the `owned ^Elts` declaration names the places that `buf` owns.
- It introduces a name that is a member of the place of any `buf` objects.
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

{{% /note %}}

---

## Owned elements have independent fate

- Fields share fate with their containing object
- Owned data can be invalidated earlier or later
  - Like when the buffer is resized or when ownership is transferred
