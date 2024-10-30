+++
weight = 3
outputs = ["Reveal"]
+++

# Incremental migration vision

{{% note %}}

And the migration story, well, my _vision_ for migration in Carbon is
interesting because it is _incremental_. Let's walk through how we expect this
to work so you can see the concrete steps along this path.

{{% /note %}}

---

## First, meet C++ users where they are: C++

---

## Carbon's first increment isn't Carbon at all...

- The Carbon toolchain will provide a drop-in **_C++_** toolchain
- Packaging Clang, libc++, LLVM, etc. into a complete C++ toolchain
- Drops into your existing C++ build systems: CMake, Autotools, ...
- Goal: if you can build with C++ with Clang, can build with Carbon
- First step is enabling our toolchain to build your C++ code

---

## Carbon's C++ toolchain will be useful on its own

- Can be difficult to get a stable but up-to-date Clang-based toolchain
- Will make "advanced" features (much) easier
  - Advanced runtimes configs: libc++ archives, llvm-libc...
  - Sanitizers, even MSan, with correctly configured runtimes
  - Full suite of tools: LLD, LLDB, ClangD, Clang Tidy, etc.
- (Eventually) Support for Linux, macOS, Windows, ...

---

## Second increment, our "Hello World!"

- Take one (very small) C++ function and move it to Carbon
- Adds one Carbon file to existing build system
  - Need to already be using the Carbon toolchain for C++ code
  - Same fundamental build model as C++, different file & command-line
- Use C++ APIs and export the function via interop

{{% note %}}

We do plan to support mixing toolchains more long-term, but our _primary_ vision
is oriented around users that can consolidate onto the Carbon toolchain for both
C++ and Carbon as that gives us by far the most power and flexibility. When
mixing toolchains we'll have to make some minor tradeoffs.

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col fragment" style="order: 1" data-fragment-index="2">

````carbon{}
// ```<2>hello_world.carbon```
package `<3>Greeting`;



fn `<4>HelloWorld()` -> `<5>Core.String` {
  // `<9>Call C++ Hello() somehow?`
  var `<6>greeting`: Core.String = ...;

  `<7>greeting.append(" Carbon World!")`;
  `<8>return greeting`;
}
````

</div>
<div class="col" style="order: 2">

```cpp{}
// ``hello.h``
namespace Greeting {
auto Hello() -> std::string;
}
```

````cpp{}
// ```<1>hello_world.h```
namespace `<3>Greeting` {
auto `<4>HelloWorld()` -> `<5>std::string`;
}
````

````cpp{}
// ```<1>hello_world.cpp```
#include "hello.h"

auto `<4>Greeting::HelloWorld()` -> `<5>std::string` {
  std::string `<6>greeting` = `<9>Hello()`;

  `<7>greeting.append(" C++ World!")`;
  `<8>return greeting`;
}
````

```cpp{}
// ``main.cpp``
`<10>#include "hello_world.h"`

`<11>using Greeting::HelloWorld`;

int main() {
  std::string hello_world = `<11>HelloWorld()`;
  std::cout << hello_world << std::endl();
}
```

</div>
</div>

{{% note %}}

Notes to also mention:
- `Core.String` will have dedicated syntax, but we've not decided what yet

{{% /note %}}

---

## How will this work?

---

### Import from C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 2">

```cpp{}
// ``hello.h``
namespace Greeting {
`auto Hello() -> std::string`;
}
```

</div>
<div class="col fragment" style="order: 1">

```carbon{}
// ``hello_world.carbon``
package Greeting;

`import Cpp library "hello.h"`;

