+++
weight = 20
outputs = ["Reveal"]
+++

# Places and place sets

## 1st safety ingredient

{{% note %}}

This brings us to our first safety ingredient, places and place sets.

{{% /note %}}

---

## Places for variables written using `^`

```carbon{}
var `<1>x`: i32 = 1;
```

<br/>

- A variable has storage at some location in memory

- A _place_ represents the information we know about that location at compile-time
  - The place of `x` is written <code><span class="fragment highlight-code" data-fragment-index="1">^x</span></code> 

<div class="fragment" data-fragment-index="2">

- More generally, ``^``_expr_ is the _set_ of places that _expr_ could be stored

</div>

{{% note %}}

- A place is the compile time information that we have about a memory location, such as the storage for a variable.
- **click** Places are written with a `^`. The place for the variable ``x`` is ``^x``.
- **click** An expression could reference more than one place, so the caret of an expression is a set, a place set.

{{% /note %}}

---

## Pointers point to a set of places

```carbon{}
var x: i32;
var p: `<2>^x` `<1>i32`* = &x;
```

<br/>

<br/>

<div class="fragment" data-fragment-index="2">

- Pointer types include the set of possible places they can point to
  - ``p`` can point to anything with a place in ``^x``

</div><div class="fragment" data-fragment-index="3">

- When you take the address of a variable using `&x`, you get its _runtime address_
  - The `^` "places of" operator is parallel: it gets its _compile-time place_
  - So the type of `&x` is a pointer to the `^x` place

</div>

{{% note %}}

- The type of a pointer in Carbon has both
  - **click** the type of the objects it can point to,
  - **click** and also the _set of places_ it can point to.
  - In this case, the pointer `p` can point to anything with a place in `^x`,
    namely the single place where the variable `x` is stored.
- **click** The caret operator is like the compile time analogue of the
  address-of operator, giving the compile-time places instead of the runtime address.

{{% /note %}}
