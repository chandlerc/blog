+++
weight = 150
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# Better language foundations with checked generics

{{% note %}}

Now that we have the basics of how checked generics work across a number of
languages, let's look at ways we think these can actually improve the
foundations of the programming language.

This is a key area we've been exploring in Carbon, because we knew it was
important to have checked generics and we wanted to work hard to get the most
out of that investment and lay the strongest foundation we could for the rest of
the language.

{{% /note %}}

---

## Unified and powerful customization points

{{% note %}}

First up, let's look at how these can give the language powerful customization
points.

{{% /note %}}

---

## What are customization points?

```cpp
class MyComplex { ... };

MyComplex `operator+`(MyComplex, MyComplex) { ... }
void `swap`(MyComplex, MyComplex) { ... }

void f(std::vector<MyComplex> vec) {
  // Uses ``operator+`` customization point.
  MyComplex avg = `std::accumulate`(vec.begin(), vec.end(),
                                  MyComplex{})
                  / vec.size();

  // Uses ``swap`` customization point.
  `std::partial_sort`(vec.begin(), vec.end(),
                    [&](MyComplex c) {
                      return c.real() < avg.real();
                    });
}
```

---

## Long, complex history trying to get this right

- ADL (Argument Dependent Lookup) of operators
- Class template specialization
- ADL-found functions with the weird `using` trick
- Customization Point Objects
- `tag_invoke`
- ...

Many WG21 papers here, but can start with: http://wg21.link/p2279

---

## Checked generics solve these problems

---

## Operator overloading

```carbon{1-4}
interface `MulWith`(`U:! type`) {
  `let Result:! type` `= Self`;
  fn `Op`[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;

  impl as MulWith(f64) where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point {
      return {.x = self.x * scale, .y = self.y * scale};
    }
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(typeof(scale)).Op)(scale)
  // => p.(MulWith(f64).Op)(scale)
}
```

{{% note %}}

Rather than using ADL to find the right operator, we can use a dedicated
customization point mechanism that is designed specifically for doing things
like expressing how to apply an operation to a particular type.

And without ADL here, no need to deal with the brittle-ness of ADL or build the
customization point objects to defeat it.

{{% /note %}}

---

## Operator overloading

```carbon{6-15}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class `Point` {
  var x: f64;
  var y: f64;

  `impl as MulWith(f64)` where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point {
      return {.x = self.x * scale, .y = self.y * scale};
    }
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(typeof(scale)).Op)(scale)
  // => p.(MulWith(f64).Op)(scale)
}
```

---

## Operator overloading

```carbon{1-4,10-13}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;

  impl as MulWith(f64) `where .Result = Point` {
    fn Op[self: Self](scale: f64) -> Point {
      `return {.x = self.x * scale, .y = self.y * scale};`
    }
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(typeof(scale)).Op)(scale)
  // => p.(MulWith(f64).Op)(scale)
}
```

---

## Operator overloading

```carbon{1-4,10-13,17-22}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;

  impl as MulWith(f64) where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point {
      return {.x = self.x * scale, .y = self.y * scale};
    }
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return `p * scale`;
  // => `p.(MulWith(typeof(scale)).Op)(scale)`
  // => p.(MulWith(f64).Op)(scale)
}
```

---

## Operator overloading

```carbon{1-4,10-13,17-22}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;

  impl as MulWith(f64) where .Result = `<5>Point` {
    fn `<2>Op`[self: Self](scale: f64) -> Point {
      return {.x = self.x * scale, .y = self.y * scale};
    }
  }
}

fn Double(p: Point) -> `<5>auto` {
  let scale: f64 = 2.0;
  return p * `<1>scale`;
  // => p.(MulWith(`<1>typeof(scale)`).Op)(scale)
  // => `<3>p`.(`<2>MulWith(f64).Op`)(`<4>scale`)
}
```

---

## Customizations with higher-level semantics

```carbon{1-6|8-10}
choice Ordering {
  Less,
  Equivalent,
  Greater,
  Incomparable
}

interface OrderedWith(U:! type) {
  fn Compare[self: Self](u: U) -> Ordering;
}

fn StringLess(s1: String, s2: String) -> bool {
  return s1 < s2;
  // => s1.(OrderedWith(String).Compare)(s2) == Less
}

fn StringGreater(s1: String, s2: String) -> bool {
  return s1 > s2;
  // => s1.(OrderedWith(String).Compare)(s2) == Greater
}
```

