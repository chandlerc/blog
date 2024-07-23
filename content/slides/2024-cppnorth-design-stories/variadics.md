+++
weight = 2
outputs = ["Reveal"]
+++

# Let's talk about variadics!

---

```cpp{}
template <typename T, typename ...Ts>
auto Min(T first, Ts... rest) -> T;

template <`typename ...Ts`>
auto Normalize(`Ts... values`) -> void {
  double min = Min(`*values...`);

  ((`*values -= min`)`, ...`);
}
```

{{% fragment %}}
### What does this code _mean_?
{{% /fragment %}}

{{% fragment %}}
### Is it _correct_?
{{% /fragment %}}

{{% note %}}

Let's start by looking at some relatively normal C++ variadic code. A normalize
function that in turn calls a min function.

:walk through code:

Right? Any problems?

{{% /note %}}

---

```cpp{}
template <typename T, typename ...Ts>
auto Min(`<0>T` first, `<0>Ts`... rest) -> `<0>T`;

template <typename ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

{{% note %}}

Well first, I'm accepting by value and returning by value... That's probably not
what I want in reality. But I don't really want to give a whole talk about const
references and forwarding references and `std::forward`.

So for the sake of the presentation, we're just going to assume these are all
nice register-like things -- integers, floating point numbers, etc, and use
values. Don't use slide code in production folks. =]

{{% /note %}}

---

```cpp{}
template <typename T, `<0>typename ...Ts`>
auto Min(T first, Ts... rest) -> T;

template <typename ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

{{% note %}}

OK, but there are some other issues here...

Why do I have variadic _types_? I don't really want that. Heterogenous ordering
comparisons are... not great. What I'd really like is to have a single type. But
this is... tricky in C++.

{{% /note %}}

---

```cpp{}
template <typename T, typename ...Ts>
  `requires` (`std::same_as<T, Ts>` `&& ...`)
auto Min(T first, Ts... rest) -> T;

template <typename ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

---

```cpp{}
template <typename T, `std::same_as<T>` ...Ts>
auto Min(T first, Ts... rest) -> T;

template <typename ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

{{% fragment %}}
```cpp{}
auto Test(ssize_t a, ssize_t b) -> int {
  return Min(`a`, `b`, `0`);
}
```
{{% /fragment %}}

{{% fragment %}}
### ❌ error: no matching function for call to 'Min'
{{% /fragment %}}

{{% note %}}

{{% /note %}}

---

```cpp{}
template <typename T, `std::convertible_to<T>` ...Ts>
auto Min(T first, Ts... rest) -> T;

template <typename ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

{{% fragment %}}
### ✅
{{% /fragment %}}

---

```cpp{}
template <typename T, std::convertible_to<T> ...Ts>
auto Min(T first, Ts... rest) -> T;

template <`typename ...Ts`>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

{{% note %}}

However, how do we fix `Normalize`? We don't have a separate parameter here, but
we don't really need one because this was *only* supposed to work with a single
specific type. We can fix that probably.... And because we're going to *store*
through this type we don't even have to deal with the weird conversion
excitement.

{{% /note %}}

---

```cpp{}
template <typename T, std::convertible_to<T> ...Ts>
auto Min(T first, Ts... rest) -> T;

template <`std::same_as<double*>` ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(*values...);

  ((*values -= min), ...);
}
```

---

```cpp{}
template <typename T, std::convertible_to<T> ...Ts>
auto Min(T first, Ts... rest) -> T;

template <std::same_as<double*> ...Ts>
auto Normalize(Ts... values) -> void {
  double min = Min(`*values...`);

  ((*values -= min), ...);
}
```

{{% note %}}

Ok, so is this code correct?

Nope...

How do we know? How can we actually easily reason about why this code is still
wrong?

I don't know about you, but I really struggle with this. I can write tons of
tests and maybe I will catch all the corner cases, but I don't feel like I even
understand what I'm chasing....

{{% /note %}}

---

## Really hard to think about variadics

{{% note %}}

I think for me, this is because variadics are really hard to think about.

