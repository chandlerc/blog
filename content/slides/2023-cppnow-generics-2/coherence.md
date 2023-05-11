+++
weight = 30
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# Coherence is hard

{{% note %}}

- The next hard problem I'm going to talk about is coherence

{{% /note %}}

---

## What is coherence about?

- How much can the meaning of code change when its moved between files?
- For example, in C++, the "One Definition Rule" says that the definition of
  some entities must match across translation units.
  - Otherwise, the program is ill-formed, no diagnostic required.

{{% note %}}

- Coherence is about the meaning of code being consistent.
- This idea manifests in C++ as the "one defintion rule", where we insist that
  names have the same definition no matter which translation unit is referencing
  the name.
- If there is a mismatch, the program is ill-formed, no diagnostic required.

{{% /note %}}

---

## Coherence for generics

- Rust enforces "trait coherence": a given type has at most one implementation
  of any trait

<div class="fragment">

- A choice, and different languages make different choices
  - For example, Swift does not enforce coherence

</div>

{{% note %}}

- Rust applies this idea to its generics system to get "trait coherence."
- Trait coherence is about implementation consistency.
- This means the answer is always the same for any query asking for the
  implementation of trait and type.
- `<click>` But not all checked generic systems are coherent, including Swift.
- This is a language design choice.

{{% /note %}}

---

## Terminology decoder

| **Swift**   | **Rust**                     | **Carbon**                   |
| ----------- | ---------------------------- | ---------------------------- |
| protocol    | trait                        | interface                    |
| conformance | implementation <br> (`impl`) | implementation <br> (`impl`) |
| module      | crate                        | library                      |

{{% note %}}

- Continuing the terminology decoder ring from part 1, since we are going to
  talk about these languages again
- This last line describes the unit of dependency

{{% /note %}}

---

## Swift

{{% note %}}

- What can you do in Swift without restrictions?

{{% /note %}}

---

## Protocol conformance in Swift is not restricted

<div class="fragment" data-fragment-index="0">

- Module `MyGUI` defines a protocol `Renderable`

</div><div class="fragment" data-fragment-index="1">

- Module `Formatting` defines a type `FormattedString`

</div><div class="fragment" data-fragment-index="2">

- Module `Widgets` defines a conformance for type `FormattedString` to protocol
  `Renderable`
  - a _retroactive conformance_

</div>
<div class="r-stack" style="justify-content: start">
<div class="fragment fade-in-then-out" data-fragment-index="3">

- Application uses module `Widgets` to put a `FormattedString` into a dialog box
  from `MyGUI`
- User is happy that they can use the `MyGUI` and `Formatting` modules together,
  even though they were not aware of each other

</div>
<div class="fragment" data-fragment-index="4">

What if there were two widget modules that did this?

</div>
</div>

{{% note %}}

- Consider an example
- `<click>` The GUI module defines a protocol
- `<click>` The `Formatting` module defines a type
- `<click>` The `Widgets` module defines the conformance of that type to the
  protocol.
- This is called a "retroactive conformance," since the conformance is being
  provided by a separate module.
- `<click>` The application uses that `Widgets` module to use that conformance
- And we have this great result: a module was able provide the glue that allows
  two other independent modules to work together
- But what happens `<click>` if two modules both provide conformance for the
  same type and protocol?

{{% /note %}}

---

## What if two modules provide the same conformance?

<div class="fragment">

- Swift compiler tries to statically resolve the protocol implementation

</div><div class="fragment">

- Each module uses its own conformance

</div><div class="fragment">

- So far, no problem

</div>

{{% note %}}

- `<click>` Generally the Swift compiler will look for a conformance in the
  dependencies of the current file and uses that to instantiate generics
- `<click>` So each module will use its own conformance
- `<click>` Which is fine

{{% /note %}}

---

## Problems arise

What if the protocol was `Hashable`?

<div class="fragment">

- Now two ways to hash a single type

</div><div class="fragment">

```swift
Dictionary<AnyHashable, Int>
```

- Two entries in the hash table for the same value?
- Can't find a value in the table?

</div><div class="fragment">

