+++
weight = 20
outputs = ["Reveal"]
+++

# Ownership and invalidation

---

## Two intertwined concepts

- **Invalidation effect**
  - An example of *safety effects*, which are used for other parts of the safety story
  - Propagated up the call stack
    - Explicitly in function signatures
  - Increases precision by making invalidation opt-in instead of assumed
    - Similar to how knowing places are disjoint allows us to reduce invalidations
- **Ownership**
  - Single owner per allocation
  - Can only invalidate by writing to the owner
  - Owner is never invalidated

{{% note %}}

References: safety units [25](https://docs.google.com/document/d/1snTRAXs8AYGw0TCmKeiZQMR8suhLbpuhWJFbEohOf9Y/edit?tab=t.0#heading=h.lcy3u8dxwjzg), [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0)  

{{% /note %}}

---

## `buf` again

```carbon{}
class buf(T: ...) {

  // Declare ownership of a set of places.
  `<4>disjoint` `<1>owned ^Elts` of T;

  // Destroys elements, invalidating pointers
  // to them and anything they own.
  fn Clear(ref self) invalidate(`<2>^Elts.any`);

  // May reallocate, causing a relocation of elements
  // and invalidating pointers to them.
  fn PushBack(ref self, x: T) invalidate(`<3>^Elts`);
}
```

<div class="fragment" data-fragment-index="2">

- Destruction invalidates more than relocation

</div><div class="fragment" data-fragment-index="3">

- Don't have to invalidate a separate allocation when relocating

</div><div class="fragment" data-fragment-index="4">

- `disjoint owned ^Elts` means `^Elts` refers to a separate allocation

</div>

{{% note %}}

- `buf` is our example owning type.
- **Click** There is an explicit declaration giving a name for the places that `buf` owns.
- **Click** The `Clear` method deallocates the elements, which invalidates the elements as well as anything that they own.
- **Click** The `PushBack` method can relocate elements, which invalidates pointers to them, but doesn't invalidate owned memory, as long as it is a separate allocation.
- **Click** The keyword `disjoint` in the owned place declaration is what marks those places as a separate allocation.

<br/>

Slide contains some lies:

- Name of the class is actually `Core.Buf`, but Carbon provides the keyword `buf` as an alias shortcut.
- `buf` doesn't directly own the memory of its elements, it contains an `Alloc` member.
- The `buf` class has more methods and fields than listed
- Our eventual `buf` class will likely use the small-size optimization, making it `may_overlap owned` instead.

{{% /note %}}

---

## Ownership means "independent fate"

- Fields share fate with their containing object
- Owned data can be invalidated earlier
  - Like when the buffer is resized
- Ownership of data can be transferred
  - Owned data can outlive its original owner as a result
  - Can survive the owner being relocated

---

## Transfer of ownership

- Two effects that are refinements of `invalidate`: `mix` and `move`
- Local pointer types with automatic place sets are updated
- Allows less invalidation when relocating

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;

  // Transfers ownership
  fn Swap(ref self, ref other: Self)
    move(^self, ^other) move(^other, ^self);
}

fn UsesSwap() { 
  var x: buf(i32) = (1, 2, 3);
  var y: buf(i32) = (4, 5)
  var p: i32* = &x[0];
  var q: ^(x, y).Elts i32* = &y[0];
  x.Swap(ref y);
  // ``p`` and ``q`` still valid after ``Swap``
  Use(p, q);
}
```

{{% note %}}

- `PushBack` relocates elements to a new buffer using moving functions, resulting in less invalidation than methods that destroy
- `Swap` has `move` safety effect that transfers ownership

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

- Here is our use-after-free example again.
- **Click** As before, the `PushBack` call invalidates the pointer `p`
- **Click** However, `x` remains valid, and can give out new, valid references to its elements.
- **Click** This allows recovering  after invalidation, as long as you still have access to the owner.

{{% /note %}}

---

## Always a single owner

- Owner enforces invariants
  - Never invalid
  - No double free
  - Automatically avoid leaks
  - Ownership is transferred, never duplicated
- Two objects are disjoint if their owners are disjoint
  - Used to reduce unnecessary invalidations

{{% note %}}

- Having a single owner for objects allows us to put all the enforcement of invariants 
  into the implementation of owning types.

{{% /note %}}

---

## Owning enforcement in very few types

- Few fundamental owning types:
  - `Box`, `HeapArray`: does heap allocation
  - `InlineStorage`: used by sum types, and for small-size optimization
- Okay that they have unsafe code
- Other owning types like `buf` are built on top

---

## What about shared ownership?

How do we make reference counted types like `std::shared_ptr<T>` safe?
- Shared ownership modelled as _pointers to a single owner_
- That pointer means those types have a place parameter
- May reference the same owned data if their place arguments overlap
- Non-owning pointers to that place set are invalidated when any shared owner is freed
  - But shared owners remain valid (by using `unsafe` internally)

{{% note %}}

- Supporting multiple mutable pointers allows us to represent shared ownership, at least 
  as far as the safety model is concerned.

{{% /note %}}