Let's look at a simpler problem: generic code and templates.

{{% /note %}}

---

```cpp{}
template <typename `<1>T`> auto Min(T left, T right) -> T {
  if (`<2>left < right`) {
    `<3>return` left;
  } else {
    `<3>return` right;
  }
}
```

{{% note %}}

With most templates, while C++ does its whole instantiation thing, that's not
how I think about them, and not how a lot of teaching talks about them.

Instead we model these as _generic programming_, where we have some generic idea
of how our type `T` works [highlight type here] like that it is "ordered"
[highlight the `<`] and "copyable" [highlight the returns].

{{% /note %}}

---

```cpp{}
template <typename T> auto Min(T left, T right) -> T
    `requires` `std::copyable<T>` && `std::totally_ordered<T>` {
  if (left < right) {
    return left;
  } else {
    return right;
  }
}
```

{{% note %}}

We can even annotate the code with the concepts saying that `T` has these
properties.

And while C++ concepts are frustrating in that they don't let us actually type
check this function definition, I can still reason about whether the code is
correct using this model.

In essence, even when writing in C++ without definition checking of templates, I
still try to write them as _generic_ code with some kind of symbolic types in a
way that _would_ type check.

So this is my _model_ for reasoning about templates in C++. But with variadics...

{{% /note %}}

---

## Really hard to think about variadics:

## I don't have a good model!

{{% note %}}

I don't have that good model! And that's why it's so hard for me to reason about
them.

Well, cool, that tells me how I could be a lot more comfortable with variadic
code and reasoning about it as the author: I need a model!

{{% /note %}}

---

## Recently helping design how _generic_ variadics might work for Carbon

{{% note %}}

So this is where Carbon comes back in. It happens that recently recently, one of
the Carbon contributors was working on figuring out how we want to model
variadics in Carbon.

Remember, Carbon's goal is to have seamless C++ interoperability and migration.
That means we need a really good model for integrating not just *template* APIs
into Carbon, but also *variadic* APIs.

We really want to get to definition-checked generics in Carbon, and have design
a generics system around having that *with* support for C++-style templates. But
now we need to extend this to variadics. And because Carbon's generics are
definition checked, we'll need Carbon *variadics* to also be definition checked.

At first, I was mostly interested in this for the sake of Carbon and its
generics...

{{% /note %}}

---

## Surprise: most languages with generics don't have variadics

{{% note %}}

Surprisingly, there aren't a lot of languages with definition checked generic programming systems *and* with variadics.

When we started researching this space, there were _none_. Not Rust, nothing.
Just after we started, Swift actually added variadics. We even had some great
design discussions with some folks from the Swift team about their model and
learned a bunch from it.

But it is a really fascinating problem space...

{{% /note %}}

---

## To dig into the Carbon variadics design, we need a quick crash course on Carbon syntax

{{% note %}}

But to dig into this, we're going to super quick crash course in Carbon
syntax.... Bear with me a bit.

{{% /note %}}

---

```carbon{}
fn `SmallestFactor``(n: i32)` -> `(i32, bool)` {
  `let limit: i32` = Math.Sqrt(n) `as i32`;
  `var i: i32` = 2;
  while (i <= limit) {
    if (n % i == 0) {
      return `(i, false)`;
    }
    i += 1;
  }
  return `(n, true)`;
}

fn IsPrime(n: i32) {
  let (`factor: i32`, `has_factor: bool`) = SmallestFactor(n);
  return not has_factor;
}
```

{{% note %}}

:walk through code:

{{% /note %}}

---

```carbon{}
fn Print[`<4>P`:! `<5>Printable`](`<3>arg: P`);

fn GenericSum[`<0>T:! Core.Add`](x: `<1>T`, y: `<1>T`) -> `<1>T` {
  `<2>Print(x)`;
  return x + y;
}
```

{{% fragment %}}
❌ error: `T` doesn't implement `Printable`
{{% /fragment %}}

{{% note %}}

:walk through code:

TODO: maybe add a template variant that does compile, etc.

{{% /note %}}

---

## Ok, so how do we build a variadics system here?