fn HelloWorld() -> Core.String {
  var greeting: Core.String =
      Cpp.Greeting.Hello();

  greeting.append(" Carbon World!");
  return greeting;
}
```

</div>
</div>

{{% note %}}

We're going to break the steps of how this works down into stages.

- First we import the C++ code with Clang.
- Then map it into a Carbon construct so its available.
- Use it from Carbon using the native syntax in Carbon.
- And then to map that back to C++, we essentially synthesize a C++ use that is
  compiled with Clang. And we can make that available to Carbon when we're
  generated executable code for its call.

When I talk about "synthesizing" C++ and compiling it with Clang, that doesn't
necessarily mean generating actual C++ text, although that could be an option.
More likely, we can use Clang's APIs as a library more directly. But I think
it's easier to explain and understand the conceptual model here by thinking
about it as generating code. It also shows how this isn't _really_ Clang
specific, this is something that we could imagine doing with any C++ compiler.

{{% /note %}}

---

### Map it into a Carbon construct

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// ``hello_world.carbon``
package Greeting;

import Cpp library "hello.h";

fn HelloWorld() -> Core.String {
  var greeting: Core.String =
      Cpp.Greeting.Hello();

  greeting.append(" Carbon World!");
  return greeting;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// ``hello.h``
namespace `<10>Greeting` {
auto `<11>Hello()` -> `<12>std::string`;
}
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized for ``hello.h``
`<1>export module carbon_hello_h`;

`<2>export import "hello.h"`

export extern "CarbonMagic"
auto Call_Greeting_Hello() -> std::string {
  return Greeting::Hello();
}
```

</div>
<div class="col fragment" style="order: 3" data-fragment-index="3">

```carbon{}
// Synthesized for ``hello.h``
`<4>package Cpp`;

`<10>namespace Greeting`;

fn `<11>Greeting.Hello`() -> `<12>Core.String` {
  var s: Cpp.std.string =
      Call_Greeting_Hello();
  return s as Core.String;
}
```

</div>
</div>

---

### Use it in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// ``hello_world.carbon``
package Greeting;

import Cpp library "hello.h";

