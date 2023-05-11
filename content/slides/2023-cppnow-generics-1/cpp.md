+++
weight = 70
outputs = ["Reveal"]
+++

# Reminder: C++20 concepts

---

{{< slide visibility="hidden" >}}

## C++20 concepts are only constraints on the caller

- So templated function bodies are not "checked" until they are called
- Can be used to select between overloads

---

{{< slide visibility="hidden" >}}

## C++20 concepts are generally structural

- Types "satisfy" a concept if
  - certain expressions are valid, or
  - valid and have a specified type
- A fit for there being multiple ways to make something valid
  - Example: operators (or `begin`/`end`) can be overloaded with methods or free
    functions
- Support for specialization
  - "Ad hoc": nothing enforces that a specialization has the same API

<!-- https://en.cppreference.com/w/cpp/language/constraints -->

---

{{< slide visibility="hidden" >}}

## However _subsumption_ is nominal

- Can only say this concept implies another concept if there is a direct, named
  dependency
- It is too hard to say whether "this expression is valid" implies "that
  expression is valid"

---

## C++ example: defining a concept

```cpp{3-6}
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
```

{{% note %}}

- This is a C++ concept definition

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

class FancyRNG `<1>: public BaseRNGClass` {
 public:
  typedef double result_t;
  `<0>auto random() -> double` { ... }
};

template<RNGConcept T>
auto GenericFunction(T r) -> T::result_t {
  return r.random();
}
```

{{% note %}}

- C++ generics are structural, so there is nothing explicitly saying this type
  satisfies the concept except that it `<click>` implements the relevant method
  - `<`Click`>` in contrast to inheriting from a base class

<!--
- Note though that _subsumption_ is nominal:
  - Can only say this concept implies another concept if there is a direct,
    named dependency
  - It is too hard to say whether "this expression is valid" implies "that
    expression is valid"
-->

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

template<`RNGConcept` `T`>
auto GenericFunction(`T r`) -> T::result_t {
  return r.random();
}
```

{{% note %}}

- This is a definition of a generic function
- `<`click`>` The name of the concept is used as a constraint callers have to
  satisfy
- `<`click`>` `T` is the type parameter, it can be deduced from `<click>` the
  function's argument

{{% /note %}}
