+++
weight = 4
outputs = ["Reveal"]
+++


# Checking

## Putting it all together

---

## Safety contract in the source code

- Types carry "what can be referenced"
- Function signatures say:
  - what aliasing is allowed between parameters
  - what parameters the return may reference
  - what effects are produced

---

## Safety checking in the compiler

Compiler performs checking in two stages
- First, using fixed type information written in the source
  - Determines both semantics (overload resolution) and validity
- Then, flow-sensitive analysis
  - Iterates to find a fixed point for flow-sensitive state
  - Evaluates safety effects
  - Only affects validity not semantics

This will be Carbon's version of a "borrow checker"
- Some details may change in the implementation process

---

## Two kinds of checking

### 1. Type checking

- Done during both the fixed and flow checking stages
- Things that aren't allowed to alias, don't
  - Pointer can't be assigned an address outside the place argument to its type (when the place set is fixed)
- Aliasing information is propagated
  - Parameters \-\> returns
  - Returns \-\> caller's context

{{% note %}}

Skippable if low on time

{{% /note %}}

---

## Two kinds of checking

### 2. Safety effect checking

- Done during just the flow checking stage
- Prevent using anything that might overlap something that has been freed
- Effects are propagated to callers
  - `F` calls `G` calls `H`
  - `H` has an effect on some place from the caller, appears in its signature
  - `G` observes the effect in `H`, must have the effect in its signature so it can be observed by `F`
  - Stops when effects don't apply to any place in the caller

{{% note %}}

Skippable if low on time

{{% /note %}}

---

## Two kinds of checking

### 2. Safety effect checking (cont'd)

- Flow-sensitive analysis within functions
  - Invalidations from later in a loop can affect pointers earlier in the next iteration
  - Flow-sensitive place sets can be updated by safety effects
  - Plays a larger role for safety properties like initialization

{{% note %}}

Skippable if low on time

{{% /note %}}

---

## Type erasure: generics

Here we have an interface (like a Rust trait). Different types will implement this interface in different ways. What effects should the method in the interface have?

```
interface Notified {
  fn Event(ref self) ???;
}
```

- A generic user of the `Notified` interface will use whatever effect is in the interface
- To be safe, a type's implementation of this interface must have a subset of the interface's safety effects
  - `unknown` is the maximum effect that the type allows, invalidating anything reachable that is owned by something writable

{{% note %}}

One of the more challenging aspects of the safety design, is maintaining as much precision as possible with language features that erase types.

Carbon's generic story allows types to say how they implement interfaces,
much like Rust's traits. In this example, it isn't clear what effect
should be on the interface's method, since different types will implement
the interface in different ways.

Whatever is written there will bound the effects of implementations,
but if no bound is known, you can use `unknown` to mean the maximum
effect for the type.


References:
- [Safety Unit No. 25: hybrid flow-sensitive and fixed-by-types permissions](https://docs.google.com/document/d/1snTRAXs8AYGw0TCmKeiZQMR8suhLbpuhWJFbEohOf9Y/edit?tab=t.0)
- `unknown` effect (safety units [39](https://docs.google.com/document/d/144k9aoV7ABxcbJChjsuIwt7iRA5Jt-NIwpeW57de2xc/edit?tab=t.0) and [40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0))

{{% /note %}}

---

## Type erasure: generics

```
interface Notified {
  fn Event(ref self) unknown
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

```
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

```
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