fn HelloWorld() -> Core.String {
  var greeting: Core.String =
      `<1>Cpp.Greeting.Hello()`;

  greeting.append(" Carbon World!");
  return greeting;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// ``hello.h``
namespace Greeting {
auto `<5>Hello()` -> `<6>std::string`;
}
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized for ``hello.h``
export module carbon_hello_h;

export import "hello.h"

export extern "CarbonMagic"
auto `<4>Call_Greeting_Hello()` -> `<7>std::string` {
  return `<5>Greeting::Hello()`;
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized for ``hello.h``
package Cpp;

namespace Greeting;

fn `<1>Greeting.Hello()` -> `<9>Core.String` {
  var s: `<8>Cpp.std.string` =
      `<4>Call_Greeting_Hello()`;
  return `<10>s as Core.String`;
}
```

</div>
</div>

---

### Importantly we compile the C++ use as C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// ``hello_world.carbon``
package Greeting;

import Cpp library "hello.h";

fn HelloWorld() -> Core.String {
  var greeting: Core.String =
      Cpp.Greeting.Hello();

  greeting.append(" Carbon World!");
  return greeting;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// ``hello.h``
namespace Greeting {
auto Hello() -> std::string;
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized for ``hello.h``
package Cpp;

namespace Greeting;

fn Greeting.Hello() -> Core.String {
  var s: Cpp.std.string =
      Call_Greeting_Hello();
  return s as Core.String;
}
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized for ``hello.h``
export module carbon_hello_h;

export import "hello.h"

`<2>export extern "CarbonMagic"`
auto Call_Greeting_Hello() -> std::string {
  return `<1>Greeting::Hello()`;
}
```

</div>
</div>

---

## Ok, let's turn it around now...

---

### Synthesize a header exposing Carbon APIs to C++

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// ``hello_world.carbon``
package `<4>Greeting`;

import Cpp library "hello.h";

fn `<5>HelloWorld`() -> Core.String {
  var greeting: Core.String =
      Cpp.Greeting.Hello();

  greeting.append(" Carbon World!");
  return greeting;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// ``main.cpp``
`<1>#include "hello_world.carbon.h"`

`<6>using Greeting::HelloWorld`;

int main() {
  std::string `<19>hello_world` = `<7>HelloWorld()`;
  `<20>std::cout << hello_world << std::endl()`;
}
```

</div>
<div class="col" style="order: 4">

````cpp{}
// Synthesized ```<2>hello_world.carbon.h```
namespace `<4>Greeting` {

namespace __Cpp {
`<10>extern "CarbonMagic"`
auto `<9>HelloWorld()` -> `<17>std::string`;
}

// And the C++ rendered declaration.
auto `<5>HelloWorld`() -> `<18>std::string` {
  return `<8>__Cpp::HelloWorld()`;
}
````

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized for ``hello_world.carbon``
`<11>impl package Greeting;`

namespace __Cpp;

fn `<12>__Cpp.HelloWorld()` -> `<13>Cpp.std.string` {
  var s: `<15>Core.String` = `<14>HelloWorld()`;
  return `<16>s as Cpp.std.string`;
}
```

</div>
</div>

---

# See, it's easy! No problem! <span class="fragment">🤡</span>

{{% note %}}

It's easy! Nothing to it! ;]

Of course, doing this for a simple function call is a bit silly. But this is the
model we want to use because it gives us a very powerful pattern.

{{% /note %}}

---

## Ok, it's not easy, but this pattern generalizes

- Can extend this systematically for each feature on an API boundary
- Forms the basis of our fine-grained interop story
- Let's you move one construct at a time if needed
- For more complex & exciting examples, see my CppNow 2023 keynote

---

## Users won't migrate one function at a time...

---

## Expected typical unit of migration?

## One modular header

---

## Migrating a modular header

- Includes the "entry point" `#include`
- And all its implementation details, headers & sources
- Call this a _library_ → minimal importable (or include-able) unit
- Migration will typically include that library's unit tests
- But will still have increments...

---

## Tangent: What about a C++20 module?

- Will definitely be supported!
- Expecting them to work very similarly to a modular header
- Not our current focus due to the prevalence of headers
- But the model is designed to gracefully integrate them

{{% note %}}

That said....

{{% /note %}}

---

## Tangent²: On large "umbrella" modules...

- However, modules like `std` will present challenges...
- They'll work with the model, but may be less efficient
- Nothing to do with Carbon or Clang, this is about build systems
  - Umbrella modules can significantly limit build parallelism
  - Also can be expensive to serialize
- Generally, I advocate for relatively narrow units of import

---

## Incrementally migrating a _library_

- Automatically translate header and implementation
- Carbon will include migration tooling targeting this granularity
- Will produce near complete, near idiomatic Carbon code
  - Carbon is designed to have matching idioms for most C++
  - Use heuristics to lift into best Carbon idiom we can
  - But have a reasonable fallback for almost _everything_
  - Very rarely, leave `FIXME` comment to manually clean up
  - Even then, emit non-idiomatic forced behavior match for C++

---

## Notably, this _won't_ migrate the unit tests at first!

- We can re-export the original C++ API, now from Carbon
- Use this to run existing unit tests against migrated code
- Can iterate here and ensure migration is correct & successful
  - Catch anywhere a `FIXME`/fallback couldn't be synthesized
  - Catch any subtle behavior difference
  - Can iterate more manually to get closer to idiomatic Carbon

---

## Migrate the tests last with a working library

- When the tests move, can clean up unneeded parts of the interop
- Will provide tooling integration for this layer too
- Same automation strategy: some minimal `FIXME`s left...

---

## Now incrementally rinse and repeat on demand

{{% note %}}

The goal is that this becomes a repeatable process you can use to migrate code
to Carbon when and where it makes sense.

About to fix a bug in some C++ code and it'll require a decent amount of edits
anyways? Maybe it makes sense to first migrate it to Carbon, clean up and check
that in, and then build on that with the more advanced language tools, etc.

Imagine you've got some new code you've written in Carbon. And you'd like to
switch it to be the _safe_ Carbon dialect, which needs a new data structure with
a more safety-friendly API design. You can walk through all the users of the old
API and first migrate them from C++ to Carbon (but memory unsafe Carbon). Then
you can migrate them to the new API, potentially using new Carbon features that
help support the memory safety guarantees. This won't make every part of the
migrated code safe, but lets you adopt the new data structure which is useful in
the part of the Carbon code that _is_ memory safe.

{{% /note %}}

---

## So when can you try that out? <span class="fragment">Not yet...😞</span>
