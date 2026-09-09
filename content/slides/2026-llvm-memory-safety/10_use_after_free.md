+++
weight = 10
outputs = ["Reveal"]
+++

# Temporal safety

## Preventing use after free at compile time

---

## Anatomy of a use after free

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

This is a minimal example of use after free, shown with Carbon code.
Every use after free has four steps. **Click**

1. To have a "free," you need an allocation. Here, the Carbon's `buf` type, which is its equivalent for C++'s `vector` or Rust's `vec`, allocates on the heap to store its elements.

2. To have a "use," you need to capture an address into the allocation.

3. The "free" is any deallocation or reallocation that invalidates the captured address.

4. And finally we have the "use" after the free, dereferencing the dangling pointer ``p``, which Carbon flags at compile time as an error.

{{% /note %}}

---

## Some tracking of what pointers can point to

```carbon{}
import Core library "io";

fn Run() {
  // ``buf(T)`` is Carbon's equivalent of C++'s
  // ``std::vector<T>`` or Rust's ``Vec<T>``
  var x: buf(i32) = (1, 20, 300);
  `<2>var p: i32* = &x[0];`
  `<1>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<1>*p`);
}
```

<br/>

<div class="fragment" data-fragment-index="1" >

How are these connected?

</div><div class="fragment" data-fragment-index="2">

- Need to associate pointer `p` with the fact that it could point to an element of `x`

</div>
