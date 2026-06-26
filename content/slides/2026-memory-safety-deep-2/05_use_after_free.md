+++
weight = 5
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
Every use after free has four steps. **Click**

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

In Carbon, the code looks similar, and the steps are the same, but the compiler gives an error.

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

Notice how there aren't any safety annotations in the `Run()` function on the left.

- **Click** The safety annotations that let Carbon detect the use after free are on the ``buf(T)`` type, and they describe how to safely use its API.
- **Click** This is a declaration that the `buf` type owns a heap allocation that is exposed in its API. Ownership is declared explicitly in Carbon, unlike Rust where it is implicit.
- The indexing operator ``[``...``]`` takes a reference to the ``buf`` (``self`` or ``x``) and an integer index.
- **Click** It returns a reference to an element inside the set of places ``^self.Elts``.  
- The declaration ``var p: i32* = &x[i];`` doesn't include the optional place argument in the pointer type, so it defaults to "automatic." It starts out with the set of places from the type returned by the initializer, namely ``^x.Elts``.  Here ``^x`` is the place holding the variable ``x``, and ``^x.Elts`` is the set of places holding the elements of ``x``.
- **Click** The ``PushBack`` method takes a reference to the ``buf`` (``self`` or ``x``) and a value to append. It has the side effect of invalidating pointers into ``^self.Elts``, including ``p``.   
- **Click** Dereferencing ``p`` in ``Core.Print(*p);`` once ``p`` is invalid triggers an error.

{{% /note %}}

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var `<2>p: i32* = &x[0]`;
  x.PushBack(4000);
  // `<4>❌ Compiler error`: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint `<3>owned` `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<1>^Elts` ref T;

  fn PushBack(ref self, x: T)
      `<4>invalidate`(`<1>^Elts`);
  // ...
}
```

</div></div>

<div class="fragment" data-fragment-index="1">

-  _Places_ and _place set expressions_: like `^Elts`

</div><div class="fragment" data-fragment-index="2">

-  _Alias tracking_: which place sets can overlap?

</div><div class="fragment" data-fragment-index="3">

-  _Ownership_: types say their objects own some places

</div><div class="fragment" data-fragment-index="4">

-  _Invalidation_: by functions marked with safety effects

</div>

{{% note %}}

Notice how the **Click** ``^Elts`` place set connects the allocation to references into that allocation and its later invalidation.

{{% /note %}}