{{% note %}}

Now that we have some Carbon syntax, let's talk about how we can think about
variadics when we *have* to check the definitions...

First we need some syntax for variadics. And we'd like that syntax to not be so
cumbersome as we saw in C++ because that's part of what, at least for me, gets
in the way of seeing a more principled model for how the code should work. So
the first thing we do is strip back all the distractions and oddities of syntax
and try to get something very clean.

{{% /note %}}

---

```carbon{}
// Computes the sum of its arguments
fn IntSum(`<0>... each param: i64`) -> i64 {
  var sum: i64 = 0;
  `... sum += each param;`
  return sum;
}

// Computes the sum of the squares of its arguments
fn SumOfSquares(`<0>... each param: i64`) -> i64 {
  return IntSum(`... each param * each param`);
}
```

---
{{< slide class="auto-advance" >}}

```carbon{}
// Computes the sum of its arguments
fn IntSum(... `<0>each param`: i64) -> i64 {
  var sum: i64 = 0;
  ... sum += `<1>each param`;
  return sum;
}

// Computes the sum of the squares of its arguments
fn SumOfSquares(... `<0>each param`: i64) -> i64 {
  return IntSum(... `<1>each param` * `<1>each param`);
}
```

---
{{< slide class="auto-advance" >}}

```carbon{}
// Computes the sum of its arguments
fn IntSum(... each param: i64) -> i64 {
  var sum: i64 = 0;
  `...` `sum += each param``;`
  return sum;
}

// Computes the sum of the squares of its arguments
fn SumOfSquares(... each param: i64) -> i64 {
  return IntSum(`...` `each param * each param`);
}
```

---
{{< slide visibility="hidden" >}}

```carbon{}
// Concatenates its arguments, which are all convertible to String
fn StrCat[`... each T:! StringLike`](`... each param: each T`) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);
  ... result.Append(each param.ToString());
  return result;
}



```

---
{{< slide visibility="hidden" >}}

```carbon{}
// Concatenates its arguments, which are all convertible to String
fn StrCat[... each T:! StringLike](`<0>... each param: each T`) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);
  ... result.Append(each param.ToString());
  return result;
}

//                             (`<0>... ((each param): (each T))`)

```

---
{{< slide visibility="hidden" >}}

```carbon{}
// Concatenates its arguments, which are all convertible to String
fn StrCat[... each T:! StringLike](... `<0>each param: each T`) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);
  ... result.Append(each param.ToString());
  return result;
}

//                             (... (`<0>(each param): (each T)`))

```

---
{{< slide visibility="hidden" >}}

```carbon{}
// Concatenates its arguments, which are all convertible to String
fn StrCat[... each T:! StringLike](... `<0>each param`: `<1>each T`) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);
  ... result.Append(each param.ToString());
  return result;
}

//                             (... ((`<0>each param`): (`<1>each T`)))

```

{{% note %}}

:walk through code:

{{% /note %}}

---
{{< slide visibility="hidden" >}}

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}

fn StrCat[... each T:! StringLike]
    (... each param: each T) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);

  ... result.Append(each param.ToString());
  return result;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}

template <StringLike... Ts>
std::string StrCat(const Ts&... params) {
  std::string result;
  result.reserve(
      (params.Length() + ... + 0));


  StrCatImpl(&result, params...);
  return result;
}

void StrCatImpl(std::string* out) {
  return;
}

template <StringLike T, StringLike... Ts>
void StrCatImpl(std::string* out,
                const T& first,
                const Ts&... rest) {
  out->append(first.ToString());
  StrCatImpl(out, rest...);
}
```

</div>
</div>

{{% note %}}

Let's briefly walk through this more complete example in Carbon with C++ code to
really show how these things line up. Because while this is a Carbon feature, it
actually has a really great correspondence to C++.

{{% /note %}}

---
{{< slide visibility="hidden" >}}

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}

fn StrCat[... each T:! StringLike]
    (... each param: each T) -> String {
  var len: i64 = 0;
  ... len += each param.Length();
  var result: String = "";
  result.Reserve(len);

  ... result.Append(each param.ToString());
  return result;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}

template <StringLike... Ts>
std::string StrCat(const Ts&... params) {
  std::string result;
  result.reserve(
      (params.Length() + ... + 0));


  (result.append(params.ToString()), ...);
  return result;
}
```

