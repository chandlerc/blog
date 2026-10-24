+++
weight = 50
outputs = ["Reveal"]
+++

# Invalidation safety effect

## 5th safety ingredient

{{% note %}}

The 5th safety ingredient is invalidation. This is the piece that actually triggers the compiler to report errors in our use-after-free example.

{{% /note %}}

---

## Invalidation effect

- Marks overlapping pointers as invalid to use after that point
- An example of *safety effects*, which are used for other parts of the safety story
- Explicitly propagated up the call stack via function signatures
- Increases precision by making invalidation opt-in instead of assumed

{{% note %}}

- An invalidation effect is like that comment in C++ container code where it says this method invalidates iterators and pointers to elements, except that it is actually enforced by the compiler.
- It is an annotation on the function signature. Carbon uses other annotations like this, which we call *safety effects*, in its broader safety story.
- We avoid unnecessary invalidations by requiring these annotations instead of assuming anything that can write to the container invalidates pointers into its elements.

{{% /note %}}

---

## How Carbon detects the error in our example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Core library "io";
 
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  `<4>var p: i32* = &x[0]`;
  `<1>x.PushBack(4000)`;
  // `<6>❌ Compiler error`: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<5>*p`);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<4>^Elts ref T`;

  fn `<1>PushBack(ref self, x: T)`
      `<2>invalidate`(`<3>^Elts`);
}
```

</div></div>

<div class="fragment" data-fragment-index="1">

1.  Call to ``PushBack`` has an ``invalidate`` safety effect

</div><div class="fragment" data-fragment-index="4">

2.  ``p`` has type ``^x.Elts i32*``, overlapping argument to `invalidate`
    - `p` is invalidated

</div><div class="fragment" data-fragment-index="5">

3.  Deref of invalidated pointer ``p`` is a compile error.

</div>

{{% note %}}

This is where we put all the pieces together to see how Carbon detects the error in our example.

- **click** The ``PushBack`` method takes a reference to the ``buf`` (``self`` or ``x``) and a value to append.
- **click** The `invalidate` annotation means it has the side effect of invalidating pointers into **click** ``^self.Elts``.
- **click** The declaration of the pointer `p` doesn't include the optional place set in the pointer type, so it defaults to "automatic," and gets it from the the type of its initializer.
- This place set overlaps what was invalidated, so `p` is invalidated.
- **click** Dereferencing ``p`` in ``Core.Print(*p);`` once ``p`` is invalid **click** triggers the error.

{{% /note %}}

---

## Effect annotations are checked

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;
  fn PushBack(ref self, x: T) invalidate(^Elts);
}

fn ProducesCompilerError(ref x: buf(i32))`<1> `{
  // ❌ Error: Missing ``invalidate`` annotation
  `<1>x.PushBack(4000)`;
}

fn Okay(ref x: buf(i32)) `<2>invalidate(^x.Elts)` {
  // ✅ Okay, effect annotation present
  `<2>x.PushBack(4000)`;
}
```

{{% note %}}

Functions that call other functions that have invalidation effects are required by the compiler to also have an `invalidate` annotation if it could affect its caller.

- **click** In this first function, the call ``x.PushBack`` has an invalidate effect that would affect the caller's argument to the `x` parameter, but is not mentioned in the function signature, so the compiler reports an error.

- **click** Adding the `invalidate` annotation addresses the compiler error. This is how the safety effect is propagated up the call stack through function signatures.

{{% /note %}}

---

## Invalidation and ownership

Some `buf` methods invalidate its elements, others don't
- Only mutations can invalidate
- Indexing doesn't invalidate, even though it returns a writable reference
- As long as we aren't invalidating, all the pointers stay valid
- This is what allows non-exclusive access

{{% note %}}

- Invalidations limit when you can use pointers, so being precise about which methods invalidate and what they invalidate is key to showing algorithms using pointers are still safe.
- We get precision by only invalidating on functions marked with the invalidate effect.
- In generic code, we keep some of that precision by knowing that we have restricted the invalidate effect to functions that can modify the owner.

{{% /note %}}

---

## Owners are never invalidated

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: i32* = &x[0];

  `<1>x.PushBack(4000)`;
  // ``p`` invalidated by ``x.PushBack``.
  // ❌ Core.Print(*p);

  // ✅ ``x`` is the owner, so still valid.
  `<2>p = &x[0]`;

  // ✅ Okay, ``p`` is valid again; may have
  // a different value if ``x`` reallocated.
  `<3>Core.Print(*p)`;
}
```

<br/>

<div class="fragment" data-fragment-index="3">

Allows recovery after invalidation

</div>

{{% note %}}

- Here is our use-after-free example again with a change to fix the error.
- **Click** As before, the `PushBack` call invalidates the pointer `p`
- **Click** However, `x` remains valid, and can give out new, valid references to its elements.
- **Click** This allows recovering  after invalidation, as long as you still have access to the owner.

{{% /note %}}
