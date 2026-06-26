+++
weight = 25
outputs = ["Reveal"]
+++


# Type erasure

---

## Type erasure: generics

Here we have an interface (like a Rust trait). Different types will implement this interface in different ways. What effects should the method in the interface have?

```carbon{}
interface Notified {
  fn Event(ref self) ???;
}
```

- A generic user of the `Notified` interface will use whatever effect is in the interface
- To be safe, a type's implementation of this interface must have a subset of the interface's safety effects

{{% note %}}

One of the more challenging aspects of the safety design, is maintaining as much precision as possible with language features that erase types.

Carbon's generic story allows types to say how they implement interfaces,
much like Rust's traits. In this example, it isn't clear what effect
should be on the interface's method, since different types will implement
the interface in different ways.

References:
- [Safety Unit No. 25: hybrid flow-sensitive and fixed-by-types permissions](https://docs.google.com/document/d/1snTRAXs8AYGw0TCmKeiZQMR8suhLbpuhWJFbEohOf9Y/edit?tab=t.0)

{{% /note %}}

---

## Type erasure: generics

Here we have an interface (like a Rust trait). Different types will implement this interface in different ways. What effects should the method in the interface have?

```carbon{}
interface Notified {
  fn Event(ref self) unknown;
}
```

- A generic user of the `Notified` interface will use whatever effect is in the interface
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

## Type erasure: generics

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

## Type erasure: inheritance

```carbon{}
base class B(^A) {
  virtual fn F(ref self) unknown;
}

class D(^X, ^Y) {
  extend base: B(^(X, Y));
  override fn F(ref self);
}
```

Virtual methods in base class must have safety effects that encompass derived implementation effects
- Similar to an interface.

{{% note %}}

References:
- [Safety Unit No. 36: inheritance](https://docs.google.com/document/d/1iIdFpb_B9K9_uyB61PBvbYN-0OU9L06hiVGs3ESRTLs/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Type erasure: inheritance

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

Additionally need to track aliasing
- Base class must have place parameters that encompass place parameters of derived classes
- Maintains invariant that pointers can only reference external objects
from type parameters

{{% note %}}

References:
- [Safety Unit No. 36: inheritance](https://docs.google.com/document/d/1iIdFpb_B9K9_uyB61PBvbYN-0OU9L06hiVGs3ESRTLs/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Type erasure: erased place parameters

```carbon{}
interface I;

fn Generic[`<3>T`: I](ref x: `<3>T`, ref y: `<3>T`);

class C(^A);

fn ConcreteCaller(`<1>^ ref x`: C(`<2>^A`), `<1>^ ref y`: C(`<2>^A`)) {
  `<3>Generic`(ref x, ref y);
}
```

<br/>

<div class="fragment" data-fragment-index="1">

- `^x.any` and `^y.any` in `ConcreteCaller` are _disjoint_

</div><div class="fragment" data-fragment-index="2">

- but both `x` and `y` can reference `^A`

</div><div class="fragment" data-fragment-index="3">

- Call to `Generic` deduces `T` to be `C(^A)`

</div><div class="fragment" data-fragment-index="4">

- So inside `Generic`, `^x.any` and `^y.any` _overlap_
- Invariant: every reachable place must have a place name in the local scope
  - When the generic call erases `^A`, it gets added to `^x.any` and `^y.any`

</div>
