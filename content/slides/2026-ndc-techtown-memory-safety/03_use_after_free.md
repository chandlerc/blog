+++
weight = 3
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

3. The "free" is any deallocation or reallocation that invalidates the captured address.

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

- In Carbon, the code looks similar, except for it uses Carbon's `buf` type, which is its equivalent for C++'s `vector` or Rust's `vec`.
- The steps are the same, but the compiler gives an error.

{{% /note %}}

---

## No safety annotations in the calling code

```carbon{}
import Core library "io";

fn Run() {
  // ``buf(T)`` is Carbon's equivalent of C++'s
  // ``std::vector<T>`` or Rust's ``Vec<T>``
  var x: `<1>buf`(i32) = (1, 20, 300);
  `<2>var p: i32* = &x[0]`;
  `<2>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<2>*p`);
}
```

<div class="fragment" data-fragment-index="1" >

- The safety annotations are on the `buf` type
  - Explains how to safely use that type's API

</div><div class="fragment" data-fragment-index="2" >

- How are these connected?
  - Need to associate pointer `p` with the fact that it could point to an element of `x`
  - Connect the capture `p` to the invalidation by `PushBack`

</div>

{{% note %}}

**slide**

Before showing the definition of `buf` with its safety annotations, I'm going to introduce the ingredients Carbon uses to connect these operations in the type system.

{{% /note %}}
