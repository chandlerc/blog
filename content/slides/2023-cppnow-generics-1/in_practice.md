+++
weight = 50
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# What do checked generics look like in practice?

---

## Generic means "parameterized"

- Includes template generics and checked generics
- Generic parameters are supplied at compile time
- Often the parameters are types, or can only be types

{{% note %}}

- When I say the word "generic" I mean adding parameterization to language
  constructs; and that includes both template and checked parameters
- The parameter to the generic, or "generic parameter", will be known at compile
  time, at least for all the high-performance relatively static languages I'm
  going to talk about today.
- Generally those parameters will be types, and some languages don't even
  support non-type generic parameters.

{{% /note %}}

---

## For comparison, what do template generics with C++20 concepts look like?

{{% note %}}

- Lets start with C++ templates and concepts you are more likely to be familiar
  with.

{{% /note %}}

---

## C++ example: defining a concept

```cpp{3-6}
#include <concepts>

template<typename T>
concept `RNGConcept` = requires(T a) {
    { `a.random()` } -> std::same_as<typename `T::result_t`>;
};

class BaseRNGClass { ... };

class FancyRNG : public BaseRNGClass {
 public:
  typedef double result_t;
  auto random() -> double { ... }
};

template<RNGConcept T>
auto GenericFunction(T r) -> T::result_t {
  return r.random();
}

auto CallsGeneric(FancyRNG r) -> double {
  return GenericFunction(r);
}
```

{{% note %}}

- This will be a running example, where I will show things first using C++
  concepts, and later show how the analogous constructs look in some languages
  with checked generics.
- It is using a concept called `<click>` `RNGConcept`
- that requires `<click>` the type has a method named `random`
- with return type `<click>` equal to a member type named `result_t`
- Of course, since this is just about expression validity, it could be satisfied
  by having a field with a callable functor type instead of a method

{{% /note %}}

---

## C++ example: a type implementing the concept

```cpp{10-14}
#include <concepts>

template<typename T>
concept RNGConcept = requires(T a) {
    { a.random() } -> std::same_as<typename T::result_t>;
};

class BaseRNGClass { ... };

class FancyRNG : public BaseRNGClass {
 public:
  `<1>typedef double result_t`;
  auto `<0>random() -> double` { ... }
};

template<RNGConcept T>
auto GenericFunction(T r) -> T::result_t {
  return r.random();
}

auto CallsGeneric(FancyRNG r) -> double {
  return GenericFunction(r);
}
```

{{% note %}}

- The type `FancyRNG` satisfies the `RNGConcept`
- `<click>` since it has a matching `random` method
- `<click>` and member type `result_t`

{{% /note %}}

---

## C++ example: a generic function

```cpp{16-19}
#include <concepts>

template<typename T>
concept RNGConcept = requires(T a) {
    { a.random() } -> std::same_as<typename T::result_t>;
};

class BaseRNGClass { ... };

class FancyRNG : public BaseRNGClass {
 public:
  typedef double result_t;
  auto random() -> double { ... }
};

template<`<1>RNGConcept` T>
auto `<0>GenericFunction(T r)` -> T::result_t {
  return r.random();
}

auto CallsGeneric(FancyRNG r) -> double {
  return GenericFunction(r);
}
```

{{% note %}}

- `<click>` `GenericFunction` can be called with `<click>` any type that
  satisfies `RNGConcept`

{{% /note %}}

---

## C++ example: calling a generic function

```cpp{21-23|4,10,21-23|17,21-23}
#include <concepts>

template<typename T>
concept RNGConcept = requires(T a) {
    { a.random() } -> std::same_as<typename T::result_t>;
};

class BaseRNGClass { ... };

class FancyRNG : public BaseRNGClass {
 public:
  typedef double result_t;
  auto random() -> double { ... }
};

template<RNGConcept T>
auto GenericFunction(T r) -> T::result_t {
  return r.random();
}

auto CallsGeneric(FancyRNG r) -> double {
  return GenericFunction(r);
}
```

{{% note %}}

- Calling a generic function _looks_ like calling any other function
  - As long as the type parameters can be deduced from the types of the
    arguments
- Since this is templates, this is both where the compiler checks that `<click>`
  `FancyRNG` satisfies the `RNGConcept` concept, and `<click>` where
  `GenericFunction` is type checked for the first time.

{{% /note %}}

---

## Languages with checked generics are going to have similar facilities

{{% note %}}

- Now switching to languages with checked generics, they are going to have
  analogous language constructs.