</div>
</div>

{{% note %}}

In this case we have something extremely close to the `template for` in C++ that
we'd like, but it can be a bit surprising -- we can use a fold expression with
the comma operator to get an expanded *expression*, even though it doesn't
support all kinds of statements.

{{% /note %}}

---

## Now that we have a nice syntax,<br/>what does our `Normalize` look like?

{{% note %}}



{{% /note %}}

---

```carbon{}
fn Min[`T`:! `Ordered & Copyable`](`first: T`, `... each next: T`) -> `T`;

fn Normalize(... `each value`: `f64*`) {
  let min: f64 = Min(`...` `*``each value`);

  `...` `*each value` `-=` `min`;
}
```

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}


fn Min[`<0>T:! Ordered & Copyable`]
    (`<2>first: T`, `<3>... each next: T`) -> T;


fn Normalize(... `<6>each value`: `<4>f64*`) {
  let min: f64 = Min(`<7>... *each value`);

  `<8>... *each value -= min;`
}
```

</div>
<div class="col" style="order: 2">

```cpp{}

template <`<0>typename T`,
          `<1>std::convertible_to<T> ...Ts`>
auto Min(`<2>T first`, `<3>Ts... rest`) -> T;

template <`<4>std::same_as<double*>` `<5>...Ts`>
auto Normalize(Ts... `<6>values`) -> void {
  double min = Min(`<7>*values...`);

  `<8>((*values -= min), ...);`
}
```

</div>
</div>


{{% note %}}

:walk through code:

{{% /note %}}

---

## But how do we type check it?

## What's the _model_?

{{% note %}}



{{% /note %}}

---

## Type checking packs and pack expansions

{{% note %}}



{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //
  // What are the types?



  ... Print(2 * each x);

}
```

{{% note %}}

Let's start simple by just type checking a pack expansion. There are casts here to make it extra clear what the type of everything is.

{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                        ^^^^^^^^                  ^^^^^^^^^^
  // What are the types?      `<0>i32`                        `<0>f32`



  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---
{{< slide class="auto-advance" >}}

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?                   `???`



  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?      `‖each param‖` repetitions of `i64`



  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?            ⟪`i64`; `‖each param‖`⟫



  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?   ⟬  `i32`,  `⟪i64; ‖each param‖⟫`,    `f32`    ⟭



  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---
{{< slide class="auto-advance" >}}

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?   ⟬  i32,  ⟪i64; ‖each param‖⟫,    f32    ⟭
  //
  // `Not Carbon syntax`! Just for illustrating the type checking logic!

  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?   ⟬  i32,  ⟪i64; ‖each param‖⟫,    f32    ⟭
  //
  // Also type of ``x``:     `⟬  i32,  ⟪i64; ‖each param‖⟫,    f32    ⟭`

  ... Print(2 * each x);

}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn F(... each param: i64) {
  let (... each x: auto) = (1 as i32, ... each param, 1.0 as f32);
  //                                  ^^^^^^^^^^^^^^
  // What are the types?   ⟬  i32,  ⟪i64; ‖each param‖⟫,    f32    ⟭
  //
  // Also type of ``x``:     ⟬  `<2>i32`,  `<4>⟪i64; ‖each param‖⟫`,    `<6>f32`    ⟭

  ... Print(`<0>2` * `<1>each x`);
  // Type of ``2 * each x``: ⟬  `<3>i32`,  `<5>⟪i64; ‖each param‖⟫`,    `<7>f32`    ⟭
}
```

{{% note %}}


{{% /note %}}

---

```carbon{}
fn G(... each param: i64) {
  let (... each a: auto) = (1 as i32, ... each param);
  let (... each b: auto) = (1 as f64, ... each param);

  // Type of ``a``:               ⟬ `i32`, `⟪i64; ‖each param‖⟫` ⟭
  // Type of ``b``:               ⟬ `f64`, `⟪i64; ‖each param‖⟫` ⟭

  ... Print(each a * each b);

  // Type of ``each a * each b``: ???
}
```

---

```carbon{}
fn G(... each param: i64) {
  let (... each a: auto) = (1 as i32, ... each param);
  let (... each b: auto) = (1 as f64, ... each param);

  // Type of ``a``:               ⟬ `<2>i32`, `<5>⟪i64; ‖each param‖⟫` ⟭
  // Type of ``b``:               ⟬ `<3>f64`, `<6>⟪i64; ‖each param‖⟫` ⟭

  ... Print(`<0>each a` * `<1>each b`);

  // Type of ``each a * each b``: ⟬ `<4>f64`, `<7>⟪i64; ‖each param‖⟫` ⟭
}
```

---

### Type checking packs and pack expansions

- Pack and tuple types are sequences of _segments_
    - A segment consists of a type and an arity
    - Lets us represent repetition and arity explicitly but generically
- Inside a pack expansion, all expressions and patterns have pack types
    - And they must all have the same shape
- Type check by looping over the segments of the pack types

{{% note %}}

So this starts to build a much more formal model for how variadics *work* and
what they *mean*. We can reason much more precisely with this about what would
be correct and incorrect, etc. Nice!

But it's not quite enough for our example...

{{% /note %}}

---

## Type checking variadic pattern matching & function calls

{{% note %}}

We also need to have variadic pattern matching as that's how function calls
work...

{{% /note %}}

---

```carbon{}
fn IntSum(... each param: i64) -> i64;
//
//

