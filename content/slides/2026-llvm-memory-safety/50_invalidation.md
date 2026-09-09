+++
weight = 50
outputs = ["Reveal"]
+++

# Invalidation safety effect

## 4th safety ingredient

---

## Invalidation effect

- Marks overlapping pointers as invalid to use after that point
- An example of *safety effects*, which are used for other parts of the safety story
- Propagated up the call stack
  - Explicitly in function signatures
- Increases precision by making invalidation opt-in instead of assumed
  - Similar to how knowing places are disjoint allows us to reduce invalidations

---

## How Carbon detects the error in our example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Core library "io";
 
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  `<2>var p: i32* = &x[0]`;
  `<1>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<3>*p`);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<2>^Elts ref T`;

  fn PushBack(ref self, x: T)
      `<1>invalidate`(`<2>^Elts`);
}
```

</div></div>

<div class="fragment" data-fragment-index="1">

1.  Call to ``PushBack`` has an ``invalidate`` safety effect

</div><div class="fragment" data-fragment-index="2">

2.  ``p`` has type ``^x.Elts i32*``, overlapping argument to `invalidate`
    - `p` is invalidated

</div><div class="fragment" data-fragment-index="3">

3.  Use of invalidated pointer ``p`` is a compile error.

</div>

{{% note %}}

- **Click** The ``PushBack`` method takes a reference to the ``buf`` (``self`` or ``x``) and a value to append. It has the side effect of invalidating pointers into ``^self.Elts``, including ``p``.
- The Carbon compiler checks that any method that relocates or deallocates any exposed places is marked with a safety effect that encompasses what it does. Will see an example of this later.
- **Click** It returns a reference to an element inside the set of places ``^self.Elts``.  
- The declaration ``var p: i32* = &x[0];`` doesn't include the optional place argument in the pointer type, so it defaults to "automatic." It starts out with the set of places from the type returned by the initializer, namely ``^x.Elts``.  Here ``^x`` is the place holding the variable ``x``, and ``^x.Elts`` is the set of places holding the elements of ``x``.
- **Click** Dereferencing ``p`` in ``Core.Print(*p);`` once ``p`` is invalid triggers an error.

{{% /note %}}

---

## Effect annotations are checked

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;

  impl as IndexRefWith(i32) fn (ref self, arg: i32) -> ^Elts ref T`<1> `{
    var new_alloc: HeapArray(T) = .Make(...);
    // ❌ Error: Missing invalidate annotation
    `<1>self.alloc = new_alloc`;
  }

  fn PushBack(ref self, x: T) `<2>invalidate(^Elts)` {
    var new_alloc: HeapArray(T) = .Make(...);
    // ✅ Okay, effect annotation present
    `<2>self.alloc = new_alloc`;
  }
}
```

{{% note %}}

Functions that call other functions that have invalidation effects are required by the compiler to also have an `invalidate` annotation if it could affect its caller.

{{% /note %}}

---

## Invalidation and ownership

- Can only invalidate pointers to places by writing to their owner
- Some `buf` methods invalidate, others don't
  - Indexing doesn't invalidate, even though it get a writable reference
  - As long as we aren't invalidating, all the pointers stay valid
  - This is what allows non-exclusive access
- Owner is always valid
  - After invalidation, owner is only thing that can give out valid references to its owned places

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

- Here is our use-after-free example again.
- **Click** As before, the `PushBack` call invalidates the pointer `p`
- **Click** However, `x` remains valid, and can give out new, valid references to its elements.
- **Click** This allows recovering  after invalidation, as long as you still have access to the owner.

{{% /note %}}