{{% note %}}

We can also customize operators in a more semantic manner without issue, using
names and types to mark things. For example, we can define a type to model
possible orderings and an interface with a single compare function that returns
it, much like spaceship but with names that make it obvious how it interacts
with the type.

{{% /note %}}

---

## Customizations with higher-level semantics

```carbon{12-20}
choice Ordering {
  Less,
  Equivalent,
  Greater,
  Incomparable
}

interface OrderedWith(U:! type) {
  fn Compare[self: Self](u: U) -> Ordering;
}

fn StringLess(s1: String, s2: String) -> bool {
  return s1 `<2><` s2;
  // => `<1>s1.(OrderedWith(String).Compare)(s2)` `<2>== Less`
}

fn StringGreater(s1: String, s2: String) -> bool {
  return s1 `<3>>` s2;
  // => `<1>s1.(OrderedWith(String).Compare)(s2)` `<3>== Greater`
}
```

<span class="fragment">Note: Carbon actually supports deeper customization,
motivated by C++ interop</span>

{{% note %}}

And we can rewrite multiple different binary operators to use this single,
semantic model for what is going on, rather than having a separate, and
potentially inconsistent, customizations for each operator.

{{% /note %}}

---

## Incrementally extending & specializing customization points

```carbon{1-2}
interface OrderedWith(U:! type) {
  fn Compare[self: Self](u: U) -> Ordering;

  default fn Less[self: Self](u: U) -> bool {
    return self.Compare(u) == Ordering.Less;
  }
  default fn LessOrEquivalent[self: Self](u: U) -> bool {
    let c: Ordering = self.Compare(u);
    return c == Ordering.Less or c == Ordering.Equivalent;
  }

  default fn Greater[self: Self](u: U) -> bool {
    return self.Compare(u) == Ordering.Greater;
  }
  default fn GreaterOrEquivalent[self: Self](u: U) -> bool {
    let c: Ordering = self.Compare(u);
    return c == Ordering.Greater or c == Ordering.Equivalent;
  }
}
```

{{% note %}}

Another advantage of the richer language construct powering things like the
customization points for operators is that they can support more complex use
cases.

For example, if we start with an interface like our `OrderedWidth`, there might
be types that would prefer a custom implementation of specific comparisons. And
we can actually change the interface to evolve it in a non-breaking way.

{{% /note %}}

---

## Incrementally extending & specializing customization points

```carbon{4-18}
interface OrderedWith(U:! type) {
  fn Compare[self: Self](u: U) -> Ordering;

  `<2>default` fn `<1>Less`[self: Self](u: U) -> bool {
    `<3>return self.Compare(u) == Ordering.Less;`
  }
  default fn LessOrEquivalent[self: Self](u: U) -> bool {
    let c: Ordering = self.Compare(u);
    return c == Ordering.Less or c == Ordering.Equivalent;
  }

  default fn Greater[self: Self](u: U) -> bool {
    return self.Compare(u) == Ordering.Greater;
  }
  default fn GreaterOrEquivalent[self: Self](u: U) -> bool {
    let c: Ordering = self.Compare(u);
    return c == Ordering.Greater or c == Ordering.Equivalent;
  }
}
```

{{% note %}}

We can do this by adding more methods to the interface that types can implement
like `Less`. But in order to not break existing types, we use the `default`
keyword and provide a definition in terms of the original `Compare`. This allows
all the existing code to continue working, but subsequently begin to implement
these more nuanced APIs specially if that is desirable.

This technique both supports evolution, where the defaults are eventually
removed once all the users ave updated, as well as specializing when we want to
provide meaningful defaults that can be overridden when there is special
behavior.

{{% /note %}}

---

## Conditional, _generic_ customization points

```carbon
interface `Printable` {
  fn `Print`[self: Self]();
}

class `Vector(template T:! type)` { ... }

impl `forall` [`T`:! `Printable`] `Vector(T)` as Printable {
  fn Print[self: Self]() {
    var first: bool = true;
    for (elem: `T` in self) {
      if (not first) { ", ".Print(); }
      `elem.Print()`;
      first = false;
    }
  }
}
```

{{% note %}}

