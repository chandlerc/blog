+++
weight = 24
outputs = ["Reveal"]
+++

# Erased generics

## 6th safety ingredient

{{% note %}}

One of the more challenging aspects of the safety design is maintaining as much precision as possible with erased generics and other language features that erase types.

This problem motivated major changes in the development of our safety model.

{{% /note %}}

---

## Generics are erased rather than monomorphized

- Checked generically before instantiation
- Concrete types and their place parameters are erased
- Allows interop and separate compilation
- Avoids lots of duplicate instantiations

---

## Erased generics: interface effects

Here we have an interface (like a Rust trait). Different types will implement this interface in different ways. What effects should the method in the interface have?

```carbon{}
interface Notified {
  fn Event(ref self) ???;
}
```

- A generic function using the `Notified` interface is checked before instantiation using whatever effect is in the interface
- To be safe, a type's implementation of this interface must have a subset of the interface's safety effects

{{% note %}}

Carbon's generic story allows types to say how they implement interfaces,
much like Rust's traits. Because generics are checked before instantiation with the concrete type erased, it isn't immediately clear what effect
should be on the interface's method, since different types will implement
the interface in different ways.

References:
- [Safety Unit No. 25: hybrid flow-sensitive and fixed-by-types permissions](https://docs.google.com/document/d/1snTRAXs8AYGw0TCmKeiZQMR8suhLbpuhWJFbEohOf9Y/edit?tab=t.0)

{{% /note %}}

---

## Erased generics: interface effects

Here we have an interface (like a Rust trait). Different types will implement this interface in different ways. What effects should the method in the interface have?

```carbon{}
interface Notified {
  fn Event(ref self) unknown;
}
```

- A generic function using the `Notified` interface is checked before instantiation using whatever effect is in the interface
- To be safe, a type's implementation of this interface must have a subset of the interface's safety effects
  - `unknown` is the maximum effect that the type allows, invalidating anything reachable that is owned by something writable

{{% note %}}

Whatever is written there will bound the effects of implementations,
but if no bound is known, you can use `unknown` to mean the maximum
effect for the type.

References:
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Erased generics: limiting effects

```carbon{}
interface Notified {
  fn Event(ref self) unknown;
}
```

- Can use a non-owning type to avoid invalidation
  - Use `std::span` instead of `std::vector` if you aren't changing the vector's size
  - Leverages Carbon's freedom to have multiple pointers to the same thing
- Casting to `const` also limits effects

{{% note %}}

Since only owning types can produce invalidating effects, using a
less capable type like a span or slice will avoid invalidations when
they are not necessary.

References:
- [Safety Unit No. 25: hybrid flow-sensitive and fixed-by-types permissions](https://docs.google.com/document/d/1snTRAXs8AYGw0TCmKeiZQMR8suhLbpuhWJFbEohOf9Y/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Erased generics: erased place parameters

```carbon{}
`<1>interface I`;
`<2>fn Generic`[`<8>T`: I](ref z: `<8>T`, ref w: `<8>T`);
`<3>class C(^A)`;
`<4>impl C(^B) as I`;

fn `<5>ConcreteCaller`(`<6>^ ref x`: C(`<7>^D`), `<6>^ ref y`: C(`<7>^D`)) {
  `<8>Generic`(ref x, ref y);
}
```

<br/>

<div class="fragment" data-fragment-index="6">

- `^x.any` and `^y.any` in `ConcreteCaller` are _disjoint_

</div><div class="fragment" data-fragment-index="7">

- but both `x` and `y` can reference `^D`

</div><div class="fragment" data-fragment-index="8">

- Call to `Generic` deduces `T` to be `C(^D)`, erasing `^D` inside `Generic`

</div><div class="fragment" data-fragment-index="9">

- So inside `Generic`, `^z.any` and `^w.any` _overlap_
- Invariant: every reachable place must have a place name in the local scope
  - When the generic call erases `^D`, those places get added to `^z.any` and `^w.any`

</div>

{{% note %}}

Here we have:
- **Click** an interface,
- **Click** a generic function that operates on types that implement that interface,
- **Click** a type `C` with a place parameter
- **Click** that implements the interface
- **Click** and a function that operates on
- **Click** two `C` parameters that are required to be disjoint
- **Click** ...

{{% /note %}}

---

## Type erasure in inheritance: effects

```carbon{}
base class B(^A) {
  virtual fn F(ref self) unknown;
}

class D(^X, ^Y) {
  extend base: B(^(X, Y));
  override fn F(ref self);
}
```

Same erasure model applies to runtime type erasure via inheritance
- Virtual methods in base class must have safety effects that encompass derived implementation effects
- Just like methods in an interface for erased generics

{{% note %}}

References:
- [Safety Unit No. 36: inheritance](https://docs.google.com/document/d/1iIdFpb_B9K9_uyB61PBvbYN-0OU9L06hiVGs3ESRTLs/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Type erasure in inheritance: place parameters

```carbon{}
base class B(^A) {
  virtual fn F(ref self) unknown;
}

class D(^X, ^Y) {
  extend base: B(^(X, Y));
  override fn F(ref self);
  var p: ^X i32*;
  var q: ^Y i32*;
}
```

Additionally need to track aliasing when erasing derived types
- Base class must have place parameters that encompass place parameters of derived classes
- Maintains invariant that pointers can only reference external objects from type parameters

{{% note %}}

References:
- [Safety Unit No. 36: inheritance](https://docs.google.com/document/d/1iIdFpb_B9K9_uyB61PBvbYN-0OU9L06hiVGs3ESRTLs/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

<div class="fragment" data-fragment-index="1">

1.  _Place sets_: naming memory locations

</div><div class="fragment" data-fragment-index="2">

2.  _Ownership_: tree of responsibility for objects

</div><div class="fragment" data-fragment-index="3">

3. _Alias tracking_: what a pointer can reference

</div><div class="fragment" data-fragment-index="4">

4. _Invalidation_: when a pointer can become dangling

</div>

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint `<2>owned` `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<3>^Elts` ref T;

  fn PushBack(ref self, x: T)
      `<4>invalidate(^Elts)`;
}
```

</div></div>

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

<div class="fragment" data-fragment-index="1">

5.  _Flow-sensitivity within functions_: for precision and conciseness

</div><div class="fragment" data-fragment-index="2">

6.  _Generic checking without monomorphization_: place parameters erased before generating output code

</div>

</div><div class="col">

```carbon{}
import Core library "io";

fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<1>i32*` = &x[0];
  x.PushBack(4000);
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

</div></div>