{{% /note %}}

---

## Generic functions

- Generic parameters are used in the signature

```cpp
template<RNGConcept `<0>T`>
auto GenericFunction(`<0>T` r) -> `<0>T`::result_t {
  return r.random();
}
```

<!--
- Often those parameters are deduced from the types of the arguments at the call
  site
  - Means generic functions may be substituted in without changing callers
-->

{{% note %}}

- They will support generic functions with `<click>` parameters that can affect
  argument or return types

{{% /note %}}

---

## Generic types

- Often the generic parameters are listed explicitly when naming the type
  (`vector<int>`)
  - Can be deduced, as in the case of C++'s
    [class template argument deduction (CTAD)](https://en.cppreference.com/w/cpp/language/class_template_argument_deduction)
- The generic parameters are used in the method signatures and field types

{{% note %}}

- They will support generic types. More commonly the values of the generic
  arguments will be written explicitly as in `vector<int>`
- but like C++'s class template argument deduction, some languages support
  omitting them when they can be deduced
- The use of those parameters in method signatures and field types will be much
  the same as in C++

{{% /note %}}

---

## **_Checked_** generic means the parameters are **_constrained_**

```cpp
template<`RNGConcept` T>
auto GenericFunction(T r) -> T::result_t {
  return r.random();
}
```

- Can have constraints without fully typechecking
  - C++20 concepts
  - The constraints define the _minimum_ provided by the _caller_
- But can't have typechecking without the constraints
  - The constraints define the _maximum_ the _callee_ can rely on
  - Using anything else is a type error in the definition

{{% note %}}

- The big difference with checked generics is the role constraints play.
- With unchecked generics, constraints can just be used to specify what the
  caller has to provide.
- `<`click`>` For example, a C++20 concept can be used as a constraint on a
  template parameter
- This is an add-on though, C++ has had templates for much longer than concepts.
- But for checked generics, typechecking the body of a function **depends** on
  the constraint to say what operations are allowed to be used with that type.

{{% /note %}}

---

## Interfaces

The building blocks of constraints

| **C++**       | **Swift** | **Rust** | **Carbon** |
| ------------- | --------- | -------- | ---------- |
| C++20 concept | protocol  | trait    | interface  |

```cpp
template<typename T>
concept RNGConcept = requires(T a) {
    { a.random() } -> std::same_as<typename T::result_t>;
};
```

- Two approaches: structural and nominal

{{% note %}}

- Since constraints are so important to checked generics, the building blocks
  for constraints also play a larger role.
- These are the analog of C++20 concepts for checked generics, which Swift calls
  "protocols", Rust calls "traits", and Carbon calls "interfaces"
- There are two different approaches here, called structural and nominal. The
  difference is in **_how_** a type can satisfy or conform to the interface.

{{% /note %}}

---

## Structural interfaces

If you have these methods, with these signatures, then you satisfy this
interface

- C++ concepts are an extreme version of structural
  - specified code has to somehow be valid

{{% note %}}

- Structural means a type matching an interface is implicit, based on having the
  expected set of members.
- C++ concepts goes all the way to duck typing

{{% /note %}}

---

## Nominal interfaces

There is an explicit statement -- by name -- that a type satisfies a requirement

- In C++, inheriting from a base class works nominally. A class having the
  methods of another class is not enough to cast a pointer between the two
  types.
- In some languages, the implementation of an interface for a type is a separate
  definition.

{{% note %}}

- Nominal means explicit. Well, nominal really means named. In languages with
  nominal interfaces, there is some form of explicit declaration using names.
- This is like base classes in C++ -- you have to mention the base class in the
  class declaration otherwise you can't convert pointers between those types.
- Sometimes this explicit implementation statement is part of the class
  declaration, like a base class; for other languages it is a separate
  "implementation" declaration.
- In addition to methods, interfaces can also contain types `<`click`>`

{{% /note %}}

---

## Associated types

```cpp{3-6,12}
#include <concepts>

template<typename T>
concept RNGConcept = requires(T a) {
    { a.random() } -> std::same_as<typename `<0>T::result_t`>;
};

class BaseRNGClass { ... };

class FancyRNG : public BaseRNGClass {
 public:
  typedef double `<0>result_t`;
  auto random() -> double { ... }
};
```

{{% note %}}

- `<click>` `result_t` is the analog of an associated type

{{% /note %}}

---

## Associated types

- Associated types are types that an interface implementation must define
  - for example: `value_type` and `iterator` of C++ containers
  - allow the signature of methods in the interface to vary

<div class="fragment">

- Associated types have their own constraints
  - If the `iterator` associated type has constraint `ForwardIterator`, then a
    generic function using an iterator can only use the methods of
    `ForwardIterator`
  - A generic function might only accept containers if the associated type
    `value_type` is `String`, or if it implements `Printable`

</div>

{{% note %}}

- Just like the implementation of an interface provides methods defining
  behavior, the implementation can also provide the types that appear in the
  signatures of those methods.
- Think of how every C++ container has `value_type` and `iterator` member types
  that are used in the `front()` and `begin()` methods
- `<click>` In order to typecheck uses of those methods, we need to give those
  associated types constraints.
- So if a generic function calls `begin()` on the container, it is going to get
  an iterator, but the only things that can be done with that iterator are the
  methods defined by the constraint on the iterator associated type.
- If that constraint is that it is a `ForwardIterator`, only those methods
  defined in `ForwardIterator` may be used.
- If a generic function wants to do more, it can impose additional constraints
  on the associated types.
- Again, checking generic code is reliant on the type information that the
  constraints give you.

{{% /note %}}

---

## Generic interfaces

Some languages allow interfaces to be parameterized as well

```cpp
template<typename T, `typename U`>
concept Pow = requires(T a, U b) {
    { a.pow(b) } -> std::same_as<typename T::result_t>;
};

template<Pow`<int>` T>
auto GenericFunction(T r) -> T::result_t {
  return r.pow(2);
}
```

{{% note %}}

- We can also parameterize interfaces
- C++ concepts supports adding a type parameter, like this `Pow` example that
  has `<click>` a type parameter representing the method's parameter type.
- Seen here in both the concept definiton and `<click>` its use as a constraint

{{% /note %}}

---

## Generic interfaces

- Some languages allow interfaces to be parameterized as well
  - `Pow<T>`: type can be raised to a power of type `T`
  - very useful for representing operator overloading
- Allows a type to implement an interface multiple times
  - `Pow<unsigned>` and `Pow<float>` are different
- Interface parameters are _inputs_
  - they have to be specified when naming an interface
- Associated types are _outputs_
  - they are determined by the implementation selected

{{% note %}}

- By parameterizing an interface, you allow a type to implement it multiple
  times, with different argument values.
- An interface parameter is an input: you can tell since you have to pass a
  value in the argument list.
- The values of the interface parameters determine the implementation
- and the implementation determines the associated types
- So `Pow<unsigned>` and `Pow<float>` might have different result types

{{% /note %}}

---

## Hold on, there were _two_ inputs

```cpp
template<`<0>typename T`, typename U>
concept Pow = requires(`<0>T a`, U b) {
    { a.pow(b) } -> std::same_as<typename T::result_t>;
};
```

- The first input type parameter is often called the _Self type_, and is often
  implicit
- Gives expressivity beyond pure inheritance

{{% note %}}

- Wait a minute!
- In that `Pow` concept, there were _two_ type parameters.
- `<click>` The first parameter represents the type being constrained.
- In C++, it is implicit at the use site, but in other languages it isn't even
  listed in the parameter list.
- It allows you to express signatures beyond what a base class can do.
- For example: binary operations on a type, such as "comparison to self" or "add
  with self"

{{% /note %}}

---

## Generic implementations

- This _family_ of types implements this interface
- Or this interface with a range of arguments
- Can express language mechanisms that are often hard-coded in languages without
  generics
  - Simpler, more uniform
- Some languages, such as C++ support _specialization_
  - When two implementations apply, use the more specific one
  - More about specialization in part 2

<!--

  - Example: Here is a way to print a vector of type `T` for any `T` that is
    printable
  - Example: Any type implementing `Ordered` also implements `PartiallyOrdered`
    - This is a _blanket implementation_
-
  - Example: `BigInt` implements `AddWith(T)` for any `T` that can be converted to
    an int
- Or their combination
  - Example: Can convert `Optional(T)` to `Optional(U)` if there is a conversion
    from `T` to `U`

-->

{{% note %}}

- Implementations may be parameterized as well, and this ends up being very
  expressive.
- For example, this could be used to implement the fallback behavior for
  comparisons in C++20 in a library
- Chandler will talk more about this later

{{% /note %}}

---

## What do checked generics look like?

- in Swift
- in Rust
- in Carbon

{{% note %}}

- I have looked most closely at Swift, Rust, and Carbon, so I'm going to show
  you what checked generics look like in those languages.

{{% /note %}}
