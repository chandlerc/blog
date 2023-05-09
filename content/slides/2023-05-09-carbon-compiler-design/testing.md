+++
weight = 9
outputs = ["Reveal"]
+++

## Aside: testing the compiler

{{% note %}}

{{% /note %}}

---

## Basic testing follows usual patterns

- Easier to write focused unit tests due to simpler language
  - No preprocessor in the lexer, etc.
- Serializing each layer into line delimited JSON
  - Easy to do quick things with `grep`
  - Can use powerful tools like `jq`
- LLVM [FileCheck]-style testing throughout

[FileCheck]: https://llvm.org/docs/CommandGuide/FileCheck.html

{{% note %}}

{{% /note %}}

---

## Fuzz testing is a more interesting challenge

- Historically, C++ compilers have been ~impossible to fuzz test
  - None were built with continuous fuzz testing
  - Very large number of failures throughout the system
  - Difficult to create interesting inputs
- Carbon decided to have fuzz testing from day one
  - And to fuzz test each layer

{{% note %}}

{{% /note %}}

---

## Fuzz testing with more complex inputs

- Also developed a protobuf-based fuzzer
- Models the Carbon AST in protobuf messages
- Uses structural fuzz testing systems build on top of protobufs to synthesize interesting and complex ASTs
- Renders them into source as fuzzer inputs

{{% note %}}

{{% /note %}}

---

## Our goal: a compiler that _does not crash_

- May still have plenty of bugs, but they shouldn't crash
- Users should always get a useful error message
- Only way we know to achieve this is to do it from the very beginning

{{% note %}}

{{% /note %}}
