+++
weight = 10
outputs = ["Reveal"]
+++

# The _why_ of checked generics

{{% note %}}

This is far from the first attempt to motivate checked generics, but I'd like to
go back over the core motivation and maybe showcase it a bit more directly to
help folks understand.

{{% /note %}}

---

## What are _checked_ generics?

- Fully type-checking the generic _definition_

_or_

- A finite set of constraints on the generic parameters that are both necessary
  _and sufficient_ to guarantee successful instantiation.

{{% note %}}

{{% /note %}}

---

{{< slide background-image="interstitial.jpg" >}}

## Let's start with C++20 constrained templates

{{% note %}}

Let's begin with the status quo, where C++ is today: C++20's constrained
templates using concepts.

{{% /note %}}

---

## C++20 constrained templates use _concepts_

- Fundamentally based around assertions of expression validity
  - The expressions, as given, must be _valid_
- Doesn't specify their semantics when valid
- Still rely on instantiation for semantics
  - That's when we can fully type check

{{% note %}}

{{% /note %}}

---

## Let's try to definition check with these

{{% note %}}

{{% /note %}}

---

<div class="code-with-fragment-indexes" data-fragment-indexes="0,1">

```cpp{|1-4|6-8}
template<typename D>
concept Display = requires(D &d, std::string_view sv) {
  `<1>d.Show(sv)`;
};

template<Display D> void hello(D &d) {
  `<2>d.Show("Hello, world!"sv)`;
}
```

</div>

{{% note %}}

Let's start simple. We have a concept, it says that an expression must be valid.
And in fact, that is the expression used in the template, so when the concept is
satisfied, the instantiation will succeed. Yay!

{{% /note %}}

---

```cpp{6-8|10-21|7,11,14}
template<typename D>
concept Display = requires(D &d, std::string_view sv) {
  d.Show(sv);
};

template<Display D> void hello(D &d, std::string name = "world") {
  d.Show("Hello, " + name + "!");
}

struct FormattedText {
  FormattedText(std::string_view);
};
struct MyDisplay {
  void Show(FormattedText text);
};
void test(MyDisplay &d, std::string_view sv) {
  // ✅: This is fine, so concept is satisfied!
  d.Show(sv);
  // ❌: This doesn't work though!
  hello(d);
}
```

{{% note %}}

But the code might be a bit more complex. Beyond the expression being valid, it
might be used in a context that will require some implicit conversions.

{{% /note %}}

---

```cpp{}
template<typename T> struct ConvertsTo {
  operator T();
};
template<typename D>
concept Display = requires(D &d, std::string_view sv1,
                           ConvertsTo<std::string_view> sv2) {
  `<1>d.Show(sv1)`;
  `<0>d.Show(sv2)`;
};
```

{{% note %}}

This is fixable though, we can add the implicit conversions to what is required
in the concept.

We still need to constrain that the function accepts the original type,
otherwise this might only work when given types that are _not_
`std::string_view`.

And this isn't enough...

{{% /note %}}

---

```cpp{}
template<typename T> struct ConvertsTo {
  operator T();
};
template<typename D>
concept Display = requires(D &d, std::string_view sv1,
                           ConvertsTo<std::string_view> sv2,
                           `<2>const std::string_view sv3`) {
  d.Show(sv1);
  d.Show(sv2);
  `<1>d.Show(std::move(sv1))`;
  `<2>d.Show(sv3)`;
  `<3>d.Show(std::move(sv3))`;
};
```

{{% note %}}

We also don't want this call to fail when given a const string_view lvalue,
rvalue, or a non-const string_view rvalue.

But it is starting to get ... very complex. We're having to encode a lot of
information into the concept... And sadly, we're far from done.

{{% /note %}}

---

```cpp{}
`<4>int` `<3>ScaleTime`(int time);
double ScaleTime(float time);
double ScaleTime(double time);
void RecordTime(`<5>double &time`);


template<Display D> void hello(D &d, std::string name = "world") {
  `<4>auto` time = `<3>ScaleTime`(d.Show("Hello, " + name + "!"));
  RecordTime(`<5>time`);
}

struct BadDisplay {
  `<2>double` Show(std::string_view);

  // Custom version.
  `<2>int` Show(`<1>std::string`);
};
```

{{% note %}}

There might be a more specific overload that intercepts the implicit conversion.
And this might not be a problem immediately. Instead, it just changes the return
type. And that return type might also be fine, but be used as argument to
another overloaded function. And the result of that might be locally fine, but
initialize an `auto` variable that then later on is used in a way that doesn't
support one particular type.

To build a concept that accurately rejects `BadDisplay` is really hard at this
point without baking the exact contents of the body of `hello` into it, and
essentially enumerating the type system of that function.

This is rapidly becoming a transcription of the actual type system into the
constraint.

And that's actually the point.

{{% /note %}}

---

## Definition checking C++20 concepts is _infeasible_, not _impossible_

- Requires building up a set of expression validity tests that fully subsume
  every step of type checking the definition
- Essentially, an observational record of the result of type checking
- In essence, builds a new type system in the constraint
  - But rather than expressed directly, expressed through indirect assertions
    that must cover every case

{{% note %}}

It's not that it is physically impossible to put sufficient constraints into a
C++20 concept to type check, it's that it is somewhat working backwards. We have
to in essence transcribe all of the _effects_ of type checking into the set of
valid expressions.

Rather than describing a type system directly, we describe it indirectly,
through a set of indirect assertions or observations about it. And then we are
forced to ensure this set of assertions covers every degree of freedom.

{{% /note %}}

---

# 😞

{{% note %}}

Ooof...

{{% /note %}}