fn Average(... each x: i32) ->  i32 {
//
//

  let sum: i64 = IntSum(... each x);
  //
  //

  return (sum as f64) / Count(... each x);
  //
  //
}
```

---

```carbon{}
fn IntSum(... each param: i64) -> i64;
//        ^^^^^^^^^^^^^^^^^^^
//                  ---------------------------------> ⟬⟪`<2>i64`; `<4>‖each param‖`⟫⟭

fn Average(... each x: i32) ->  i32 {
//         ^^^^^^^^^^^^^^^
//                -----------------------------------> ⟬⟪i32; ‖each x‖⟫⟭

  let sum: i64 = IntSum(... each x);
  //                    ^^^^^^^^^^
  //                         ------------------------> ⟬⟪`<1>i32`; `<3>‖each x‖`⟫⟭

  return (sum as f64) / Count(... each x);
  //                          ^^^^^^^^^^
  //                               ------------------> ⟬⟪i32; ‖each x‖⟫⟭
}
```

{{% note %}}

Walk through each each component.

Two things we need to type check here: the types and arities of each segment.

The type `i32` can implicitly convert to `i64`, so that type checks.

The arity `|param|` is deduced from `|x|` so thay will match.

And the `Count` let's just imagine returns its arity, so it too will type check.

It type checks! But... Anyone spot the bug?

It divides by zero! Let's fix that...

{{% /note %}}

---

```carbon{}
fn IntSum(... each param: i64) -> i64;
//        ^^^^^^^^^^^^^^^^^^^
//                  ---------------------------------> ⟬⟪i64; ‖each param‖⟫⟭

fn Average(first: i32, ... each next: i32) ->  i32 {
//
//

  let sum: i64 = IntSum(first, ... each next);
  //
  //
  //
  //

  return (sum as f64) / (1 + Count(... each next));
  //
  //
}
```

---

```carbon{}
fn IntSum(... each param: i64) -> i64;
//        ^^^^^^^^^^^^^^^^^^^
//                  ---------------------------------> ⟬⟪`<1>i64`; `<2>‖each param‖`⟫⟭

