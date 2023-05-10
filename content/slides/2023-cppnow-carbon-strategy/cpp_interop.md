+++
weight = 3
outputs = ["Reveal"]
+++

# Seamless C++ interop needs superpowers...

{{% note %}}

OK, so it's nice that we want to formulate Carbon's successor strategy in terms
of interop with C++, but making that interop seamless is going to require some
serious superpowers.

First, what all will we need for this to feel seamless?

{{% /note %}}

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)
- Passing types with data, including memory layout & model

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)
- Passing types with data, including memory layout & model
- Accessing members, both fields and methods (name lookup)

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)
- Passing types with data, including memory layout & model
- Accessing members, both fields and methods (name lookup)
- Operators (overloads, ADL) 😨

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)
- Passing types with data, including memory layout & model
- Accessing members, both fields and methods (name lookup)
- Operators (overloads, ADL) 😨
- Inheritance, including virtual dispatch

---

## What all do we need for C++ interop?

- Calling functions (calling conventions, etc.)
- Passing types with data, including memory layout & model
- Accessing members, both fields and methods (name lookup)
- Operators (overloads, ADL) 😨
- Inheritance, including virtual dispatch
- Templates... 😱

{{% note %}}

This starts pretty reasonable, but ends up _complicated_. This is why it easily
feels like building this degree of interop requires some kind of superpower.

Fortunately for Carbon, we have Clang!

{{% /note %}}

---

## Clang to the rescue!

- Can use a full blown C++ compiler to help build each part
- Embedded into the Carbon toolchain to connect to each Carbon feature
- Even has a bunch of extensions and extra features that help!

{{% note %}}

Clang happens to be somewhat perfectly designed to help address our problems
here. It gives us a fully functioning C++ compiler that can reason about all the
C++ code, but it also can be embedded into the Carbon toolchain in order to
manage the interop.

And it even has a number of features that specifically make it easier to build
this kind of interop.

This also isn't novel, this is something that Swift is already doing!

So, how does using Clang this way actually work?

{{% /note %}}

---

## Basics need to _directly_ map between Carbon and C++, roughly:

|               | C++ type                     | Carbon type                |
| ------------- | ---------------------------- | -------------------------- |
| boolean       | `bool`                       | `bool`                     |
| bytes         | `unsigned char`, `std::byte` | `byte`                     |
| ints          | `std::intN_t`                | `iN` (`i8`, ..., `i64`)    |
| unsigned ints | `std::uintN_t`               | `uN` (`u8`, ..., `u64`)    |
| floats        | `std::floatN_t`              | `fN` (`f16`, `f32`, `f64`) |
| ...           | ...                          | ...                        |

{{% note %}}

We need some very basic building blocks that we get by directly mapping things
between Carbon and C++. This mapping isn't for everything, and

These are mostly pretty unsurprising things like integer types of various sizes.

These mappings are also the ones that can carry over as _data_ as well. They
need to be represented exactly the same in both languages, etc.

{{% /note %}}

---

## Also need to map parameters, but Carbon parameters are _different_ from C++

---

## First, we need to understand Carbon's _expression categories_

{{% note %}}

We also will need to understand one of the more fundamental aspects of Carbon
that differs from C++.

In C++, expressions are categorized into "value categories" -- L-values,
R-values, and then the whole diagram.

Carbon uses a different, and I think simpler model here. It's important to
understand the core of it because this forms the basis of how parameters are
passed, and thus how APIs are built. Everything we want to interoperate between
C++ and Carbon will need to map through this difference.

{{% /note %}}

---

## Carbon's expression categorization:

- **Value expressions**: abstract, read-only values; immutable, no address

---

## Carbon's expression categorization:

- **Value expressions**: abstract, read-only values; immutable, no address
- **Reference expressions**: mutable objects with _storage_ and an address

---

## Carbon's expression categorization:

- **Value expressions**: abstract, read-only values; immutable, no address
- **Reference expressions**: mutable objects with _storage_ and an address
  - **_Durable_ reference expressions**: non-temporary storage, outlive the full
    expression

---

## Carbon's expression categorization:

