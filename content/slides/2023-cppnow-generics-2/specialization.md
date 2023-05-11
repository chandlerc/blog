+++
weight = 40
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# Specialization is hard

---

## What is specialization?

Have multiple applicable implementations, and we pick the most specific

- For example, the implementation of the `Sort` interface does one thing for
  linked lists and another for containers that offer random access

---

## Specialization support across languages

- C++: supports specialization, including partial specialization
- Rust: not supported yet, long-term effort
- Swift: no planned conformance specialization

{{% note %}}

- We really want the perfomance benefit that C++ gets from supporting
  specialization.
- Rust has a long-term effort to add specialization, but it has not made it to
  stable Rust.
- Swift, as far as I am aware, has no plans to support specialization of
  conformances.
  - Swift does have type-based function overloading, which has some
    similarities.

{{% /note %}}

---

## C++

- Specialization is important for performance
- "Is more specific" rule is not a total order
- Can get an error if there is ambiguity between which of two specializations to
  pick

{{% note %}}

- The performance benefits of specialization support in C++ are great, but
  library authors have to be careful to avoid ambiguity errors when the compiler
  can't pick a "most specific" specialization.
- There is only a partial ordering of specializations, not a total order.

{{% /note %}}

---

## Rust considering impl specialization for a long time

- Been discussed as early as 2015
- A version of specialization has been in _unstable_ Rust since 2016
  ([Rust RFC 1210](https://rust-lang.github.io/rfcs/1210-impl-specialization.html))

> The current plan is to dramatically relax these [overlap] rules with a feature
> called "specialization".

<div style="text-align: right">

-- July 2018,
[https://github.com/Ixrec/rust-orphan-rules](https://github.com/Ixrec/rust-orphan-rules#what-are-the-orphan-rules)

</div>

{{% note %}}

- Specialization has been seen as the solution to Rust's overly restictive
  overlap rules, and has been under consideration for the last 8 years.
- There were some soundness problems related to lifetimes that blocked this for
  a while, but those are now solved.

{{% /note %}}

---

## Hard to add specialization without breaking existing code

```rust
trait A {
  type Out;
}

impl<T> A for T {
  type `<0>Out = i32`;
}

fn f<T>(_x: T) -> `<0><T as A>::Out` {
  return 3;
}
```

{{% note %}}

- Given a blanket implementation, can the compiler use `<click>` the value of
  its associated types?
- Without specialization, the answer is yes

{{% /note %}}

---

## Hard to add specialization without breaking existing code

```rust
trait A {
  type Out;
}

impl<T> A for T {
  type Out = i32;
}

fn f<T>(_x: T) -> <T as A>::Out {
  return 3;
}

struct S {}
impl A for S {
  type `Out = bool`;
}
```

{{% note %}}

- With specialization, a more specific implementation might apply with `<click>`
  different associated types

{{% /note %}}

---

## Hard to add specialization without breaking existing code

- Means specialization has to be added opt-in
- Much easier to include specialization from the start

---

## Large design space

- Lots of choices for defining "more specialized"
  - implementations match a subset of types?
  - in a child crate?
  - `final` implementations are more specific than `default` implementations
- Can restrict relationships between implementations
  - tree: require that implementations either have no overlap, or are properly
    contained
  - lattice: require that the intersection implementation exists for every pair
    of overlapping implementations
- Many others have been considered

{{% note %}}

- There are a lot of ways of defining a specialization rule
- It could use the subset relationship between matching type or matching queries
- It could use the dependency relationship between libraries
- It could have restrictions on how implementations can relate to each other,
  forming a tree or lattice.
- All these and more have been considered.

{{% /note %}}

---

## Desirable properties

- Coherence
  - Always pick the same specialization for a given type and interface
    combination, no matter what file
- Composition
  - Can mix and match libraries without ending up with ambiguity about which
    implementation will be chosen

{{% note %}}

- The two properties we have prioritized in the design of Carbon's
  specialization rule are coherence and composition
- Coherence is what we just talked about
- Composition is the ability to combine independent libraries without the
  possibility that the combination with trigger an ambiguity when selecting an
  implementation

{{% /note %}}

---

## Carbon's solution

- Total "more specific" ordering
  - Has a tie-breaking rule so all implementations can be compared
  - Enables composition:
    - Adding implementations never makes implementation selection ambiguous

<div class="fragment">

- Ordering uses the _type structure_ of `impl` declarations
  - erase type parameters
  - just like with Carbon's orphan rule

</div>

{{% note %}}

- Our solution is a total ordering using a tie-breaking rule
- This means there is always a most-specific implementation, and never any
  ambiguity
- `<click>` This rule orders implementations by their type structure
- The type structure is the impl declaration after erasing all of the type
  parameters
- Let me show you some examples

{{% /note %}}

---

## Type structure rule

Erasing type parameters from the `impl` declaration

<div class="col-container">
<div class="col">

```carbon
impl forall [T:! Printable] Vector(`<1>T`) as Printable


```

becomes:

```carbon
Vector(`<1>❓`) as Printable


```

</div>
</div>

{{% note %}}

- We drop all the constraint information about the type parameters, and
  `<click>` replace the type parameters themselves with a placeholder.

{{% /note %}}

---

## Type structure rule

Erasing type parameters from the `impl` declaration

<div class="col-container">
<div class="col">

```carbon
impl forall [T:! Ordered] `<1>T` as PartiallyOrdered


```

becomes:

```carbon
`<1>❓` as PartiallyOrdered


```

</div>
</div>

{{% note %}}

- Here's another example `<click>`
- Notice that the names left in the type structure are exactly the names used in
  the orphan rule to enforce coherence.

{{% /note %}}

---

## Type structure rule

Erasing type parameters from the `impl` declaration

<div class="col-container">
<div class="col">

```carbon
impl forall [U:! type, T:! As(U)] Optional(`<1>T`) as As(Optional(`<1>U`))


```

becomes:

```carbon
Optional(`<1>❓`) as As(Optional(`<1>❓`))


```

</div>
</div>

{{% note %}}

- All type parameters `<click>` are replaced with the same placeholder.

{{% /note %}}

---

## Type structure rule

Erasing type parameters from the `impl` declaration

<div class="col-container">
<div class="col">

```carbon
impl forall [T:! type] `<1>T` as CommonType(`<1>T`)


```

becomes:

```carbon
`<1>❓` as CommonType(`<1>❓`)


```

</div>
</div>

{{% note %}}

- This loses `<click>` the information whether parameters are the same.
- Carbon's specialization rule doesn't use that information to decide if a
  declaration is "more specific."

{{% /note %}}

---

## Which type structure is more specific?

Rule: look at the _first difference_ (reading left-to-right). One will have the
type matching the query, one will have `❓`. Prefer the first.

<div class="col-container">
<div class="col">

```carbon
`<1>BigInt` as AddWith(❓)


```

is more specific than:

```carbon
`<1>❓` as AddWith(BigInt)


```

</div>
</div>

{{% note %}}

- To order type structures, we look at the first difference reading
  left-to-right, and pick the one that has a specific type instead of a
  placeholder.
- Here, the first difference `<click>` is at the beginning. We ignore other
  differences. And so the first implementation is preferred.

{{% /note %}}

---

## Which type structure is more specific?

Rule: look at the _first difference_ (reading left-to-right). One will have the
type matching the query, one will have `❓`. Prefer the first.

<div class="col-container">
<div class="col">

```carbon
Vector(`<1>bool`) is AddWith(❓)


```

is more specific than:

```carbon
Vector(`<1>❓`) is AddWith(❓)


```

</div>
</div>

{{% note %}}

- The difference may be `<click>` in the parameter to the type.
- In cases where one declaration matches a proper subset of the other, the one
  matching fewer queries will be considered more specific by this rule.

{{% /note %}}

---

## Which type structure is more specific?

Rule: look at the _first difference_ (reading left-to-right). One will have the
type matching the query, one will have `❓`. Prefer the first.

<div class="col-container">
<div class="col">

```carbon
Vect3D is AddWith(`<1>Vect3D`)


```

is more specific than:

```carbon
Vect3D is AddWith(`<1>❓`)


```

</div>
</div>

{{% note %}}

- First difference could be `<click>` in the type parameters to the interface.
- A declaration without type parameters is always the most specific.

{{% /note %}}

---

## This rule breaks ties by the _order_ of the parameters

<div class="col-container">
<div class="col">

```carbon
import IntLib;
class `<0>BigInt`;
impl `<2>BigInt as IntLib.IntLike`;
impl forall [T:! IntLib.IntLike]
    `<3>BigInt as AddWith(T)`;
impl forall [T:! IntLib.IntLike]
    `<4>T as AddWith(BigInt)`;
```

</div>
<div class="col">

```carbon
import IntLib;
class `<1>FancyInt`;
impl `<2>FancyInt as IntLib.IntLike`;
impl forall [T:! IntLib.IntLike]
    `<3>FancyInt as AddWith(T)`;
impl forall [T:! IntLib.IntLike]
    `<4>T as AddWith(FancyInt)`;
```

</div>
</div>

<div class="col-container">
<div class="col" style="z-index: -1">
<!-- chandlerc@ FIXME: 3/4 width and centered? -->

```carbon
let b: BigInt = ...;
let f: FancyInt = ...;

let x: auto = b + f;

let y: auto = f + b;
```

</div>
</div>

{{% note %}}

Here is an example showing how parameter order is used to break ties

- Have two types: `<click>` `BigInt` and `<click>` `FancyInt` in different libraries
- `<click>` They both implement `IntLike`
- `<click>` They both supporting addition with anything `IntLike`
- `<click>` in either order

{{% /note %}}

---

## This rule breaks ties by the _order_ of the parameters

<div class="col-container">
<div class="col">

```carbon
import IntLib;
class BigInt;
impl BigInt as IntLib.IntLike;
impl forall [T:! IntLib.IntLike]
    BigInt as AddWith(T);
impl forall [T:! IntLib.IntLike]
    T as AddWith(BigInt);
```

</div>
<div class="col">

```carbon
import IntLib;
class FancyInt;
impl FancyInt as IntLib.IntLike;
impl forall [T:! IntLib.IntLike]
    FancyInt as AddWith(T);
impl forall [T:! IntLib.IntLike]
    T as AddWith(FancyInt);
```

</div>
</div>

<div class="col-container">
<div class="col">
<!-- chandlerc@ FIXME: 3/4 width and centered? -->

```carbon
let b: BigInt = ...;
let f: FancyInt = ...;
// Uses ``BigInt as AddWith(❓)``
let x: auto = `b + f`;

let y: auto = f + b;
```

Uses `BigInt as AddWith(❓)`

</div>
</div>

{{% note %}}

- `<click>` If the `BigInt` is first, its implementation is higher priority.

{{% /note %}}

---

## This rule breaks ties by the _order_ of the parameters

<div class="col-container">
<div class="col">

```carbon
import IntLib;
class BigInt;
impl BigInt as IntLib.IntLike;
impl forall [T:! IntLib.IntLike]
    BigInt as AddWith(T);
impl forall [T:! IntLib.IntLike]
    T as AddWith(BigInt);
```

</div>
<div class="col">

```carbon
import IntLib;
class FancyInt;
impl FancyInt as IntLib.IntLike;
impl forall [T:! IntLib.IntLike]
    FancyInt as AddWith(T);
impl forall [T:! IntLib.IntLike]
    T as AddWith(FancyInt);
```

</div>
</div>

<div class="col-container">
<div class="col">
<!-- chandlerc@ FIXME: 3/4 width and centered? -->

```carbon
let b: BigInt = ...;
let f: FancyInt = ...;
// Uses ``BigInt as AddWith(❓)``
let x: auto = b + f;
// Uses ``FancyInt as AddWith(❓)``
let y: auto = `f + b`;
```

Uses `FancyInt as AddWith(❓)`

</div>
</div>

{{% note %}}

- `<click>` If the `FancyInt` is first, its implementation is higher priority.
- We don't have any reason to favor `BigInt` or `FancyInt` over the other,
  except the order they appear in the parameter list.
- This is the price for having a total order.
- We will see how it works out in practice, but we think the choice of using
  _nominal_ interfaces helps avoid _semantic_ changes based on which
  implementation gets selected.
- This is not _ad hoc_ specialization where the API may change for specific
  argument values.
- OPTIONAL/SKIPPABLE: If there is a _performance_ difference, can solve that in
  a targetted way by providing more specific implementations changing the
  behavior in the overlap.

{{% /note %}}

---

## What if they have the same type structure?

- Ask the user to manually prioritize between all `impl` declarations with the
  same type structure
  - Gives the user control and often what they want
  - Scales much better than defining all the intersections

<div class="fragment">

- The orphan rule for coherence guarantees they must all be in the same library!
  - Specialization simplifies coherence **_and_** coherence simplifies
    specialization
- Local check for the compiler

</div>

{{% note %}}

- For implementations with the same type structure, we ask users to manually
  prioritize them
- This is often the control users want anyway, and scales better than asking
  them to define the behavior on all combinations of overlap
- `<click>` A consequence of the orphan rule I told you earlier is that having
  the same type structure means they have to be in the same library.
- Which makes it straightforward to manually order them.
- This is a case where not only specialization simplifies coherence, coherence
  simplifies specialization as well!

{{% /note %}}

---

## Specialization summary

<p style="text-align: center;">Total ordering</p>

<div style="text-align: center;" class="fragment" data-fragment-index="0">

_means_

</div>
<p style="text-align: center;" class="fragment" data-fragment-index="0">no ambiguity when picking an implementation specialization</p>

<div style="text-align: center;" class="fragment" data-fragment-index="1">

_means_

</div>
<p style="text-align: center;" class="fragment" data-fragment-index="1">can compose libraries safely</p>

---

{{< slide visibility="hidden" >}}

- C++ and Carbon both support specialization
- It is hard to retroactively add impl specialization to a language
- Specialization helps with both coherence and performance
- Total "more specific" order => no ambiguity when picking an implementation
  specialization => allows composition of libraries

---

{{< slide visibility="hidden" >}}

## Compositional: can combine libraries without worrying about introducing ambiguity

- No way for additional specializations to create ambiguity
- If the type checker sees that an implementation applies, can assume some
  implementation exists, even if it might be a more specialized implementation
  instead
  - Convenient and expected by users
  - Otherwise implementation details become viral requirements that leak into
    APIs

{{% note %}}

- This last point is a bit subtle, and has interactions with the design of
  witness tables and specialization.

{{% /note %}}

---

{{< slide visibility="hidden" >}}

## If you can see an implementation, an implementation must exist

```carbon
interface RepresentationOfOptional;

impl `forall [T:! Move] T as RepresentationOfOptional`;

class Optional(`T:! Move`) {
  var repr: `T.(RepresentationOfOptional.ReprType)`;
}
```

- Allows other types to customize their `Optional` representation
- Users of `Optional` need not be concerned with implementation details like
  `RepresentationOfOptional`

<!-- Is this too obscure a point? -->

{{% note %}}

- For example, pointers may have a specialization to use a null value when not
  present.

{{% /note %}}