fn Average(first: i32, ... each next: i32) ->  i32 {
//                     ^^^^^^^^^^^^^^^^^^
//                             ----------------------> ⟬⟪i32; ‖each next‖⟫⟭

  let sum: i64 = IntSum(first, ... each next);
  //                           ^^^^^^^^^^^^^
  //                                 ----------------> ⟬⟪i32; ‖each next‖⟫⟭
  //                    ^^^^^^^^^^^^^^^^^^^^
  //                             --------------------> ⟬⟪`<1>i32`; `<2>1`⟫, ⟪`<1>i32`; `<2>‖each next‖`⟫⟭

  return (sum as f64) / (1 + Count(... each next));
  //                               ^^^^^^^^^^^^^
  //                                      -----------> ⟬⟪i32; ‖each next‖⟫⟭
}
```

{{% note %}}

So this is a bit more complex, but we can see what we need to do.

When we have a single variadic pattern, which means a single pattern _segment_,
we need to walk over each argument segment and make sure it type checks. The
first segment is `i32` which implicitly converts to `i64`, and so is the second
segment.

Then we deduce the arity of the pattern segment by summing the arities of the
argument segments, so `‖each param‖ == 1 + ‖each next‖`, which is fine.

And now its OK that we get a zero count.

Ok, slowly we're getting closer to our example. Let's keep building up by adding
some generic types.

{{% /note %}}

---
{{< slide visibility="hidden" >}}

```carbon{}

fn StrCat[... each T:! StringLike]
//
//
    (... each param: each T) -> String;
//
//

fn Print[S:! StringLike](str: S);

fn PrintAll[... each U:! StringLike](... each x: each U) {
//
//
  Print(StrCat(... each x));
  //
  //
}
```

---
{{< slide visibility="hidden" >}}

```carbon{}

fn StrCat[... each T:! StringLike]
//        ^^^^^^^^^^^^^^^^^^^^^^^
//                   -----------------------------> ⟬⟪`<2>StringLike`; ‖each param‖⟫⟭
    (... each param: each T) -> String;
//   ^^^^^^^^^^^^^^^^^^^^^^
//              ----------------------------------> ⟬⟪`<1>each T`; `<3>‖each param‖`⟫⟭

fn Print[S:! StringLike](str: S);

fn PrintAll[... each U:! StringLike](... each x: each U) {
//          ^^^^^^^^^^^^^^^^^^^^^^^
//                     ---------------------------> ⟬⟪`<2>StringLike`; ‖each x‖⟫⟭
  Print(StrCat(... each x));
  //           ^^^^^^^^^^
  //                ------------------------------> {⟪`<1>each U`; `<3>‖each x‖`⟫
}
```

{{% note %}}

- Check that `each U` type checks when passed to `each T`.
  - To do that, look at the type of `each T` which is a generic constrained to be `StringLike`.
  - `each U` is also constrained to be `StringLike`, so that type checks
  - Doesn't matter that different argument `U`s might be different types -- can type check against the constraints on `U` directly.
- Deduce the arity of `|param|` from `|x|`

Type checks!

{{% /note %}}

---
{{< slide visibility="hidden" >}}

```carbon{}

fn StrCat[... each T:! StringLike]
//        ^^^^^^^^^^^^^^^^^^^^^^^
//                   -----------------------------> {<`<2>StringLike`; |param|>}
    (... each param: each T) -> String;
//   ^^^^^^^^^^^^^^^^^^^^^^
//              ----------------------------------> {<`<1>each T`; `<3>|param|`>}

fn Print[S:! StringLike](str: S);

fn PrintAll[... each U:! StringLike](... each x: each U) {
//          ^^^^^^^^^^^^^^^^^^^^^^^
//                     ---------------------------> {<`<2>StringLike`; |x|>}
  Print(StrCat("Everything: ", ... each x));
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                       -----------------------> ⟬⟪`<1>String`; `<3>1`⟫, <`<1>each U`; `<3>|x|`>⟭
}
```

{{% note %}}

Now we have multiple argument segments, so we have to iterate checking each one.

And as we're doing that, we're also deducing what `<each T; |param|>` has to be by concatenating the segments.

{{% /note %}}

---
{{< slide visibility="hidden" >}}

```carbon{}
fn StrAppend[... each T:! StringLike]
    (out: String*, ... each param: each T);
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                   ------------------------> ⟬⟪`<1>String*`; `<2>1`⟫, <`<3>each T`; `<4>|param|`>⟭