- Hard to trigger this in practice
  - Have to pass objects between unrelated modules

</div>

{{% note %}}

- What if we have two modules interacting with the same hash table?
- `<click>` If each module has a different implementation of `Hashable` for a
  type
- `<click>` then you could end up with subtle bugs where the entries added by
  one module are not visible in the other
- `<click>` These problems are rare in practice, but they are pretty surprising
  and hard to debug when they do occur.

{{% /note %}}

---

## Problems arise

Having two retroactive conformances can cause similar problems in other
situations

<div class="fragment">

- Dynamic type test might find a different conformance of a type to a protocol

</div><div class="fragment">

- Some "foundation" types have their code compiled into shared objects provided
  by the OS
  - Conformances can live in both the shared object and the application

</div>

{{% note %}}

- A similar disconnect can arise `<click>` when using a dynamic type test to
  find a conformance
- `<click>` or when using shared libraries that contain a conformance that is
  also defined in the application

{{% /note %}}

---

## Regret

- Listed as
  [a "regret" in Jordon Rose's Swift retrospective](https://belkadan.com/blog/2021/11/Swift-Regret-Retroactive-Conformances/)
- There is now a Swift proposal in active review to add a warning
  ([SE-0364](https://github.com/apple/swift-evolution/blob/main/proposals/0364-retroactive-conformance-warning.md))
  - Will be able to suppress the warning with an annotation

{{% note %}}

- Allowing retroactive conformances was a regret in Swift designer Jordon Rose's
  retrospective
- and will be discouraged by a new warning that is being added to Swift

{{% /note %}}

---

## Rust

---

## Coherence in Rust

Trait coherence in Rust is achieved through rules that enforce two properties:

- no orphans
- no overlaps

{{% note %}}

- Rust has both orphan and overlap rules to get coherence.
- Other languages also have orphan and overlap rules for coherence, though the
  rules themselves vary.

{{% /note %}}

---

## First property: no orphans

- Property: each implementation is in crate that will definitely be imported if
  it is used
- _Orphan rules_: restrictions on **_where_** (which "crates") an implementation
  can be defined
- An implementation defined somewhere else is an _orphan_

{{% note %}}

- Orphan rules restrict **_where_** an implementation may be defined, to ensure
  that the implementation will be in some dependency whenever it is applicable
- Implementations anywhere else are called orphans, and are errors.

{{% /note %}}

---

## Terminology decoder

| **Swift**                   | **Rust**                     | **Carbon**                   |
| --------------------------- | ---------------------------- | ---------------------------- |
| protocol                    | trait                        | interface                    |
| conformance                 | implementation <br> (`impl`) | implementation <br> (`impl`) |
| module                      | crate                        | library                      |
| **retroactive conformance** | **orphan**                   | **orphan**                   |

{{% note %}}

- Adding one more line to the terminology decoder. The retroactive conformance
  term from Swift corresponds to an orphan in Rust or Carbon.

{{% /note %}}

---

## Second property: no overlaps

- Property: There will never be two implementations for the same type and trait
  combination
- Two implementations that apply to the same type and trait is an _overlap_
- Overlap rules: restriction on **_whether_** an implementation is allowed at
  all

{{% note %}}

- Rust also has an overlap rule saying no two implementations may apply at the
  same time.
- This is about as restrictive an overlap rule as you can have.
- Overlap rules in other languages can be less restrictive, such as in Carbon.
- It means that some implementations are not allowed at all, since they could
  conflict with implementations allowed in other libraries.

{{% /note %}}

---

{{< slide auto-animate="" auto-animate-duration=0.5 >}}

## Example

<div id="hashtable">

`Hashtable` crate:

<pre data-id="hashtable-code"><code class="language-rust" data-trim data-line-numbers>
pub trait Hash { ... }
</code></pre>

</div>

<div id="company">

`Company` crate:

<pre data-id="company-code"><code class="language-rust" data-trim data-line-numbers>
pub struct Employee { ... }
</code></pre>

</div>

{{% note %}}

- I'm going to illustrate these rules using an example where a trait and type
  are in different crates.

{{% /note %}}

---

{{< slide auto-animate="" auto-animate-duration=0.5 >}}

## Local type: allowed

<div id="hashtable">

`Hashtable` crate:

<pre data-id="hashtable-code"><code class="language-rust" data-trim data-line-numbers>
pub trait Hash { ... }
</code></pre>

</div>

<div id="company">

`Company` crate:

<pre data-id="company-code" style="overflow: visible"><code class="language-rust" data-trim data-line-numbers>
use Hashtable::Hash;
pub struct `<0>Employee` { ... }
impl Hash for `<0>Employee` { ... }
</code></pre>

</div>

{{% note %}}

- If the crate with the type depends on the crate with the trait, then `<click>`
  you can define the implementation with the type.
- The rule is that an implementation with a local type is allowed
- where "local" means "defined in the same crate"

{{% /note %}}

---

{{< slide auto-animate="" auto-animate-duration=0.5 >}}

## Local trait: allowed

<div style="visibility: hidden">

`Hashtable` crate:

<pre><code class="language-rust" data-trim data-line-numbers>
pub trait Hash { ... }
</code></pre>

</div>

<div id="company">

`Company` crate:

<pre data-id="company-code"><code class="language-rust" data-trim data-line-numbers>
pub struct Employee { ... }
</code></pre>

</div>

<div id="hashtable">

`Hashtable` crate:

<pre data-id="hashtable-code" style="overflow: visible"><code class="language-rust" data-trim data-line-numbers>
use Company::Employee;
pub trait `<0>Hash` { ... }
impl `<0>Hash` for Employee { ... }
</code></pre>

</div>

{{% note %}}

- If dependency is in the other direction, then you can define an `<click>`
  implementation with a local **_trait_**.

{{% /note %}}

---

## Orphan, not allowed

<div class="col-container">
<div class="col">
<!-- workaround for code font -->

`Hashtable` crate:

```rust

pub trait Hash { ... }

```

</div>
<div class="col">
<!-- workaround for code font -->

`Company` crate:

```rust

pub struct Employee { ... }

```

</div>
</div>

<!-- FIXME: chandlerc@ Make this 3/4-width and centered -->

<div class="col-container">
<div class="col">
<!-- workaround for code font -->

`HashForEmployee` crate:

```rust
use Hashtable::Hash;
use Company::Employee;
impl Hash for Employee { ... }
```

</div>
</div>

<div class="fragment">

## ❌

</div>

{{% note %}}

- An implementation in a separate crate is an orphan, and `<click>` not allowed.

{{% /note %}}

---

## Local trait or local type -> not an orphan

- Only crates that (transitively) depend on _both_ `Hash` and `Employee` can
  possibly use this implementation
- Dependency relationship between the `Hash` and `Employee` crates determines
  which crate can define the implementation
  - If there isn't a dependency relationship, no crate can define that
    implementation

{{% note %}}

- Since the only crates that could use an implementation must depend on both the
  type and the trait, this achieves the coherence property we were looking for
- Notice how the dependency relationship between the trait and type libraries
  determines where, and even if, the implementation can be defined.

{{% /note %}}

---

## Generic types, traits, and implementations

- Things get more complicated when talking about generic (meaning
  "parameterized") types, traits, and implementations
  - Particularly if you want to allow libraries to evolve
- [Rust RFC #1023 Rebalancing Coherence](https://github.com/rust-lang/rfcs/blob/master/text/1023-rebalancing-coherence.md)
  says:

> The problem is that due to coherence, the ability to define impls is a
> zero-sum game: every impl that is legal to add in a child crate is also an
> impl that a parent crate cannot add without fear of breaking downstream
> crates.

{{% note %}}

- Once we add parameterization in the mix, things get quite a bit more
  complicated.
- The problem is now multiple implementations could apply to a specific trait
  and type combination, and if we are to allow independently developed crates to
  be used together, we need to add restrictions to prevent overlaps.
- To quote one of the Rust coherence proposals: `<click>`

> every impl that is legal to add in a child crate is also an impl that a parent
> crate cannot add

{{% /note %}}

---

## Generic types, traits, and implementations

- Things get more complicated when talking about generic (meaning
  "parameterized") types, traits, and implementations
  - Particularly if you want to allow libraries to evolve
- [Rust RFC #1023 Rebalancing Coherence](https://github.com/rust-lang/rfcs/blob/master/text/1023-rebalancing-coherence.md)
  says:

> The problem is that due to coherence, the ability to define impls is a
> zero-sum game: <b>every impl that is legal to add in a child crate is also an
> impl that a parent crate cannot add</b> without fear of breaking downstream
> crates.

{{% note %}}

> every impl that is legal to add in a child crate is also an impl that a parent
> crate cannot add

{{% /note %}}

---

## Blanket implementations

- Consider an implementation of the `Hash` trait for _any_ type that implements
  `Serialize`

  - `impl<T> Hash for T where T: Serialize`

- This is called a _blanket implementation_

<div class="fragment">

- Must be defined in the crate with the `Hash` trait

</div><div class="fragment">

- Compiler will reject two different blanket implementations for the `Hash`
  trait when compiling the crate defining `Hash`
- Otherwise there might be a type where both blanket implementations apply,
  breaking the overlap rule

</div>

{{% note %}}

- For example, lets say we have an implementation of a trait for any type
  satsifying a criteria, which is called a "blanket implementation".
- Maybe this implementation serializes the type to a string, and then computes
  the hash from that.
- `<click>` The orphan rules require this implementation to be local to the
  trait.
- `<click>` Which allows the compiler to do a local check that there aren't two
  blanket implementations that could overlap.

<!-- https://stackoverflow.com/questions/73782573/why-do-blanket-implementations-for-two-different-traits-conflict -->

{{% /note %}}

---

## Blanket implementations and evolution

- A blanket implementation for trait `Hash` means no other crate can define
  implementations of `Hash` for any type implementing `Serialize`

<div class="fragment">

- Fine if the blanket implementation is created at the same time as the trait

</div><div class="fragment">

- Adding a blanket implementation _later_ might break downstream dependencies /
  child crates
  - a backwards-incompatible change

</div>

{{% note %}}

- But even if that blanket implementation is legal, it could conflict with an
  implementation in a child crate.
- `<click>` Of course no child crate can add a conflicting implementation if the
  blanket implementation exists from the start
- `<click>` but adding it later is an incompatible change

{{% /note %}}

---

## Issue: no way to pick between conflicting implementations

- So far no _specialization_ rule in stable Rust
- With a specialization rule, a more-specific implementation in a child crate
  would override instead of conflicting with the blanket implementation
- A specialization rule can be coherent as long as the specific implementation
  chosen for a trait and type combination is the same across the whole program

{{% note %}}

- The problem is Rust has no way to resolve conflicts
- Right now no _specialization_ rule has made it into stable Rust
- A specialization rule would mean that the compiler could pick the
  more-specific implementation instead of reporting an error
- This kind of rule can be coherent as long as the answer to implementation
  queries is consistent across the whole program

{{% /note %}}

---

## Rust's coherence rules have some complexity

- Rust's orphan and overlap rules have
  [evolved with time](https://github.com/Ixrec/rust-orphan-rules/issues/1) to
  allow more implementations to be written
- The order of parameters can matter
  - The "first" local type has to "cover" earlier types
- Different rules for "fundamental" types and traits

<div class="footnote">
<!-- chandlerc FIXME: Style this better -->

[Rust RFC 2451: Re-rebalancing coherence](https://rust-lang.github.io/rfcs/2451-re-rebalancing-coherence.html#concrete-orphan-rules)

</div>

{{% note %}}

- Can tell something from the name "Re-rebalancing coherence" about how the
  rules in Rust have changed with time.
- Those changes have added complexity in order to carve out more cases where an
  implementation can be written without risking overlap with other libraries.
- These rules make the order of parameters potentially significant.

{{% /note %}}

---

## Carbon

{{% note %}}

- Now lets compare with Carbon.

{{% /note %}}

---

## Simpler coherence rules by supporting specialization

- Can have two implementations that apply, as long as we can choose between them
  coherently
- Need: all relevant implementations are in the transitive dependencies
- Accomplish this by requiring an implementation to have something local in the
  type or interface

{{% note %}}

- For Carbon, we are leaning into specialization in our coherence story, so we
  can pick between overlapping implementations
- This both simplifies the rules, and imposes fewer restrictions.
- To do this consistently, the same set of implementations needs to be visible
  any time we are querying to find an implementation.
- Much like Rust, we get this by enforcing an orphan rule that requires part of
  the impl declaration to be local.

{{% /note %}}

---

## Orphan rule in Carbon

Local type => allowed:

```carbon
import HashTable;
class Employee;
impl `Employee` as HashTable.Hash;
```

---

## Orphan rule in Carbon

Local interface => allowed:

```carbon
interface IntLike;
impl i32 as `IntLike`;

```

---

## Orphan rule in Carbon

Local type parameter => allowed:

```carbon
import HashTable;
class Employee;
impl Vector(`Employee`) as HashTable.Hash;
```

---

## Orphan rule in Carbon

Local interface parameter => allowed:

```carbon
class BigInt;
impl i32 as AddWith(`BigInt`);

```

{{% note %}}

- Implementing the `AddWidth` interface is how you overload the plus operator.

{{% /note %}}

---

## Orphan rule in Carbon

Nothing local => orphan:

```carbon

impl i32 as AddWith(bool);

```

<div class="fragment">

❌ orphan!

</div>

{{% note %}}

- All of these types and interfaces are built into Carbon
- There is nothing forcing this library to be imported in the cases where this
  implementation applies
- So nothing local
- `<click>` and this is an orphan error

{{% /note %}}

---

## Orphan rule in Carbon

Local constraint => insufficient, orphan:

```carbon
interface IntLike;
class BigInt;
impl forall [T:! `<0>IntLike`,
             U:! ImplicitAs(`<1>BigInt`)]
    T as AddWith(U);
```

<div class="fragment" data-fragment-index="2">

❌ orphan!

</div>

{{% note %}}

- In this example, the constraints on the type parameters use a `<click>` local
  interface and `<click>` a local type.
- But, there is nothing forcing this library to be imported in the cases where
  this implementation applies
- So `<click>` this is an orphan error as well.

{{% /note %}}

---

## Orphan rule in Carbon

- An `impl` declaration is allowed as long as anything in the type or interface
  is local

<div class="fragment">

- Since Carbon doesn't have circular dependencies, this requirement can only be
  satisfied in at most a single library

</div>

{{% note %}}

- The orphan rule in Carbon can be stated succinctly:
  - An implementation is allowed as long as anything in the type or interface
    part of the declaration is local
- `<click>` The orphan rule restricts any given implementation to at most a
  single library
- This is just like we saw earlier with Rust, and follows from circular
  dependencies being forbidden.

{{% /note %}}

---

## Trade off: coherence reduces surprise but gives less flexibility

- What do we do when we want to make two independent libraries work together?

{{% note %}}

- This is a trade off in the language design, coherence reduces surprise but
  gives users less flexibility about where they can define their
  implementations.
- For Carbon, coherence aligns well with our priorities of having:
  - very predictable behavior,
  - low context sensitivity, and
  - supporting local reasoning.
- So then what happens when we have two independent libraries that we want to
  combine, like we could with Swift?

{{% /note %}}

---

## Carbon: using independent libraries

<div class="col-container">
<div class="col">

```carbon
package GUI;

interface `<0>Renderable` { ... }

fn DrawAt[T:! `<0>Renderable`]
    (x: i32, y: i32, p: T*);
```

</div>
<div class="col">

```carbon
package Formatting;

class `<1>FormattedString` {
  fn Make(s: String) -> Self;
  // ...
}
```

</div>
</div>

<div style="z-index: -1; position: relative;">

```carbon
import GUI;
import Formatting;

fn Run() {
  var t: auto = Formatting.FormattedString.Make("...");
  GUI.DrawAt(200, 100, `<2>&t`);
}


```

</div>

<div class="fragment" data-fragment-index="2">

❌ Error: `Formatting.FormattedString` does not implement `GUI.Renderable`

</div>

---

## Carbon: using independent libraries

<div class="col-container">
<div class="col">

```carbon
package GUI;

interface Renderable { ... }

fn DrawAt[T:! Renderable]
    (x: i32, y: i32, p: T*);
```

</div>
<div class="col">

```carbon
package Formatting;

class FormattedString {
  fn Make(s: String) -> Self;
  // ...
}
```

</div>
</div>

```carbon
import GUI;
import Formatting;

impl `<0>Formatting.FormattedString as GUI.Renderable` { ... }

fn Run() {
  var t: auto = Formatting.FormattedString.Make("...");
  GUI.DrawAt(200, 100, &t);
}
```

<div class="fragment" data-fragment-index="0">

❌ Error: orphan `impl`

</div>

---

## Adapters to use independent libraries

<div class="col-container">
<div class="col">

```carbon
package GUI;

interface Renderable { ... }

fn DrawAt[T:! Renderable]
    (x: i32, y: i32, p: T*);
```

</div>
<div class="col">

```carbon
package Formatting;

class FormattedString {
  fn Make(s: String) -> Self;
  // ...
}
```

</div>
</div>

<div class="col-container">
<div class="col">

```carbon
import GUI;
import Formatting;

class FormattedString {
  `<2>extend` `<0>adapt Formatting.FormattedString;`
}
impl `<3>FormattedString` as GUI.Renderable { ... }

fn Run() {
  var t: `<1>FormattedString = Formatting.FormattedString.Make("...")`;
  GUI.DrawAt(200, 100, &t);
}
```

</div>
</div>

{{% note %}}

- The solution is to use `<click>` an adapter type.
- An adapter has the same data representation as the type it adapts, and
  `<click>` so you can cast between them, including pointers to those types,
  freely.
- This is using `<click>` the `extend` keyword from part 1 of this talk to
  include the API of the original type, much like a base class.
- Now `<click>` we can implement the interface for this local type.

{{% /note %}}

---

## There are other ways of addressing this problem

<!--
- OPTIONAL/SKIPPABLE: Rust has two workarounds for this problem:
  - Can create new types, but no adapter feature so you may have to write a lot
    of forwarding functions
  - Can use conditonal compilation (called _Cargo features_) to have
    dependencies between libraries only when both are present
-->

{{% note %}}

- There are other ways of addressing this problem, which helps offset the costs
  of coherence.
- Most of what I've been telling you is Carbon's contribution in this space.

{{% /note %}}

---

{{< slide visibility="hidden" >}}

## Options for the future if this isn't enough

- "This library must be imported (or is automatically imported) anytime these
  two others are"
  - Would have to be part of a consistent configuration of the whole binary
- Similar concern: low level library exports API but does not provide an
  implementation for it
  - Example: memory allocator, logger
  - Could be used to break dependency cycles
  - In C++ this can be sorted out at link time
- In Rust, libraries can use
  [Cargo "features"](https://doc.rust-lang.org/cargo/reference/features.html) to
  _optionally_ depend on another library, and conditionally compile the
  implementation of a trait in that other library

<!-- a bit about coherence of type APIs too? -->

---

## Different solutions to coherence

- C++: the one definition rule (ODR)
  - violations leave the program ill-formed, no diagnostic required
- Swift: no coherence
  - has the "what if two modules did that?" problem
  - adding a warning
- Rust: enforced coherence
  - complex, restrictive rules to ensure no overlap between implementations
- Carbon: enforced coherence
  - simpler, more permissive rules
  - overlap resolved by a specialization rule

{{% note %}}

In summary:

- C++ requires consistent definitions, but may not diagnose violations
- Swift has not enforced coherence, which has led to problems, and is now adding
  a warning
- Rust does enforce coherence, but has a no-overlap rule that imposes complex
  restrictions on which implementations may be defined
- Carbon enforces coherence with a simpler rule that allows more
  implementations. This hinges on resolving overlaps using a specialization rule

Which brings us to our next problem

{{% /note %}}
