+++
weight = 110
outputs = ["Reveal"]
+++

# Rust

---

## Rust example: defining a trait

```rust{1-4}
pub trait RNGTrait {
  `type Result;`
  `fn random(&mut self) -> Self::Result;`
}

pub struct BaseRNG { ... }

pub struct FancyRNG {
  base: BaseRNG,  // no inheritance
}
impl RNGTrait for FancyRNG {
  type Result = f64;
  fn random(&mut self) -> f64 { ... }
}

fn generic_function<T: RNGTrait>(r: &mut T) -> T::Result {
  return r.random();
}
```

{{% note %}}

- Rust interfaces are called "traits"
- `<`click`>` This is an associated type declaration
- `<`click`>` And a mutating method declaration

{{% /note %}}

---

## Rust example: a type implementing to a trait

```rust{8-15}
pub trait RNGTrait {
  type Result;
  fn random(&mut self) -> Self::Result;
}

pub struct BaseRNG { ... }

pub struct FancyRNG {
  base: BaseRNG,  // no inheritance
}
`impl RNGTrait for FancyRNG` {
  type Result = f64;
  `fn random(&mut self) -> f64` { ... }
}

fn generic_function<T: RNGTrait>(r: &mut T) -> T::Result {
  return r.random();
}
```

{{% note %}}

- Traits are nominal
- `<`click`>` Implementations of traits are separate from the type and its
  fields
- `<`click`>` All the methods in a trait implementation end up in the type's
  API
  - `random` ends up as part of `FancyRNG`'s API

<!--
- All methods are in some trait
    - there is a special unnamed trait for each type that has the methods that
      aren't in any other trait
- Name lookup for a type's members looks at all traits that type is known to
  implement in the current scope
-->

{{% /note %}}

---

## Rust example: a generic function

```rust{16-18}
pub trait RNGTrait {
  type Result;
  fn random(&mut self) -> Self::Result;
}

pub struct BaseRNG { ... }

pub struct FancyRNG {
  base: BaseRNG,  // no inheritance
}
impl RNGTrait for FancyRNG {
  type Result = f64;
  fn random(&mut self) -> f64 { ... }
}

fn generic_function<`T: RNGTrait`>(r: &mut T) -> `T::Result` {
  return r.random();
}
```

{{% note %}}

- Here is a generic function
- `<`click`>` Generic type parameter declarations are in angle brackets
- `<`click`>` Returning the associated type

{{% /note %}}

---

## Rust has been adding some advanced features

Recent releases have added support for:

- generic _associated types_
- non-type parameters
  - called "const generics" in Rust

{{% note %}}

- Rust focuses more heavily on the expressiveness of its generics system and has
  recently added some advanced features.
- Generic associated types, meaning parameterized associated types, are a bit
  like when a C++ member type is itself parameterized like a templated member
- Const generics in Rust are like non-type parameters in C++
- Both of these features have been shipped in an early form and expect to be
  developed further.

{{% /note %}}

---

## Some things Rust does not do

- Variadics only through macros

  - [Draft RFC: variadic generics #376, last comment Apr 30, 2021](https://github.com/rust-lang/rfcs/issues/376#issuecomment-830034029):

  > There's been several attempts over the years and it doesn't seem like it's
  > going to happen again any time soon, sorry.

- Specialization desired, but hard to land due to legacy

{{% note %}}

- (read the slide)
- Specialization is discussed more in part 2

{{% /note %}}