fn StrCat[... each U:! StringLike]
    (... each x: each U) -> String {
  returned var result: String;

  StrAppend(&result, ... each x);
  //        ^^^^^^^^^^^^^^^^^^^
  //                -------------------------> ⟬⟪`<1>String*`; `<2>1`⟫, <`<3>each U`; `<4>|x|`>⟭

  return result;
}
```

{{% note %}}

Now we have two argument segments *and* two parameter segments.

But we know the first argument segment will match against the first parameter
segment, and only that segment, because of their arity.

By elimination, that means the second one has to match the second parameter
segment, and only that.

So we check each of these directly and find that they match.

What if the segments don't line up? It's finally time to get back to our initial
example!

{{% /note %}}

---

```carbon{}
fn Min[T:! Ordered & Copyable]
    (first: T, ... each rest: T) -> T;
//
//

fn Normalize(... each value: f64*) {
  let min: f64 = Min(... *each value);
  //
  //
  //
  //

  ... *each value -= min;
}
```

{{% note %}}

So we have our min example, at last! And unlike in C++, let's reason about how
it type checks.

First, add the relevant type checking state...

{{% /note %}}

---

```carbon{}
fn Min[T:! Ordered & Copyable]
    (first: T, ... each next: T) -> T;
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^
//               --------------------------------> ⟬⟪`<1>T`; `<2>1`⟫, ⟪`<1>T`; `<2>‖each next‖`⟫⟭

fn Normalize(... each value: f64*) {
  let min: f64 = Min(... *each value);
  //                 ^^^^^^^^^^^^^^^
  //                         --------------------> ⟬⟪`<1>f64`; `<2>‖each value‖`⟫⟭
  //
  //

  ... *each value -= min;
}
```

{{% note %}}

So we call `Min` with the `⟬⟪f64; ‖each value‖⟫⟭` type segment structure.

This lets us deduce `T` as `f64` just fine.

But then we try to deduce the arity, and we have a problem....

{{% /note %}}

---

```carbon{}
fn Min[T:! Ordered & Copyable]
    (first: T, ... each next: T) -> T;
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^
//               --------------------------------> ⟬⟪T; 1⟫, ⟪T; ‖each next‖⟫⟭

fn Normalize(... each value: f64*) {
  let min: f64 = Min(... *each value);
  //                 ^^^^^^^^^^^^^^^
  //                         --------------------> ⟬⟪f64; ‖each value‖⟫⟭
  // Deduce arity: `<1>1 + ‖each next‖` = `<1>‖each value‖`
  //                   `<2>‖each next‖` = `<2>‖each value‖ - 1`  `<3>❌ error!`

  ... *each value -= min;
}
```

{{% note %}}

But when we deduce the arity for `|next|`, something bad happens. We end up
subtracting from the arity `|value|` which is impossible because it might be zero.
We can't deduce a *negative* arity. So this doesn't type check and we reject it.

Now, let's pause and think about this. We reject this code when we see the
definition of `Normalize`... **which is a generically variadic function**!!!

We don't yet know what the arity of |x| will be. But we can point out that this
variadic function call is fundamentally incorrect. We don't have to remember to
write a test case that passes an empty list of things to `Normalize` to notice
this bug. We get it immediately and from the type system!

{{% /note %}}

---

## We have a model now!!

{{% note %}}

Fundamentally, _this_ is the model we can use to think about variadics. We map
it into segments of type sequences and then can reason about those!

And we can do interesting stuff with it! For example...

{{% /note %}}

---

```carbon{}
fn Min[T:! Ordered & Copyable]
    (first: T, ... each next: T) -> T;
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^
//               --------------------------------> ⟬⟪`<2>T`; `<3>1`⟫, ⟪`<2>T`; `<3>‖each next‖`⟫⟭

