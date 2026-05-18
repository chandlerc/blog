+++
weight = 1
outputs = ["Reveal"]
+++

# Temporal safety

## Preventing use after free at compile time

---

## Anatomy of a use after free (C++)

```cpp{}
#include <vector>
#include <cstdio>

int main() {
  `<1>std::vector<int> x { 1, 20, 300 }`;
  `<2>int* p = &x[0]`;
  `<3>x.push_back(4000)`;
  printf("%d\n", `<4>*p`);    // <- 💣💥
}
```

<br>

<div class="fragment" data-fragment-index="1" >

1.  **Allocation**

</div><div class="fragment" data-fragment-index="2">

2.  **Capture** a pointer into allocation

</div><div class="fragment" data-fragment-index="3">

3.  **Free** or reallocation

</div><div class="fragment" data-fragment-index="4">

4.  **Use** of dangling pointer

</div>

{{% note %}}

This is a minimal example of use after free.
Every use after free has four steps.

1. To have a "free," you need an allocation. Here, the C++ standard ``vector`` type allocates on the heap to store its elements.

2. To have a "use," you need to capture an address into the allocation.

3. The "free" is any deallocation or realllocation that invalidates the captured address.

4. And finally we have the "use" after the free, dereferencing the dangling pointer ``p``.

{{% /note %}}

---

## Anatomy of a use after free (Carbon)

```carbon{}
import Core library "io";

fn Run() {
  // ``buf(T)`` is Carbon's equivalent of C++'s
  // ``std::vector<T>`` or Rust's ``Vec<T>``
  `<1>var x: buf(i32) = (1, 20, 300)`;
  `<2>var p: i32* = &x[0]`;
  `<3>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<4>*p`);
}
```

<br/>

<div class="fragment" data-fragment-index="1" >

1.  **Allocation**

</div><div class="fragment" data-fragment-index="2">

2.  **Capture** a pointer into allocation

</div><div class="fragment" data-fragment-index="3">

3.  **Free** or reallocation

</div><div class="fragment" data-fragment-index="4">

4.  Prevents **use** of dangling pointer

</div>

{{% note %}}

In Carbon, the code looks the similar, and the steps are the same, but the compiler gives an error.

{{% /note %}}

---

## How does this differ from Rust?

```rust{}
fn main() {
  let mut x = vec![1i32, 20, 300];
  let p: &i32 = &x[0];
  x.push(4000);
  println!("{}", p);
}
```

{{% note %}}

I'm going to come back to the Carbon example, but I'm going to take a small diversion
to look at the corresponding example in Rust.

See
[https://rust.godbolt.org/z/Gbbrnoxa5](https://rust.godbolt.org/z/Gbbrnoxa5)

{{% /note %}}

---

## How does this differ from Rust?

``error[E0502]: cannot borrow `x` as mutable because it is also borrowed as immutable``

```rust
  |
3 |   let p: &i32 = &x[0];
  |                  - immutable borrow occurs here
4 |   x.push(4000);
  |   ^^^^^^^^^^^^ mutable borrow occurs here
5 |   println!("{}", p);
  |                  - immutable borrow later used here
```

"shared XOR mutable" borrow rule

- `x.push(4000)` requires an *exclusive* mutable borrow of `x`
  - incompatible with `p` also borrowing from `x`
- Rust requires exclusive access for _all_ writes
- Carbon explicitly marks what needs to be invalidated by a mutation
  - Getting a mutable reference to an element doesn't invalidate anything in Carbon.

{{% note %}}

See
[https://rust.godbolt.org/z/Gbbrnoxa5](https://rust.godbolt.org/z/Gbbrnoxa5)

{{% /note %}}

---

## How Carbon detects the error

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var `<2>x`: `<1>buf(i32)` = (1, 20, 300);
  var p: `<4>i32*` = &`<3>x[0]`;
  `<5>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<6>*p`);
}
```

</div><div class="col">

```carbon{}
class `<1>buf(T: ...)` {
  disjoint `<2>owned ^Elts` of T;

