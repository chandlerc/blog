+++
weight = 20
outputs = ["Reveal"]
+++

# Places and place sets

## 1st safety ingredient

---

## Places for variables written using `^`

```carbon{}
var `<1>x`: i32 = 1;
```

<br/>

- A variable has storage at some location in memory

<div class="fragment" data-fragment-index="1">

- A _place_ represents the information we know about that location at compile-time
  - The place of `x` is written <code><span class="fragment highlight-code" data-fragment-index="1">^x</span></code> 

</div><div class="fragment" data-fragment-index="2">

- More generally, ``^``_expr_ is the _set_ of places that _expr_ could be stored

</div>


---

## Pointers point to a set of places

```carbon{}
var x: i32;
var p: `<1>^x` i32* = &x;
```

<br/>

<br/>

<div class="fragment" data-fragment-index="1">

- Pointer types include the set of possible places they can point to
  - ``p`` can point to anything with a place in ``^x``

</div><div class="fragment" data-fragment-index="2">

- When you take the address of a variable using `&x`, you get its _runtime address_
  - The `^` "places of" operator is parallel: it gets its _compile-time place_
  - So the type of `&x` is a pointer to the `^x` place

</div>

{{% note %}}

(Clarification: every binding introduces a place _name_. For a `var` binding, that name references a new location disjoint from other places. A `let` binding or parameter introduces a name that may overlap a place from the caller.)

{{% /note %}}