- **Value expressions**: abstract, read-only values; immutable, no address
- **Reference expressions**: mutable objects with _storage_ and an address
  - **_Durable_ reference expressions**: non-temporary storage, outlive the full
    expression
  - **_Ephemeral_ reference expressions**: can refer to temporary storage

---

## Carbon's expression categorization:

- **Value expressions**: abstract, read-only values; immutable, no address
- **Reference expressions**: mutable objects with _storage_ and an address
  - **_Durable_ reference expressions**: non-temporary storage, outlive the full
    expression
  - **_Ephemeral_ reference expressions**: can refer to temporary storage
- **Initializing expressions**: initialize an object within implicitly provided
  storage
  - Used to model function call expressions (where the function returns)
  - Return _directly_ initializes an object in provided storage

---

## Carbon parameters and expression categories

- Parameters are modeled with _pattern matching_ in Carbon
- By default, parameter patterns match _value expressions_
  - Bind a name to a read-only, abstract value
- Parameter _variable_ patterns (marked with `var`) create _local storage_
  - These patterns match _initializing expressions_ for their storage

{{% note %}}

Ok, now we can explain how Carbon parameters work, because they work in terms of
pattern matching and the expression categories those patterns match against.

{{% /note %}}

---

## Extend our mappings on function boundaries:

|                        | C++ parameter type | Carbon parameter pattern |
| ---------------------- | ------------------ | ------------------------ |
| C++ `const &`          | `const T&`         | `T` (value)              |
| Unmodified by-value    | `T` or `const T`   | `T`                      |
| C++ _mutated_ by-value | `T`                | `var T` (variable)       |
| C++ references         | `T&`               | `T*` (non-null pointer)  |
| C++ pointers           | `T*`               | `T*?` (optional pointer) |
| ...                    | ...                | ...                      |

{{% note %}}

So the way we map between these function input parameters is that `const &`s in
C++ become simple values in Carbon. Explicitly passing in a copy requires the
`var` keyword to create a local variable within the function.

Carbon pointers aren't nullable, and so C++ pointers that may be null will
likely map into _optional_ pointers in Carbon.

And Carbon uses its pointers in places where C++ would use a reference.

We also expect to have slice-style types that'll match `std::span`. This also
isn't complete at all and there is some more nuance

{{% /note %}}

---

## Ready to call C++ from Carbon<br/>Let's break it down:

1. Import from C++ with Clang
2. Map it into a Carbon construct
3. Use it from Carbon
4. Synthesize and compile a C++ use with Clang

{{% note %}}

We're going to break the steps of how this works down into four stages.

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

Now let's walk through how this is going to work, each step.

{{% /note %}}

---

## Import from C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col fragment">

```carbon{|2}
// cat_main.carbon
import Cpp library "cat.h"

fn Run() {
  // Normal Carbon call:
  Cpp.Meow();
}
```

</div>
<div class="col">

```cpp{}
// cat.h
void Meow();
```

</div>
</div>

---

## Map it into a Carbon construct

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{2}
// cat_main.carbon
import Cpp library "cat.h"

