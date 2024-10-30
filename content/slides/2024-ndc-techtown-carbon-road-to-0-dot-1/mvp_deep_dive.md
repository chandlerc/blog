+++
weight = 2
outputs = ["Reveal"]
+++

# Zooming in on our MVP: Carbon 0.1

{{% note %}}

{{% /note %}}

---

## What do we want to achieve with 0.1?

- Enable evaluation of Carbon as C++ successor
- Target audience are existing C++ users and developers
- Needs to be a _serious_ and credibly evaluation, not casual
  - Integrated into real or realistic C++ dev environment
  - Able to build working code, even if not "production"
- As minimal as we can get away with
- Gaps need to be ones that _don't undermine confidence_

---

## Evaluating across multiple dimensions

- Foundational language constructs
- Functional C++ interop: both Carbon using C++ and C++ using Carbon
- Build speed and scalability
- Performance & generated code quality

---

## Expected Carbon 0.1 language

- Minimal, core, _necessary_ features to support evaluation
- Current expectation based on designs & anticipated dependencies
- Will eagerly remove things if they turn out to not be needed
- Will, reluctantly, add things that evaluation ends up needing
- The current list of features is [documented with our milestones][01-features]

[01-features]:
  https://docs.carbon-lang.dev/docs/project/milestones.html#language-features

---
{{< slide visibility="hidden" >}}

## Carbon 0.1 language: code organization

- Packages: our top-level namespace / scope
- Libraries: unit of import (a "header" and its implementation)
- Separate API & implementation: optional, mirrors header / source split
- Namespaces: structured sub-package general-purpose scoping

---
{{< slide visibility="hidden" >}}

## Carbon 0.1 language: type system

- User-defined types
  - Importing C++ types & exporting Carbon types
  - Single inheritance, virtual dispatch, ...
  - Operator overloading
- Generics
  - Definition checked (Rust, Swift, C++0x concepts)
  - _And_ templated (C++, C++20 concepts)
  - Both integrated with C++ interop

{{% note %}}

- User-defined types
  - C++ interop: importing C++ types into Carbon, exporting Carbon types into
    C++
  - Single inheritance
    - Virtual dispatch
    - C++ interop:
      - Bi-directional inheritance between C++ and Carbon
      - Type hierarchy roots in both C++ and Carbon
      - Mappings of inheritance features: abstract, final, virtual
  - Operator overloading
    - C++ interop:
      - Synthesizing Carbon overloads for imported C++ types
      - Exporting Carbon overloads into C++
  - Sum types (discriminated unions)
  - Unions (un-discriminated)
    - C++ interop: mapping to and from C++ unions.
- Generics
  - Both generic functions and types
  - Checked generics
    - Definition-checked variadics
  - Integrated templates
    - Including template-style structural conformance to nominal constraints,
      both modeling the members (like interfaces) and arbitrary predicates (like
      C++20 expression validity predicates)
  - C++ interop:
    - Importing C++ templates, instantiating on Carbon types
    - Exporting Carbon templates, instantiating on C++ types
    - Exporting Carbon checked generics (as templates), instantiating on C++
      types
    - Mapping C++20 concepts into named predicates, and named predicates into
      C++20 concepts

{{% /note %}}

---
{{< slide visibility="hidden" >}}

## Carbon 0.1 language: imperative constructs

- Function, including overloading
- Control flow statements
  - Conditions
  - Loops
  - Matching (like `switch`)
- Error handling
  - C++ interop both with exceptions and non-exception idioms

{{% note %}}

- Functions
  - Separate declaration and definition
  - Function overloading
  - C++ interop:
    - Importing C++ functions and methods and calling them from Carbon
    - Exporting Carbon functions and methods and calling them from C++
    - Importing C++ overload sets into Carbon overload sets where the model
      (closed overloading) fits
    - Importing C++ open-overload-sets-as-extension-points (`swap`, etc) into
      synthetic Carbon interfaces for common cases (likely based on heuristics)
- Control flow statements
  - Conditions
  - Loops
    - Range-based loops
    - Good equivalents for a range of existing C/C++ looping constructs
  - Matching
    - Good equivalents for C/C++ uses of `switch`
    - Working with sum-types, especially for C++ `std::variant` and
      `std::optional` interop
    - Both positive (`if let` in Rust) and negative (`let else` in Rust)
      combined match control flow and variable declaration
