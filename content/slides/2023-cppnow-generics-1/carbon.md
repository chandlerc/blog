+++
weight = 130
outputs = ["Reveal"]
+++

# Carbon

{{% note %}}

- Lastly, I will show you how this example looks in Carbon.

{{% /note %}}

---

## Carbon example: defining an interface

```carbon{1-4}
interface RNGInterface {
  `let Result: type;`
  `fn Random[addr self: Self*]() -> Result;`
}

class BaseRNGClass { ... }

class FancyRNG {
  extend base: BaseRNGClass;
  extend impl as RNGInterface where .Result = f64 {
    fn Random[addr self: Self*]() -> f64 { ... }
  }
}

fn GenericFunction[T:! RNGInterface](r: T*) -> T.Result {
  return r->Random();
}
```

{{% note %}}

- This is an interface definition in Carbon
- `<`click`>` Associated type declaration
- `<`click`>` Mutating method declaration

{{% /note %}}

---

## Carbon example: implementing an interface

```carbon{8-13}
interface RNGInterface {
  let Result: type;
  fn Random[addr self: Self*]() -> Result;
}

class BaseRNGClass { ... }

class FancyRNG {
  `<1>extend` `<2>base: BaseRNGClass`;
  `<1>extend` `<0>impl as RNGInterface` where .Result = f64 {
    `<3>fn Random[addr self: Self*]() -> f64` { ... }
  }
}

fn GenericFunction[T:! RNGInterface](r: T*) -> T.Result {
  return r->Random();
}
```

{{% note %}}

- Next I'll show how interfaces are implemented for types.
- Interfaces are nominal in Carbon
- `<`click`>` A type implements an interface in a separate `impl` definition,
  though unlike Rust it may appear in the class definition.
- `<`click`>` Name lookup is only into things mentioned in the class definition
  using the `extend` keyword
- `<`click`>` It is used for inheritance and is optional for implementations
- `<`click`>` With the `extend` keyword, the `Random` function from the
  `RNGInterface` is part of the class' API

<!--
- `<`click`>` and a `where` clause is used to specify the value of the
  associated type
-->

{{% /note %}}

---

## Carbon example: generic function

```carbon{15-17}
interface RNGInterface {
  let Result: type;
  fn Random[addr self: Self*]() -> Result;
}

class BaseRNGClass { ... }

class FancyRNG {
  extend base: BaseRNGClass;
  extend impl as RNGInterface where .Result = f64 {
    fn Random[addr self: Self*]() -> f64 { ... }
  }
}

fn GenericFunction`[T:! RNGInterface]``(r: T*)` -> T.Result {
  return r->Random();
}
```

{{% note %}}

- Here is a generic function
- Type parameters in Carbon are either always deduced, `<`click`>` declared in
  the square brackets, or never deduced, and `<`click`>` declared in the round
  parens.

{{% /note %}}

---

## Carbon example: generic function

```carbon{15-17}
interface RNGInterface {
  let Result: type;
  fn Random[addr self: Self*]() -> Result;
}

class BaseRNGClass { ... }

class FancyRNG {
  extend base: BaseRNGClass;
  extend impl as RNGInterface where .Result = f64 {
    fn Random[addr self: Self*]() -> f64 { ... }
  }
}

fn GenericFunction[T`:!` RNGInterface](r: T*) -> `T.Result` {
  return r->Random();
}
```

{{% note %}}

- `<`click`>` The `:!` is what marks this parameter as a compile-time generic
  parameter
- `<`click`>` and here it uses an associated type for the return type

{{% /note %}}

---

## Carbon

- Supports checked **_and_** template generics
  - Checked generics use nominal "interfaces"
  - Template generics work like C++ templates
  - Template generics may be constrained
  - They can call each other

<div class="fragment">

- Supports interface implementation specialization from the start

</div>
<div class="fragment">

- Supports checked-generic variadics

</div>
<div class="fragment">

- Is _new_! Everything is a work in progress
  - benefiting from the experience of other languages

</div>

{{% note %}}

Don't hurry this slide!

- Carbon supports checked **_and_** template generics
  - Checked generics use nominal "interfaces" as I just showed
  - Template generics work like C++ templates, directly instantiated on the type
    - may be constrained like C++20 concepts
  - They can call each other, in either direction
- This is probably the biggest differentiator of Carbon
- `<click>` Supports interface implementation specialization from the start
  - more about that in part 2
- `<click>` Also checked-generic variadics
- `<click>` But of course Carbon is still very new and all of this is a work in
  progress
- We think that by learning from other languages that we can build an even
  better generics system.

{{% /note %}}