fn Run() {
  // Normal Carbon call:
  Cpp.Meow();
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h                        
void Meow();
```

</div>
<div class="col" style="order: 4">

```cpp{1-2|4-6}
// Synthesized C++
export module carbon_cat_main;

// Use modules tech to import a header, 
// and make it available to Carbon.
export import "cat.h"

// Also make a hook available to Carbon 
export extern "CarbonMagic"
void Call_Meow() {
  // Synthesize the C++ use here,
  // where it can be compiled as C++:
  Meow();
}
```

</div>
<div class="col fragment" style="order: 3">

```carbon{1-2|4}
// Synthesized Carbon
package Cpp api

fn Meow() {
  // Call the synthesized low-level hook:
  Call_Meow();
}
```

</div>
</div>

---

## Use it in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{5-6}
// cat_main.carbon
import Cpp library "cat.h"

fn Run() {
  // Normal Carbon call:
  Cpp.Meow();
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h                        
void Meow();
```

</div>
<div class="col" style="order: 4">

```cpp{4-6}
// Synthesized C++
export module carbon_cat_main;

// Use modules tech to import a header,
// and make it available to Carbon.
export import "cat.h"

// Also make a hook available to Carbon
export extern "CarbonMagic"
void Call_Meow() {
  // Synthesize the C++ use here,
  // where it can be compiled as C++:
  Meow();
}
```

</div>
<div class="col" style="order: 3">

```carbon{4}
// Synthesized Carbon
package Cpp api

fn Meow() {
  // Call the synthesized low-level hook:
  Call_Meow();
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{5-6}
// cat_main.carbon
import Cpp library "cat.h"

fn Run() {
  // Normal Carbon call:
  Cpp.Meow();
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h                        
void Meow();
```

</div>
<div class="col" style="order: 3">

```carbon{5-6}
// Synthesized Carbon
package Cpp api

fn Meow() {
  // Call the synthesized low-level hook:
  Call_Meow();
}
```

</div>
<div class="col" style="order: 4">

```cpp{4-6|8-10|11-13}
// Synthesized C++
export module carbon_cat_main;

// Use modules tech to import a header,
// and make it available to Carbon.
export import "cat.h"

// Also make a hook available to Carbon
export extern "CarbonMagic"
void Call_Meow() {
  // Synthesize the C++ use here,
  // where it can be compiled as C++:
  Meow();
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// cat_main.carbon
import Cpp library "cat.h"

fn Run() {
  // Normal Carbon call:
  Cpp.Meow();
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h                        
void Meow();
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized C++
export module carbon_cat_main;

// Use modules tech to import a header,
// and make it available to Carbon.
export import "cat.h"

// Also make a hook available to Carbon
export extern "CarbonMagic"
void Call_Meow() {
  // Synthesize the C++ use here,
  // where it can be compiled as C++:
  Meow();
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized Carbon
package Cpp api

fn Meow() {
  // Call the synthesized low-level hook:
  Call_Meow();
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

## More interesting: methods and fields!

{{% note %}}

Let's try this with some more interesting cases like methods and fields.

{{% /note %}}

---

## Import from C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col fragment">

```carbon{|2}
// cat_meow.carbon
import Cpp library "cat.h"

fn MeowAndGetLives(c: Cat) -> i32 {
  c.Meow(4.2);
  return c.lives;
}
```

</div>
<div class="col">

```cpp{}
// cat.h
struct Cat {
  void Meow(const float vol) const;

  std::int32_t lives;
};
```

</div>
</div>

---

## Map it into a Carbon construct

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{2}
// cat_meow.carbon
import Cpp library "cat.h"

fn MeowAndGetLives(c: Cat) -> i32 {
  c.Meow(4.2);
  return c.lives;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat {
  void Meow(const float vol) const;

  std::int32_t lives;
};
```

</div>
<div class="col" style="order: 4">

```cpp{1-2|3}
// Synthesized C++
export module carbon_cat_meow;
export import "cat.h"

export extern "CarbonMagic"
void Call_Cat_Meow(const Cat &c, float vol) { 
  // Method call handled here:
  c.Meow(volume);
}

export extern "CarbonMagic"
void Read_Cat_lives(const Cat &c) {
  // Layout and offset here:
  return c.lives;
}
```

</div>
<div class="col fragment" style="order: 3">

<!-- TODO: either duplicate slides to parallel highlight the carbon and C++
     lines, or steal the JS technique of sync-ing them -->

```carbon{1-2|4,12|5|9-11}
// Synthesized Carbon
package Cpp api

class Cat {
  fn Meow[self: Self](vol: f32) {
    Call_Cat_Meow(self, vol);
  }

  // Eventually, a property:
  // ``=> Read_Cat_Lives(c);``
  var lives: i32;
}
```

</div>
</div>

---

## Use it in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

<!-- TODO: either duplicate slides to parallel highlight the two carbon lines
     lines, or steal the JS technique of sync-ing them -->

```carbon{5|6}
// cat_meow.carbon
import Cpp library "cat.h"

fn MeowAndGetLives(c: Cat) -> i32 {
  c.Meow(4.2);
  return c.lives;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat {
  void Meow(const float vol) const;

  std::int32_t lives;
};
```

</div>
<div class="col" style="order: 4">

```cpp{3}
// Synthesized C++
export module carbon_cat_meow;
export import "cat.h"

export extern "CarbonMagic"
void Call_Cat_Meow(const Cat &c, float vol) { 
  // Method call handled here:
  c.Meow(volume);
}

export extern "CarbonMagic"
std::int32_t Read_Cat_Lives(const Cat &c) {
  // Layout and offset here:
  return c.lives;
}
```

</div>
<div class="col" style="order: 3">

```carbon{5,11}
// Synthesized Carbon
package Cpp api

class Cat {
  fn Meow[self: Self](vol: f32) {
    Call_Cat_Meow(self, vol);
  }

  // Eventually, a property:
  // ``=> Read_Cat_Lives(c);``
  var lives: i32;
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<!-- TODO: either duplicate slides to parallel highlight the two carbon lines
     lines, or steal the JS technique of sync-ing them -->

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{5-6}
// cat_meow.carbon
import Cpp library "cat.h"

fn MeowAndGetLives(c: Cat) -> i32 {
  c.Meow(4.2);
  return c.lives;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat {
  void Meow(const float vol) const;

  std::int32_t lives;
};
```

</div>
<div class="col" style="order: 3">

```carbon{6,10}
// Synthesized Carbon
package Cpp api

class Cat {
  fn Meow[self: Self](vol: f32) {
    Call_Cat_Meow(self, vol);
  }

  // Eventually, a property:
  // ``=> Read_Cat_Lives(c);``
  var lives: i32;
}
```

</div>
<div class="col" style="order: 4">

```cpp{3|5-9|11-15}
// Synthesized C++
export module carbon_cat_meow;
export import "cat.h"

export extern "CarbonMagic"
void Call_Cat_Meow(const Cat &c, float vol) { 
  // Method call handled here:
  c.Meow(volume);
}

export extern "CarbonMagic"
void Read_Cat_lives(const Cat &c) {
  // Layout and offset here:
  return c.lives;
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// cat_meow.carbon
import Cpp library "cat.h"

fn MeowAndGetLives(c: Cat) -> i32 {
  c.Meow(4.2);
  return c.lives;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat {
  void Meow(const float vol) const;

  std::int32_t lives;
};
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized C++
export module carbon_cat_meow;
export import "cat.h"

export extern "CarbonMagic"
void Call_Cat_Meow(const Cat &c, float vol) { 
  // Method call handled here:
  c.Meow(volume);
}

export extern "CarbonMagic"
void Read_Cat_lives(const Cat &c) {
  // Layout and offset here:
  return c.lives;
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized Carbon
package Cpp api

class Cat {
  fn Meow[self: Self](vol: f32) {
    Call_Cat_Meow(self, vol);
  }

  // Eventually, a property:
  // ``=> Read_Cat_Lives(c);``
  var lives: i32;
}
```

</div>
</div>

---

## ADL and operator overloading! 😨

{{% note %}}

{{% /note %}}

---

## Import from C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 2">

```cpp{|4-5|}
// cat.h
struct Cat { ... };

Cat operator+(const Cat& lhs,
              const Cat& rhs) {
  Cat result;
  result.lives =
      lhs.lives + rhs.lives;
  return result;
}
```

</div>
<div class="col fragment" style="order: 1">

```carbon{|2}
// cat_sum.carbon
import Cpp library "cat.h"

fn SumCatsSomehow(c1: Cat,
                  c2: Cat) -> Cat {
  // No idea why we're adding cats...
  return c1 + c2;

}
```

</div>
</div>

---

## Map it into a Carbon construct

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{2}
// cat_sum.carbon
import Cpp library "cat.h"

fn SumCatsSomehow(c1: Cat,
                  c2: Cat) -> Cat {
  // No idea why we're adding cats...
  return c1 + c2;

}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

Cat operator+(const Cat& lhs,
              const Cat& rhs) {
  Cat result;
  result.lives =
      lhs.lives + rhs.lives;
  return result;
}
```

</div>
<div class="col" style="order: 4">

```cpp{1-2|3}
// Synthesized C++
export module carbon_cat_sum;
export import "cat.h"

export extern "CarbonMagic"
Cat Call_Cat_Op_Plus(const Cat &lhs,
                     const Cat &rhs) {
  // We compile the operator here, so we
  // get whatever C++ ADL would find.
  return lhs + rhs;
}
```

</div>
<div class="col fragment" style="order: 3">

```carbon{1-2|4|6-9}
// Synthesized Carbon
package Cpp api

class Cat { ... }

// We can find ``operator+`` in C++,
// so we synthesize a Carbon operator.
impl Cat as Core.AddWith(Cat) {
  fn Op[self: Self](rhs: Cat) -> Cat {
    return Call_Cat_Op_Plus(self, rhs);
  }
}
```

</div>
</div>

---

## Use it in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{7-8}
// cat_sum.carbon
import Cpp library "cat.h"

fn SumCatsSomehow(c1: Cat,
                  c2: Cat) -> Cat {
  // No idea why we're adding cats...
  return c1 + c2;
  // In Carbon, this calls ``Op`` below.
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

Cat operator+(const Cat& lhs,
              const Cat& rhs) {
  Cat result;
  result.lives =
      lhs.lives + rhs.lives;
  return result;
}
```

</div>
<div class="col" style="order: 4">

```cpp{3}
// Synthesized C++
export module carbon_cat_sum;
export import "cat.h"

export extern "CarbonMagic"
Cat Call_Cat_Op_Plus(const Cat &lhs,
                     const Cat &rhs) {
  // We compile the operator here, so we
  // get whatever C++ ADL would find.
  return lhs + rhs;
}
```

</div>
<div class="col" style="order: 3">

```carbon{6-9}
// Synthesized Carbon
package Cpp api

class Cat { ... }

// We can find ``operator+`` in C++,
// so we synthesize a Carbon operator.
impl Cat as Core.AddWith(Cat) {
  fn Op[self: Self](rhs: Cat) -> Cat {
    return Call_Cat_Op_Plus(self, rhs);
  }
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{7-8}
// cat_sum.carbon
import Cpp library "cat.h"

fn SumCatsSomehow(c1: Cat,
                  c2: Cat) -> Cat {
  // No idea why we're adding cats...
  return c1 + c2;
  // In Carbon, this calls ``Op`` below.
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

Cat operator+(const Cat& lhs,
              const Cat& rhs) {
  Cat result;
  result.lives =
      lhs.lives + rhs.lives;
  return result;
}
```

</div>
<div class="col" style="order: 4">

```cpp{3|5-7|8-10}
// Synthesized C++
export module carbon_cat_sum;
export import "cat.h"

export extern "CarbonMagic"
Cat Call_Cat_Op_Plus(const Cat &lhs,
                     const Cat &rhs) {
  // We compile the operator here, so we
  // get whatever C++ ADL would find.
  return lhs + rhs;
}
```

</div>
<div class="col" style="order: 3">

```carbon{10}
// Synthesized Carbon
package Cpp api

class Cat { ... }

// We can find ``operator+`` in C++,
// so we synthesize a Carbon operator.
impl Cat as Core.AddWith(Cat) {
  fn Op[self: Self](rhs: Cat) -> Cat {
    return Call_Cat_Op_Plus(self, rhs);
  }
}
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// cat_sum.carbon
import Cpp library "cat.h"

fn SumCatsSomehow(c1: Cat,
                  c2: Cat) -> Cat {
  // No idea why we're adding cats...
  return c1 + c2;
  // In Carbon, this calls ``Op`` below.
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

Cat operator+(const Cat& lhs,
              const Cat& rhs) {
  Cat result;
  result.lives =
      lhs.lives + rhs.lives;
  return result;
}
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized C++
export module carbon_cat_sum;
export import "cat.h"

export extern "CarbonMagic"
Cat Call_Cat_Op_Plus(const Cat &lhs,
                     const Cat &rhs) {
  // We compile the operator here, so we
  // get whatever C++ ADL would find.
  return lhs + rhs;
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized Carbon
package Cpp api

class Cat { ... }

// We can find ``operator+`` in C++,
// so we synthesize a Carbon operator.
impl Cat as Core.AddWith(Cat) {
  fn Op[self: Self](rhs: Cat) -> Cat {
    return Call_Cat_Op_Plus(self, rhs);
  }
}
```

</div>
</div>

---

## TEMPLATES! LET'S GOOOOO!!! 😱😱😱

{{% note %}}

{{% /note %}}

---

## Import from C++ with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 2">

```cpp{|4|6|9|}
// cat.h
struct Cat { ... };

template <typename T> struct Vector {
  // ...
  template <typename U> void Push(U x) { ... } 
};

Vector<Cat> global_cats;
```

</div>
<div class="col fragment" style="order: 1">

```carbon{|2}
// global_cats.carbon
import Cpp library "cat.h"

fn AddGlobalCat(c: Cpp.Cat) {
  Cpp.global_cats.Push(c);
}
```

</div>
</div>

---

## Map it into a Carbon construct

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{2}
// global_cats.carbon
import Cpp library "cat.h"

fn AddGlobalCat(c: Cpp.Cat) {
  Cpp.global_cats.Push(c);
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

template <typename T> struct Vector {
  // ...
  template <typename U> void Push(U x) { ... } 
};

Vector<Cat> global_cats;
```

</div>
<div class="col" style="order: 4">

```cpp{1-2|3}
// Synthesized C++
export module carbon_global_cats;
export import "cat.h"

// Generated for each instantiation
// of ``T`` and ``U``, here both are ``Cat``.
export extern "CarbonMagic"
void Call_Vector_Cat_Push_Cat(
    Vector<Cat> *self,
    Cat *x) {
  // Provide C++ R-value-ref move:
  self->Push(std::move(*x));
}
```

</div>
<div class="col fragment" style="order: 3">

```carbon{1-2|4|6|8-9|14}
// Synthesized Carbon
package Cpp api

class Cat { ... }

class Vector(template T:! type) {
  // ...
  fn Push[addr self: Self*,
          template U:! type](var x: U) { 
    Call_Vector_T_Push_U(self, &x);
  }
}

var global_cats: Vector(Cat);
```

</div>
</div>

---

## Use it in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{5}
// global_cats.carbon
import Cpp library "cat.h"

fn AddGlobalCat(c: Cpp.Cat) {
  Cpp.global_cats.Push(c);
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

template <typename T> struct Vector {
  // ...
  template <typename U> void Push(U x) { ... } 
};

Vector<Cat> global_cats;
```

</div>
<div class="col" style="order: 4">

```cpp{3}
// Synthesized C++
export module carbon_global_cats;
export import "cat.h"

// Generated for each instantiation
// of ``T`` and ``U``, here both are ``Cat``.
export extern "CarbonMagic"
void Call_Vector_Cat_Push_Cat(
    Vector<Cat> *self,
    Cat *x) {
  // Provide C++ R-value-ref move:
  self->Push(std::move(*x));
}
```

</div>
<div class="col" style="order: 3">

```carbon{14|8-9}
// Synthesized Carbon
package Cpp api

class Cat { ... }

class Vector(template T:! type) {
  // ...
  fn Push[addr self: Self*,
          template U:! type](var x: U) { 
    Call_Vector_T_Push_U(self, &x);
  }
}

var global_cats: Vector(Cat);
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{5}
// global_cats.carbon
import Cpp library "cat.h"

fn AddGlobalCat(c: Cpp.Cat) {
  Cpp.global_cats.Push(c);
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

template <typename T> struct Vector {
  // ...
  template <typename U> void Push(U x) { ... } 
};

Vector<Cat> global_cats;
```

</div>
<div class="col" style="order: 4">

```cpp{3|5-8|8-13}
// Synthesized C++
export module carbon_global_cats;
export import "cat.h"

// Generated for each instantiation
// of ``T`` and ``U``, here both are ``Cat``.
export extern "CarbonMagic"
void Call_Vector_Cat_Push_Cat(
    Vector<Cat> *self,
    Cat *x) {
  // Provide C++ R-value-ref move:
  self->Push(std::move(*x));
}
```

</div>
<div class="col" style="order: 3">

```carbon{10}
// Synthesized Carbon
package Cpp api

class Cat { ... }

class Vector(template T:! type) {
  // ...
  fn Push[addr self: Self*,
          template U:! type](var x: U) { 
    Call_Vector_T_Push_U(self, &x);
  }
}

var global_cats: Vector(Cat);
```

</div>
</div>

---

## Synthesize and compile a C++ use with Clang

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}
// global_cats.carbon
import Cpp library "cat.h"

fn AddGlobalCat(c: Cpp.Cat) {
  Cpp.global_cats.Push(c);
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
// cat.h
struct Cat { ... };

template <typename T> struct Vector {
  // ...
  template <typename U> void Push(U x) { ... } 
};

Vector<Cat> global_cats;
```

</div>
<div class="col" style="order: 4">

```cpp{}
// Synthesized C++
export module carbon_global_cats;
export import "cat.h"

// Generated for each instantiation
// of ``T`` and ``U``, here both are ``Cat``.
export extern "CarbonMagic"
void Call_Vector_Cat_Push_Cat(
    Vector<Cat> *self,
    Cat *x) {
  // Provide C++ R-value-ref move:
  self->Push(std::move(*x));
}
```

</div>
<div class="col" style="order: 3">

```carbon{}
// Synthesized Carbon
package Cpp api

class Cat { ... }

class Vector(template T:! type) {
  // ...
  fn Push[addr self: Self*,
          template U:! type](var x: U) { 
    Call_Vector_T_Push_U(self, &x);
  }
}

var global_cats: Vector(Cat);
```

</div>
</div>

---

## There is a pattern to this approach:

- Carbon constructs provide a Carbon API for C++ imports
- C++ constructs implement the C++ _behavior_ of that API
- Carbon's compiler synthesizes a low-level, simplified connection layer
  - Because the connection is never user-visible, it can cheat a _lot_
  - Example: generate manually during instantiation

{{% note %}}

C++ constructs are always handled as C++ code in a C++ context by a C++
compiler.

- Allows perfect model of complex features
- C++ ADL is done _in_ C++
- C++ templates are instantiated _in_ C++
- ...

Carbon constructs are always on the Carbon side.

And we use the combined technology of Clang as a library and building C++ code,
even headers and stuff that isn't "modular", into a C++ module with a proper,
isolated AST that we can use to figure out how to map it into Carbon.

{{% /note %}}

---

## Calling Carbon from C++? Same idea:

- Carbon will build a C++ module or header to expose Carbon to C++
- Synthesizing C++ constructs to model the C++ API for a Carbon import
- Map through low-level connection layer to fully Carbon behavior

{{% note %}}

We'll use the same core techniques and ideas in the other direction as well.

Again, we'll keep C++ in C++, here synthesizing C++ constructs to model imported
Carbon, etc. And we'll keep the actual behavior implementation fully in Carbon
to get the expected results.

{{% /note %}}

---

## What about that low-level connection layer?

{{% note %}}

{{% /note %}}

---

# We already have it: <span class="fragment">_LLVM!_</span>

{{% note %}}

{{% /note %}}

---

## LLVM is the glue that holds C++ interop together

- Already know we can lower both Carbon and C++ into LLVM
  - Guaranteed to be able to represent everything
- Unconstrained by source, can select optimal representation
- LLVM's optimizer can inline and optimize away overhead

{{% note %}}

{{% /note %}}

---

## Also provide a fallback of C++ source generation

- Limited / partial coverage, and more overhead
- Useful when bridging to other toolchains or new platforms
- Want to enable shipping a binary Carbon library with a C++ header

{{% note %}}

{{% /note %}}

---

## This pattern enables so much more:

- Bundling a **C++ toolchain** to build the C++ code
  - Allows a custom STL ABI to transparently map more types
- Transparent mapping of views and non-owning wrappers on API boundaries
- Ranges and iteration mapping
- Inheritance, virtual dispatch, v-tables
- Translating error handling both to & from exceptions

{{% note %}}

I'd love to spend more time diving into C++ interop, maybe in another talk or
the hallways here.

We see a ton of potential here here ranging from customizing the ABI in careful
ways with a bundled C++ toolchain to make _even easier_ to build interoperable
APIs, to transparent mapping for a bunch of important use cases like non-owning
views and wrappers. So much.

But instead, let's shift gears a little bit...

{{% /note %}}