And because we are building these on top of a generics system, you can build
generic versions that _conditionally_ customize behavior.

{{% /note %}}

---

## <span class="fragment strike">Implicit</span> conversions with customization points

{{% note %}}

The next foundational thing builds on the previous and the generic systems here:
we can base all of our implicit conversion support on top of these customization
points, rather than as separate language features.

No need to mix both conversion operators and implicit constructors, all of it
can be handled in one place.

We can even cleanly layer it with _explicit_ conversions that can be modeled the
same way!

{{% /note %}}

---

## Explicit conversion customization point

```carbon{}
interface `As`(`Dest:! type`) {
  fn `Convert`[self: Self]() -> `Dest`;
}

`impl String as As`(`Path`) {
  fn Convert[self: String]() -> Path {
    return `Path.FromString`(self);
  }
}

let config_file: Path = `"/etc/myutil.cfg" as Path`;
//                      => ("/etc/myutil.cfg").(`As(Path)`.`Convert`)()
```

{{% note %}}

Just walk through the code. another chance for folks to learn this part of
Carbon

{{% /note %}}

---

## Implicit conversion customization point

```carbon{}
interface `ImplicitAs`(Dest:! type) {
  `extends As(Dest)`;
  // Inherited from As(Dest):
  // fn `Convert`[self: Self]() -> Dest;
}

impl `String as ImplicitAs(StringView)` {
  fn Convert[self: String]() -> StringView {
    return StringView::Make(self.Data(), self.Data() + self.Size());
  }
}

fn Greet(s: StringView) { Print("Hello, {0}", s); }

fn Main() -> i32 {
  `Greet`(`"audience"`);
  // => Greet(("audience").(`ImplicitAs(StringView)`.`Convert`)()
  return 0;
}
```

{{% note %}}

Walk through this code as well.

{{% /note %}}

---

## Implicit conversion conditional defaults

```carbon{}
impl `forall` [`U:! type`, `T:! As(U)`]
     `Optional(T)` as `As(Optional(U))`;

impl forall [U:! type, T:! `ImplicitAs(U)`]
     Optional(T) as ImplicitAs(Optional(U));

impl forall [T:! type]
     `NullOpt` as `ImplicitAs(Optional(T))`;
```

{{% note %}}

We can now combine the other powerful features like conditional implementation
to provide conditional implicit conversions in expected places using generic
code.

And this gives us a huge amount of power. Because we're modeling this with the
generics system, we can do things like have good defaults expressed with a
conditional implementation, and still allow specialization in cases where the
default isn't actually right.

The point here is how much more powerful this unified model is because we built
it on the foundations of generics.

{{% /note %}}

---

## Fundamentally more expressive customization

{{% note %}}

The tools here are fundamentally more expressive. Let's consider something
that we don't have any good way of applying ADL or CPOs to: _types_!

{{% /note %}}

---

## This works! ✅

```cpp{}
class `Base` {};
class `Derived` : public Base {};

void Test(`Base *b`);

void Example(bool condition) {
  `Base b`;
  `Derived d`;


  // ✅
  Test(`condition ? &b : &d`);





  //...
}
```

---

## This works in either direction! ✅

```cpp{}
class Base {};
class Derived : public Base {};

void Test(Base *b);

void Example(bool condition) {
  Base b;
  Derived d;


  // ✅✅
  Test(condition ? &b : &d);
  Test(`condition ? &d : &b`);




  //...
}
```

---

## But does this? <span class="fragment">😞</span>

```cpp{}
class Base {};
class `DerivedA` : public Base {};
class `DerivedB` : public Base {};
void Test(Base *b);

void Example(bool condition) {
  Base b;
  `DerivedA da`;
  `DerivedB db`;

  // ✅✅
  Test(condition ? &b : &db);
  Test(condition ? &da : &b);

  // ???
  Test(`condition ? &da : &db`);

  //...
}
```

<div class="fragment">

❌ error: incompatible operand types (`DerivedA *` and `DerivedB *`)

</div>

{{% note %}}

Nope!

And we don't even really have a way of fixing this in C++ because how do we
customize on this? It would be a customization point that doesn't just take a
type as an _input_ but produces it as an output?

I guess we could do something fairly tricky like have a function which _if it
were called_ would return the common type, and then call it in an unevaluated
context, get the return type, and use that?

But ... wow...

