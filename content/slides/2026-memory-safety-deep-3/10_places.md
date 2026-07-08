+++
weight = 10
outputs = ["Reveal"]
+++

# Places and place sets

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
  - ``p`` can point to ``^x``

</div><div class="fragment" data-fragment-index="3">

- When you take the address of a particular variable using `&x`, you get the _runtime address_
  - The `^` "places of" operator is parallel: it gets the _compile-time place_
  - So the type of `&x` is a pointer to the `^x` place

</div>

---

## Place set expressions

- Fields

```carbon{}
class C {
  var x: i32;
  var y: i32;
}

var c: C = {.x = 1, .y = 2};
var px: ^c.x i32 = &c.x;
var py: `^c.y` i32 = &c.y;
var p_union: `^(c.x, c.y)` i32 = if F() then px else py;
var p_any: `^c.any` i32 = p_union;
```

{{% note %}}

- Objects have places, and **Click** their fields have nested places.
- There is an expression after the `^`, not just a name, with member accesses and so on.
- **Click** We represent the place set union using the places of a tuple.
- **Click** Or we can use `.any` to get the object's place, or any place it owns, or any of its fields.

{{% /note %}}

---

## Place set expressions

- Places in an owned allocation: `^x.Elts`
  - Owning types have a named place set member, e.g. ``Elts``
  - Don't distinguish between `x[0]` and `x[1]`
- Place set parameters

{{% note %}}

- We saw before that `buf`'s definition included a declaration introducing the owned `Elts` place set member.
- Types and functions can also take place set parameters.

{{% /note %}}

---

## Similarities to Rust's lifetimes

In both cases:

- Additional parameters to functions and types for safety
- Capturing a compile-time approximation of runtime behavior
- Used only for safety checking

---

## Differences from Rust

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

#### Carbon places ``^x``

- Places are about _space_ (memory)
- We ask if sets of places _overlap_
- Grounded in expressions using locals, parameters, fields

</div><div class="col">

#### Rust lifetimes ``'a``

- Lifetimes are about _time_ (source regions)
- We ask if a lifetime _outlives_ another
- Abstract generic parameters

</div>
</div>

{{% note %}}

- Carbon places are about space, and whether they overlap.
- Places are concerned with whether two fields of the same object don't overlap each other, but do overlap their containing object.
- Those fields are distinguished since they occupy different memory, even though they have the same lifetime.
- Lifetimes in Carbon are instead managed through safety effect annotations.
  - Those annotations are parameterized which places they affect.
- Carbon decouples invalidating owned data from the owner.

{{% /note %}}