fn Normalize(... each value: f64*, extra: f64*) {
  // Bundle up our arguments...
  let (... each arg: f64*) = (... each value, `<0>extra`);

  let min: f64 = Min(... *each arg);
  //                 ^^^^^^^^^^^^^
  //                       ----------------------> ⟬⟪`<2>f64`; `<3>‖each value‖ + 1`⟫⟭
  // Deduce arity: `<4>1 + ‖each next‖` = `<4>‖each value‖ + 1`
  //                   `<5>‖each next‖` = `<5>‖each value‖`     `<6>✅`

  ... *each arg -= min;
}
```

{{% note %}}

We can adjust our `Normalize` function, and even when we bundle up the arguments
and then unpack them into `Min`, we have more symbolic information about the
arity here. So we can prove that the arity we would deduce will be non-negative,
and we're off to the races!

Without a model like this, I think it is incredibly hard to reason about why
these two versions of the `Normalize` function are differently robust.

{{% /note %}}

---

## What about harder cases? 🤔

{{% note %}}

What about harder cases? Hmmm...

{{% /note %}}

---

```carbon{}
fn Zip[First:! type, ... each Next:! type]
    (`<1>first: Vector(First)`, `<2>... each next: Vector(each Next)`)
    -> Vector((First, ... each Next));

fn F[... each T:! type](... each x: Vector(each T), y: Vector(i32)) {
  var z: auto = Zip(`<1>... each x`, `<2>y`);
}

```

{{% note %}}

So here we combine argument vectors into a vector of tuples. But we don't want
to do this when there is nothing to combine, so we break out the `first`
argument much like `Min` does.

However, when we call this in `F` we expand a pack of vectors first, and then
*append* a single vector at the end. The arity will work out here, but this
turns out to be a lot trickier to type check...

{{% /note %}}

---

## No time!

## Watch Geoffrey Romer's more in depth talk from CppNow!

{{% note %}}

This gets .... really complicated, quickly. So if you want, go check out Geoff's talk on this at CppNow for the rest of this. The core idea here ...

{{% /note %}}

---

## The key here is that we can use
## a _type system_ model to think about variadics!

{{% note %}}

is that we can use a _type system_ to think about variadic code! That's the model we need.

{{% /note %}}

---

## Designing this feature in Carbon helped uncover this for me

{{% note %}}

Helping design this feature in Carbon is what helped me finally see how to
really think about variadics in a principled way.

And just because we see it in Carbon, we can think about it in C++ as well...

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```carbon{}

fn Min[T:! Ordered & Copyable]
    (first: T, ... each next: T) -> T;


fn Normalize(... each value: f64*) {
  // Carbon's type system rejects
  // this here, and in C++...
  let min: f64 = Min(`... *each value`);

  ... *each x -= min;
}
```

</div>
<div class="col" style="order: 2">

```cpp{}
template <typename T,
          std::convertible_to<T> ...Ts>
auto Min(T first, Ts... rest) -> T;

template <std::same_as<double*> ...Ts>
auto Normalize(Ts... values) -> void {
  // ... it also may not compile if the
  // arity is deduced as zero!
  double min = Min(`...values`);

  (*values -= min, ...);
}
```

</div>
</div>

{{% note %}}

The code for these two _looks_ really different between the languages... But the
core structure and idea of how this code is intended to work and what it should
mean is really closely related.

This isn't an accident. The whole point of Carbon is to have an extremely high
fidelity match for C++ code patterns. But in addition to helping with all of
Carbon's goals, this means we can often take the ideas and principles we use to
design Carbon's features and they will apply really well for reasoning about C++
code.

We can even see where we might extend C++ in the future in really nice ways --
maybe instead of `template for` we should do something more like an expansion
statement, etc.

So this was a huge moment for me because I had always really struggled with
reasoning critically about API design of variadics and what the rules should be
and how I should do things. But now I have a model.

{{% /note %}}

---

## Cool!
## Variadics in Carbon reflect how C++ works!

{{% note %}}



{{% /note %}}

---

## Does this happen for anything else?

{{% note %}}

Perhaps surprisingly, yes... This is becoming a real pattern.

Let's look at another example.

{{% /note %}}