  impl as `<3>IndexRefWith`(i32)
      fn (ref self, arg: i32)
          -> `<4>^Elts ref T`;

  fn PushBack(ref self, x: T)
      `<5>invalidate(^Elts)`;
  // ...
}
```

</div></div>

<div class="fragment" data-fragment-index="2">

1.  ``x`` owns a heap allocation.

</div><div class="fragment" data-fragment-index="4">

2.  ``&x[0]`` has type ``^x.Elts i32*``. <br> ``^x.Elts`` tracks where ``p`` can point (may be omitted for locals).

</div><div class="fragment" data-fragment-index="5">

3.  Call to ``PushBack`` has an ``invalidate(^x.Elts)`` safety effect, invalidating ``p``.

</div><div class="fragment" data-fragment-index="6">

4.  Use of invalidated pointer ``p`` is a compile error.

</div>

{{% note %}}

Notice how there aren't any safety annotations in the `Run()` function on the left. The safety annotations that let Carbon detect the use after free are on the ``buf(T)`` type, and they describe how to safely use its API.

- `buf` is a parameterized type, here `T` is the type of the elements, `i32` in this case
- This is a declaration that the `buf` type owns a heap allocation that is exposed in its API.
- The indexing operator ``[``...``]`` takes a reference to the ``buf`` (``self`` or ``x``) and an integer index. It returns a reference to an element inside the set of places ``^self.Elts``.  
- The declaration ``var p: i32* = &x[i];`` doesn't include the optional place argument in the pointer type, so it defaults to "automatic." It starts out with the set of places from the type returned by the initializer, namely ``^x.Elts``.  Here ``^x`` is the place holding the variable ``x``, and ``^x.Elts`` is the set of places holding the elements of ``x``.
- The ``PushBack`` method takes a reference to the ``buf`` (``self`` or ``x``) and a value to append. It has the side effect of invalidating pointers into ``^self.Elts``, including ``p``.   
- Dereferencing ``p`` in ``Core.Print(*p);`` once ``p`` is invalid triggers an error.

{{% /note %}}

---

## How Carbon detects the error

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: i32* = &x[0];
  x.PushBack(4000);
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint owned `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<1>^Elts` ref T;

  fn PushBack(ref self, x: T)
      invalidate(`<1>^Elts`);
  // ...
}
```

</div></div>

1.  ``x`` owns a heap allocation.
2.  ``&x[0]`` has type ``^x.Elts i32*``. <br> ``^x.Elts`` tracks where ``p`` can point (may be omitted for locals).
3.  Call to ``PushBack`` has an ``invalidate(^x.Elts)`` safety effect, invalidating ``p``.
4.  Use of invalidated pointer ``p`` is a compile error.

{{% note %}}

Notice how the ``^Elts`` place set connects the allocation to references into that allocation and its later invalidation.

{{% /note %}}

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

- ``^`` acts a bit like ``&``, but gives compile-time information for use in types instead of the runtime address

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

---

## Place set expressions

- Places in an owned allocation: `^x.Elts`
  - Owning types have a named place set member, e.g. ``Elts``
  - Don't distinguish between `x[0]` and `x[1]`
- Place set parameters

---

## Similarities to Rust

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

- Lifetimes are about _time_ (source ranges)
- We ask if a lifetime _outlives_ another
- Abstract generic parameters

</div>
</div>

{{% note %}}

- Most important difference is the difference between overlap and outliving.
- Since Carbon allows pointers to alias
- Care about that fields don't overlap each other, but do overlap their containing object, even though they have the same lifetime
- Means Carbon can decouple invalidating owned data from the owner.

{{% /note %}}

---

## Ingredients for preventing use after free

- Ownership
  - Every allocation has a single owner
  - Ownership comes with both capabilities and responsibilities
- Invalidation
  - Only owners can perform invalidating operations like free or realloc
  - Those operations trigger an event that propagates up the call stack
- Alias tracking
  - Says _which_ pointers could reference the freed memory
  - Tracked in extra place arguments to pointer and reference types
    - Locals can use "automatic" default
