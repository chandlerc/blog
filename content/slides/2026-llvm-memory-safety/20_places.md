+++
weight = 20
outputs = ["Reveal"]
+++

# Places and place sets

## 1st safety ingredient

---

## Place sets written using `^`

- A variable has storage at some location in memory

```carbon
var x: i32 = 1;
```

- A _place_ represents the information we know about that location at compile-time
  - The place of `x` is written `^x`
- A _place set_ is a compile-time representation of set of places, also written using `^`
  - The type for pointers and references include a place set specifying which places are accessible

---

## `^`: the "places of" operator

- Every binding has a _place_

```carbon{}
var `<1>x`: i32;
var p: `<2>^x` i32* = &x;
```

<br/>

<div class="fragment" data-fragment-index="1">

- ``^x`` is the place where the variable `x` is stored

</div><div class="fragment" data-fragment-index="2">

- Pointer types include the set of possible places they can point to
  - ``p`` can point to anything with a place in ``^x``

</div><div class="fragment" data-fragment-index="3">

- When you take the address of a particular variable using `&x`, you get its _runtime address_
  - The `^` "places of" operator is parallel: it gets its _compile-time place_
  - So the type of `&x` is a pointer to the `^x` place

</div>

{{% note %}}

(Clarification: every binding introduces a place _name_. For a `var` binding, that name references a new location disjoint from other places. A `let` binding or parameter introduces a name that may overlap a place from the caller.)

{{% /note %}}
