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

- A _place_ represent the information we know about that location at compile-time
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

---

## Carbon allows you to omit places for locals

```carbon{}
var x: i32;
var p: `<1>i32*` = &x;
```

<br/>

In the body of a function, can omit place sets and have them determined by the compiler

<div class="fragment" data-fragment-index="1" >

- Compiler deduces `p` can point to the place expression `^x`

</div>

---

## Place set expressions

```carbon{}
class C {
  var x: i32;
  var y: i32;
}

var c: C = {.x = 1, .y = 2};
```

- Fields have nested places
  - `^c.x` is the place of the field ``x`` of ``^c``
  - Requires us to know the type of places in `^c`
- `^c.any` includes all the fields of any place in `^c`
- Types and interfaces can have place set parameters

{{% note %}}

- Objects have places, and their fields have nested places.
- There is an expression after the `^`, not just a name, with member accesses and so on.
- Or we can use `.any` to get the object's place, or any place it owns, or any of its fields.

{{% /note %}}