- C++ interop: support for C++'s threading and atomic primitives, memory model,
  and synchronization tools
- Error handling
  - Any dedicated error handling control flow constructs
  - C++ interop:
    - Mechanisms to configure how exception handling should or shouldn't be
      integrated into C++ interop sufficient to address both `-fno-except` C++
      dialects and standard C++ dialects
    - Calling C++ functions which throw exceptions from Carbon and automatically
      using Carbon's error handling
    - Export Carbon error handling using some reasonably ergonomic mapping into
      C++ -- `std::expected`, something roughly compatible with `std::expected`,
      C++ exceptions, etc.

{{% /note %}}

---
{{< slide visibility="hidden" >}}

## Carbon 0.1 language: standard library

- Expect to _heavily_ leverage C++ standard library via interop
- Foundational types: `bool`, `iN`, pointers, tuples, ...
- Extension points: overloading, conversions, ...
- Types with transparent mapping for C++ interop
  - Includes foundational types
  - _Non-owning_ string-related types
  - _Non-owning_ and _contiguous_ container types (slices, views, ...)
  - Iteration abstractions for `for` loops, etc.

{{% note %}}

- Language and syntax support library components
  - Fundamental types (`bool`, `iN`, `fN`)
  - Any parts of tuple or array types needed in the library
  - Pointer types
  - Interfaces powering language syntax (operators, conversions, etc.)
- Types with important language support
  - String and related types used with string literals
  - Optional
  - Slices
- C++ interop:
  - Transparent mapping between Carbon fundamental types and C++ equivalents
  - Transparent mapping between Carbon and C++ _non-owning_ string-related types
  - Transparent mapping between Carbon and C++ _non-owning_ contiguous container
    types
    - Includes starting from an owning container and forming the non-owning view
      and then transparently mapping that between languages.
  - Transparent mapping between Carbon and C++ iteration abstractions

{{% /note %}}

---
{{< slide visibility="hidden" >}}

## But, what about ...?

{{% note %}}

Now, you're probably thinking about some glaring thing that's missing here...

{{% /note %}}

---

## However, many things are missing from 0.1

- This is intentional!
- The smaller 0.1 is the sooner we can ship it
- We look at each thing included and critically ask:
  - Could an evaluator avoid that feature?
  - Would it undermine their ability to do the evaluation?
  - Would it undermine their confidence in it?
- If not, it should get left out...

{{% note %}}

But there are some obvious omissions we should address directly...

{{% /note %}}

---

## Explicitly deferred to 0.2 milestone (or later)

- Coroutines
- Memory safety
- Metaprogramming
- And
  [more](https://docs.carbon-lang.dev/docs/project/milestones.html#features-explicitly-deferred-until-at-least-02)...

---

## Why not metaprogramming?

- Less relevant for interop as it sits "on top" of the language
- Well versed in avoiding it from C++
- Particularly expensive to design and get right
- That said, we'll still have some small but essential features

---

## Why not coroutines?

- _Particularly_ complex feature
- Both Rust and C++ are actively learning about them
  - Especially about making them safe at scale
  - Can learn from these and have a _much_ better approach
- Confident we can evaluate Carbon without them
  - Plenty of C++ predates or doesn't use them

---

## Why not memory safety?

- Probably the single toughest call here
- However, C++ is fundamentally memory unsafe
- And so 0.1 Carbon needs to interoperate with memory unsafe
- Means the "unsafe" dialect of Carbon is the 0.1 priority
- Memory safety is still a goal and _incredibly important_

{{% note %}}

TODO: maybe present the dgregor tweet?

{{% /note %}}

---

## So what are we building towards with 0.1?

## What end-state should an evaluation target?

{{% note %}}

Now that we have an idea of what this 0.1 milestone looks like, and that it is
motivated by evaluating Carbon, let's talk more about the long-term vision that
we want Carbon to achieve and will be evaluating for feasibility.

This is actually a particularly exciting aspect of Carbon's story that we've not
really had a good chance to talk about before, because the evaluation story of
Carbon is also the _migration_ story.

{{% /note %}}