{{% /note %}}

---

## We can make this easy in Carbon

```carbon{}
interface `CommonTypeWith`(`U:! type`) {
  `let Result:! type`
    `where` `Self impls ImplicitAs`(`.Self`) and
          `U impls ImplicitAs`(`.Self`);
}

class `InternedString` { ... }
impl `InternedString` as `CommonTypeWith(String)`
  where `.Result = StringView` {}

fn SelectString(condition: bool, s: String, i: InternedString) -> StringView {
  // Carbon version of ``... ? ... : ...`` in C++:
  return `if condition then s else i`;
}
```

{{% note %}}

Because the generics system works in types already, it is easy for us to select
a type in a customization point rather than calling a function.

{{% /note %}}

---

## Customizable `CommonType` opens even more doors

```carbon{}
fn SelectLongString(s: String, i: InternedString, v: StringView) -> `auto` {
  if (s.Size() > 20) {
    `return s`;
  } else if (i.Size() > 20) {
    `return i`;
  } else {
    `return v`;
  }
}
```

{{% note %}}

And once we have this more powerful common type model, we can even imagine
building still more on top of this. For example, we could use it to common the
types across different return statements when deducing a return type, etc.

This is another more powerful foundation we can build when we build on top of
generics.

{{% /note %}}

---

## Checked generics build better language foundations {.r-fit-text}

## These better foundations make _generics_ better! {.fragment}

{{% note %}}

The point throughout, is that checked generics enable you to build significantly
_better_ language foundations.

But it goes beyond that. When you build the foundations of the language on a
checked generics system, a strange thing happens. It gives you a _better checked
generics system_.

{{% /note %}}

---

## Foundations _built_ with checked generics<br/>become _available within_ checked generics

{{% note %}}

Every language foundation built on top of the checked generics system is just
trivially available within generic checked generic code.

{{% /note %}}

---

## Operator overloads in checked generic code

```carbon{1-18}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;
  impl as MulWith(f64) where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point;
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(f64).Op)(scale)
}

fn GenericDouble[T:! MulWith(f64)](x: T) -> auto {
  let scale: f64 = 2.0;
  return x * scale;
  // => p.(MulWith(f64).Op)(scale)
}
```

---

## Operator overloads in checked generic code

```carbon{1-4,20-24}
interface MulWith(U:! type) {
  let Result:! type = Self;
  fn Op[self: Self](rhs: U) -> Result;
}

class Point {
  var x: f64;
  var y: f64;
  impl as MulWith(f64) where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point;
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(f64).Op)(scale)
}

fn GenericDouble[`T:! MulWith(f64)`](`x: T`) -> auto {
  let scale: f64 = 2.0;
  return `x * scale`;
  // => p.(MulWith(f64).Op)(scale)
}
```

---

## Operator overloads in checked generic code

```carbon{1-4,20-24}
interface MulWith(U:! type) {
  let `<5>Result`:! type = Self;
  fn Op[self: Self](rhs: U) -> `<4>Result`;
}

class Point {
  var x: f64;
  var y: f64;
  impl as MulWith(f64) where .Result = Point {
    fn Op[self: Self](scale: f64) -> Point;
  }
}

fn Double(p: Point) -> auto {
  let scale: f64 = 2.0;
  return p * scale;
  // => p.(MulWith(f64).Op)(scale)
}

fn GenericDouble[T:! `<2>MulWith(f64)`](x: T) -> `<3>auto` {
  let scale: f64 = 2.0;
  return x * scale;
  // => p.(`<1>MulWith(f64)`.Op)(scale)
}
```

{{% note %}}

How do you use an operator overload within a generic function? We literally
already have every tool needed. Because the foundation was built on this.

{{% /note %}}

---

## Same pattern provides generic implicit conversions, common types, etc.

{{% note %}}

How can we expose implicit conversions to generic code and handle them properly?
We already know!

{{% /note %}}

---

## Systematically generic language foundations ensure that generic code is _just code_

{{% note %}}

And if we do this _systematically_ across the language, we'll get something that
has been a long-standing goal of generic programming in C++ -- we'll get _the
same_ language both in generics and outside. Code in a generic will _just be
code_. No separate rules or techniques needed, because all the foundations and
infrastructure your code relies on is always, intrinsically, built ready for use
in a generic.

{{% /note %}}
