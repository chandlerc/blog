+++
weight = 3
outputs = ["Reveal"]
+++

# Binding members: `x.y`

{{% note %}}

What does this mean?

I know, it seems simple, but really, what does this mean?

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```cpp
class C {
 public:
  auto Method() const -> int;
  static auto Static() -> int;
  int field;
};

C x = {42};

// Could be so many things...
int _ = `x.Method`();
int _ = `x.Static`();
int _ = `x.field`;
```

</div>
<div class="col fragment" style="order: 2">

```carbon
class C {

  fn Method[self: Self]() -> i32;
  fn Static() -> i32;
  var field: i32;
};

var x: C = {.field = 42};

// Also in Carbon...
let _: i32 = `x.Method`();
let _: i32 = `x.Static`();
let _: i32 = `x.field`;
```

</div>
</div>

{{% note %}}



{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```cpp
class C {
 public:
  auto Method() const -> int;
  static auto Static() -> int;
  int field;
};

C x = {42};

// Could be so many things...
int _ = x.Method();
int _ = x.Static();
int _ = x.field;

// Different, but also mysterious...
??? _   = `C::Method`;
??? _   = `C::Static`;
??? _   = `C::field`;
```

</div>
<div class="col" style="order: 2">

```carbon
class C {

  fn Method[self: Self]() -> i32;
  fn Static() -> i32;
  var field: i32;
};

var x: C = {.field = 42};

// Also in Carbon...
let _: i32 = x.Method();
let _: i32 = x.Static();
let _: i32 = x.field;

// Carbon makes them more obviously related
let ??? = `C.Method`;
let ??? = `C.Static`;
let ??? = `C.field`;
```

</div>
</div>

{{% note %}}



{{% /note %}}

---

```cpp
// Could be so many things...
int _ = x.Method();
int _ = x.Static();
int _ = x.field;

// Different, but also mysterious...
??? _   = C::Method;
??? _   = C::Static;
??? _   = C::field;

// And so much more...
`<1>int C::*` pm = `<0>&C::field`;
int _ = `<2>x.*pm`;

`<4>int (C::* pmf)()` = `<3>&C::Method`;
int _ = `<5>(x.*pmf)()`;

// Plus `<6>inheritance`...
```

{{% note %}}



{{% /note %}}

---

## So, how do we design this in Carbon?

## Does that give us a model for C++ as well?

{{% note %}}



{{% /note %}}

---

## We'll need to understand a few more foundational features of Carbon...

{{% note %}}



{{% /note %}}

---

```carbon
// A description of an interface a type might implement. Similar to a C++0x
// concept, or Rust trait; this is the basis of Carbon generics.
`interface I` {  
  // This means the interface has an associated type.
  let `Result`:! type;
  // And a method returning that type.
  fn `Method`[self: Self]() -> `Result`;
}

// Implement the named interface for a type.
class `C` { ... }
`impl` `C` as `I` where `.Result = i32` {
  fn `Method`[self: Self]() -> `i32` `{ ... }`
}
var `x`: C = ...;

// And now can explicitly use interface on that type:
var i: i32 = `x`.`(I.Method)`();
// Same as:  x.((`C as I`).`Method`)()
// Same as:  (`x as I`).`Method()`

// Can also pass ``x`` to a definition-checked generic:
fn `Generic`[`T`:! `I`](`y: T`) -> `T.Result` { return `y.Method()`; }
var j: i32 = `Generic`(`x`);
```

{{% note %}}

This is the foundation of how we define all fundamental operations in Carbon
because that ensures those operations are available in generic contexts.

{{% /note %}}

---

```carbon
`interface` `BindToValue`(`T:! type`) {
  let `Result`:! type;
  fn `Op`[self: Self](`x: T`) -> `Result`;
}

let x: T = ...;

// The expression ``member_expr`` must be of a type that _implements_
// ``BindToValue(T)``, and we rewrite a special form of member binding in the
// expression ``x.(member_expr)``, similar to how we can call interface members,
// as follows. Note that ``⇝`` isn't Carbon syntax but I'll be using it to show
// the semantic rewrites we use to define the meaning of something.
`x`.(`member_expr`) `⇝` `member_expr`.(`BindToValue(T)`.`Op`)(`x`)
``` 

{{% note %}}

Ok, let's start putting together a model for member binding.

However, as a caveat, I'm simplifying several aspects of this for the purpose of
presentation. This isn't intended to be a complete overview of how this part of
Carbon works, just illustrating how it also helps us understand a complex and
subtle part of C++.

We have a very low-level interface that we use to define the semantics of
binding a member name. (We actually have several, but I'm simplifying down to
the one we need to think about to understand a bound method.)

:walk through the three core interface:

{{% /note %}}

---

```carbon
class C {
  // ...
  var field: i32;
}

// For each named member of the class ``C`` we synthesize an empty type to support
// the member binding operation.
class `__TypeOf_C_field` {}

// And we synthesize a compile time constant instance of this type.
let `__C_field`:! `__TypeOf_C_field` = {};

// Now we can implement the binding interface producing ``i32``.
impl `__TypeOf_C_field` as `BindToValue`(`C`) where `.Result = i32` {
  fn `Op`[self: Self](`x: C`) -> `i32` {
    // Pseudo code here -- this is expected to be a builtin operation in the
    // compiler. But one whose API and behavior is fully described using normal
    // Carbon APIs.
    return `__compiler_intrinsic_field_access`(`x`, `__offset_of_C_field`, `i32`);
  }
}
```

{{% note %}}



{{% /note %}}

---

```carbon
class C {
  // ...
  var `<2>field`: i32;
}

class __TypeOf_C_field {}
let `<3>__C_field`:! __TypeOf_C_field = {};
impl `<5>__TypeOf_C_field as BindToValue(C)` where .Result = i32 {
  fn `<6>Op`[self: Self](`<7>x: C`) -> i32 { `<12>...` }
}

let `<0>x`: C = ...;

// For value ``x`` with type ``T`` and ``y`` of type ``U``,
// ``x.(y)`` is ``y.(BindToValue(T).Op)(x)``
x.`<1>field` ⇝ x.(`<2>C.field`)
        ⇝ x.(`<3>__C_field`)
        ⇝ `<4>__C_field`.(`<5>BindToValue(C)`.`<6>Op`)(`<7>x`)
        ⇝ `<12>__compiler_intrinsic_field_access(x, __offset_of_C_field, i32)`
```

{{% note %}}

:walk through the transformation sequence:

Ok, so that's how we model every aspect of binding a field.

So what? How does this help us? Well, let's see how we can use this...

{{% /note %}}

---

```carbon
class C {
  // ...
  var field: i32;
}

class __TypeOf_C_field {}
let __C_field:! __TypeOf_C_field = {};
impl __TypeOf_C_field as BindToValue(C) where .Result = i32 {
  fn Op[self: Self](x: C) -> i32 { ... }
}

let x: C = ...;

fn F[`T`:! type, `U`:! `BindToValue`(`T`)](`object: T`, `bound_member: U`) -> `U.Result` {
  return `object`.(`bound_member`);
}

// Now we have a model for how to use ``C.field`` like a pointer-to-data-member.
var y: i32 = `F`(`x`, `C.field`);
```

{{% note %}}

:walk through the usage

So what we have now is not *just* a model for accessing a field. The model is
sufficiently complete to show how we can build something that works like C++'s
pointers-to-data-members.

This is a bit nicer than pointer-to-data-members because its much more obvious
that this *isn't a pointer* at all. It also has other exciting properties, but
if this is really going to tell us what `x.y` is in general, we need to extend
this model to cover all the other `x.y` use cases...

And for that, we'll need a few more building blocks from the language: adapters
and the call interface.

{{% /note %}}

---

```carbon
// Can also _adapt_ other types. Can define any API desired, but cannot change
// representation. Adapted types are compatible with the original type, and you
// can cast values freely between them.
class `A` {
  `adapt` `C`;
}

var `x`: `C` = ...;
let y: A = `x as A`;
let z: C = `y as C`;

// But it is a new type, with its own distinct interface implementations.
// Similar to the "newtype" idiom in Rust and feature in Haskell.
impl `A` as `I` where `.Result = f32` {
  fn `Method`[self: Self]() -> `f32` { ... }
}

// Same object as ``x``, but different ``impl`` than ``x.(I.Method)()`` calls.
var f: f32 = `y`.(`I.Method`)();
```

{{% note %}}

The ability to build these new types and define a custom set of interface
implementations for them ends up being remarkably powerful.

Remember, Carbon builds *every* fundamental part of the language on top of
interfaces and their implementations in order to make those be exposed in
generic code. Operator overloading, everything dispatches through these. And
building these adapter types let's us build a named alternative implementation
of those that can be selected and used for an object of an existing type.

As an example of how fundamental, even function calling is modeled with an
interface!

{{% /note %}}

---

```carbon
// Interface modeling a function call. To simplify things for the presentation,
// just handles functions that take no parameters.
interface `Call` {
  let `Result`:! type;
  fn `Op`[self: Self]`()` -> `Result`;
}

// Imagine a definition like:
`fn F() -> i32 { ... function body ... }`

// This actually synthesizes an empty placeholder type:
class `__F` {}

// Which implements the call interface:
impl `__F` as `Call` where `.Result = i32` {
  fn `Op`[self: Self]() -> i32 { `... function body ...` }
}

// And then declares a constant value ``F`` that is callable:
let `F`:! `__F` = {};

// Applies the call operator to ``F`` by rewriting to ``F.(Call.Op)()`` but
// ``Call.Op`` is special and stops recursion of the rewrite.
let i: i32 = `F``()`;
```

{{% note %}}

This lets us talk about callable objects like lambdas and functions in a
cohesive manner, there is literally no difference in the language.

Now we can combine all of these features to talk about functions defined within
a class!

{{% /note %}}

---

```carbon
class C {
  fn `Static`() -> i32 { ... }
}

// For each named member, we synthesize a type and a value:
class `__TypeOf_C_Static` {}
let `__C_Static`:! `__TypeOf_C_Static` = {};

// But now we also define a _binding type_ for the bound function:
class `__Binding_C_Static` {
  // This is going to adapt ``C`` so we can transform our object into this type.
  `adapt C`;
}

// Now we implement the bind interface to produce an object of the binding type
// from the original object.
impl `__TypeOf_C_Static` as `BindToValue(C)` where `.Result = __Binding_C_Static` {
  fn `Op`[self: Self](`x: C`) -> `__Binding_C_Static` {
    // Returns the adapted object.
    return `x as __Binding_C_Static`;
  }
}
```

{{% note %}}



{{% /note %}}

---

```carbon
class C { fn `<1>Static`() -> i32 { ... } }
class __TypeOf_C_Static {}
let `<2>__C_Static`:! __TypeOf_C_Static = {};
class __Binding_C_Static { adapt C; }
impl __TypeOf_C_Static as `<4>BindToValue(C)` where .Result = __Binding_C_Static {
  fn `<5>Op`[self: Self](`<6>x: C`) -> __Binding_C_Static { `<8>...` }
}

let x: C = ...;

// For value ``x`` with type ``T`` and ``y`` of type ``U``,
// ``x.(y)`` is ``y.(BindToValue(T).Op)(x)``; for a field or _any_ member!
x.`<0>Static` ⇝ x.(`<1>C.Static`)
         ⇝ x.(`<2>__C_Static`)
         ⇝ `<3>__C_Static`.(`<4>BindToValue(C)`.`<5>Op`)(`<6>x`)
         ⇝ `<7>__compiler_intrinsic_bind_value_op_call`(__C_Static, BindToValue(C), x)
         ⇝ `<8>x as __Binding_C_Static`
```

{{% note %}}



{{% /note %}}

---

```carbon
class C { fn Static() -> i32 { ... } }
class __TypeOf_C_Static {}
let __C_Static:! __TypeOf_C_Static = {};
class `__Binding_C_Static` { adapt C; }
impl __TypeOf_C_Static as BindToValue(C) where .Result = __Binding_C_Static {
  fn Op[self: Self](x: C) -> __Binding_C_Static { ... }
}

// Implement the ``Call`` interface for the binding adapter:
impl `__Binding_C_Static` as `Call` where `.Result = i32` {
  fn `Op`[self: Self]() -> i32 {
    // We want a call like ```C.Static()```, but without re-triggering binding or
    // any call operators.
    return `__compiler_intrinsic_call_func`(`C.Static`, `()`); 
  }
}

// Given ``x.Static ⇝ x as __Binding_C_Static`` previously, now:
x.`Static`() ⇝ (`x as __Binding_C_Static`)`()`
           ⇝ (x as __Binding_C_Static).(`Call.Op`)`()`
           ⇝ `__compiler_intrinsic_call_op`(`x as __Binding_C_Static`, `()`)
           ⇝ `__compiler_intrinsic_call_func(C.Static, ())`
```

{{% note %}}

And finally, finally, we have a complete rewrite.

This probably seems like a *lot* of fuss for no real benefit... But hang in
there. First, let's look at how this generalizes cleanly to methods.

{{% /note %}}

---

```carbon
class C {
  fn `Method`[self: Self]() -> i32 { ... }
}

// For each named member, we synthesize a type and a value:
class `__TypeOf_C_Method` {}
let `__C_Method`:! `__TypeOf_C_Method` = {};

// But now we also define a _binding type_ for the bound function:
class `__Binding_C_Method` {
  // This is going to adapt ``C`` so we can transform our object into this type.
  `adapt C`;
}

// Now we implement the bind interface to produce an object of the binding type
// from the original object.
impl `__TypeOf_C_Method` as `BindToValue(C)` where `.Result = __Binding_C_Method` {
  fn `Op`[self: Self](`x: C`) -> `__Binding_C_Method` {
    // Returns the adapted object.
    return `x as __Binding_C_Method`;
  }
}
```

{{% note %}}

This part is essentially identical to the non-method case...

{{% /note %}}

---

```carbon
class C { fn `<1>Method`[self: Self]() -> i32 { ... } }
class __TypeOf_C_Method {}
let `<2>__C_Method`:! __TypeOf_C_Method = {};
class __Binding_C_Method { adapt C; }
impl __TypeOf_C_Method as `<4>BindToValue(C)` where .Result = __Binding_C_Method {
  fn `<5>Op`[self: Self](`<6>x: C`) -> __Binding_C_Method { `<8>...` }
}

let x: C = ...;

x.`<0>Method` ⇝ x.(`<1>C.Method`)
         ⇝ x.(`<2>__C_Method`)
         ⇝ `<3>__C_Method`.(`<4>BindToValue(C)`.`<5>Op`)(`<6>x`)
         ⇝ `<7>__compiler_intrinsic_bind_value_op_call`(__C_Method, BindToValue(C), x)
         ⇝ `<8>x as __Binding_C_Method`
```

{{% note %}}

And the rewrite is also identical -- which is nice, this is something that
happens generically for everything.

And that's extra important because what if we start having *overloads* with some
methods and some static functions? We can't implement that without keeping these
parts exactly the same.

{{% /note %}}

---

```carbon
class C { fn Method[self: Self]() -> i32 { ... } }
class __TypeOf_C_Method {}
let __C_Method:! __TypeOf_C_Method = {};
class `__Binding_C_Method` { adapt C; }
impl __TypeOf_C_Method as BindToValue(C) where .Result = __Binding_C_Method {
  fn Op[self: Self](x: C) -> __Binding_C_Method { ... }
}

// Implement the ``Call`` interface for the binding adapter, but now making a
// method call.
impl `__Binding_C_Method` as `Call` where `.Result = i32` {
  fn `Op`[self: Self]() -> i32 {
    // We want a call like ``(`self as C`).`Method()```, but without re-triggering
    // binding or any call operators. Note that we can pass the object parameter
    // only because the binding type is an adaptor, so our ``self`` is the same
    // object!
    return `__compiler_intrinsic_call_method`(`C.Method`, `self as C`, `()`); 
  }
}

// Given ``x.Method ⇝ x as __Binding_C_Method`` previously, now:
x.`Method`() ⇝ (`x as __Binding_C_Method`)`()`
           ⇝ (x as __Binding_C_Method).(`Call.Op`)`()`
           ⇝ `__compiler_intrinsic_call_op`(`x as __Binding_C_Method`, `()`)
           ⇝ `__compiler_intrinsic_call_method(C.Method, x, ())`
```

{{% note %}}

TODO: should replace `C.Method` and `C.Static` in the call_{method,func}
intrinsics with some other pseudo-syntax, these are *not* the constants we get
with that syntax.

{{% /note %}}

---

## Why do we want all this machinery again???

{{% note %}}



{{% /note %}}

---

## Tells us what `x.y` _is_ and lets us use it!

{{% note %}}



{{% /note %}}

---

```carbon
class C {
  fn Static() -> i32 { return 42; }
  fn Method[self: Self]() -> i32 { return self.field; }

  var field: i32;
  var lambda: SomeCallableType;
}
let x: C = ...;

fn `MakeCall`[`T`:! `Call` where `.Result = i32`](`callable: T`) -> `i32` {
  return `callable()`;
}

// We know ``x.Static`` is an adapter that can be called and returns ``i32``.
let s: i32 = MakeCall(`x.Static`);

// So is ``x.Method``, and it being an adapter is how it binds ``x``'s state.
let m: i32 = MakeCall(`x.Method`);

// And a field that happens to be a callable object is _exactly_ the same.
let l: i32 = MakeCall(`x.lambda`);
```

{{% note %}}

This gives us a clear model for how things like bound methods work. It is
composable, generic, and built entirely out of the other core building blocks of
the language.

TODO: wax poetic about the fact that this completely unifies methods and
functions -- everything becomes a callable object. But it does so without
sacrificing the ergonomics and friendliness of the language level features.

Maybe even talk about how because these are built in terms of `interface`s and
`impl`s, this opens the door to things like custom `operator.` without any
explosion of complexity, and with clear and pre-defined limits on recursive
application, etc.

{{% /note %}}


---

## We have a _completely general_ model for binding a member to an object!

{{% note %}}



{{% /note %}}

---
{{< slide visibility="hidden" >}}

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```cpp
class C {
 public:
  auto Method() const -> int;
  static auto Static() -> int;
  int field;
};

C x = {42};



`<3>int` `<2>C``<1>::*` `<0>pm` = &`<4>C::field`;
int _ = `<5>x``<6>.*``<7>pm`;




`<13>int` (`<10>C``<9>::*` `<8>pmf`)`<12>()` = &`<14>C::Method`;
int _ = (`<15>x``<16>.*``<17>pmf`)`<18>()`;
```

</div>
<div class="col" style="order: 2">

```carbon
class C {

  fn Method[self: Self]() -> i32;
  fn Static() -> i32;
  var field: i32;
};

var x: C = {.field = 42};

let `<0>pm`: (`<1>BindToValue`(`<2>C`)
         where `<3>.Result = i32`)
    = `<4>C.field`;
let _: i32 = `<5>x``<6>.(``<7>pm`);

let `<8>pmf`: (`<9>BindToValue`(`<10>C`)
          where `<11>.Result impls` (
              `<12>Call` where `<13>.Result = i32`))
    = `<14>C.Method`;
let _: i32 = `<15>x``<16>.(``<17>pmf`)`<18>()`;
```

</div>
</div>

{{% note %}}



{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```cpp
class C {
 public:
  auto Method() const -> int;
  static auto Static() -> int;
  int field;
};

C x = {42};

auto GetField(
    `<0>const C& object`,
    `<5>int` `<4>C``<3>::*` `<1>pm`) -> int {
  return `<6>object``<7>.*``<8>pm`;
}
int _ = GetField(`<9>x`, `<10>&C::field`);

auto CallMethod(
    `<11>const C& object`,
    `<18>int` (`<15>C``<14>::*` `<12>pmf`)`<17>()` const) -> int {
  return (`<19>object``<20>.*``<21>pmf`)`<22>()`;
}

int _ = CallMethod(`<23>x`, `<24>&C::Method`);
```

</div>
<div class="col" style="order: 2">

```carbon
class C {

  fn Method[self: Self]() -> i32;
  fn Static() -> i32;
  var field: i32;
};

var x: C = {.field = 42};

fn GetField[`<2>T`:! `<3>BindToValue`(`<4>C`)
            where `<5>.Result = i32`]
    (`<0>object: C`, `<1>bound_field`: `<2>T`) -> i32 {
  return `<6>object``<7>.(``<8>bound_field`);
}
let _: i32 = GetField(`<9>x`, `<10>C.field`);

fn CallMethod[`<13>T`:! `<14>BindToValue`(`<15>C`)
              where `<16>.Result impls` (
                  `<17>Call` where `<18>.Result = i32`)]
    (`<11>object: C`, `<12>bound_method`: `<13>T`) -> i32 {
  return `<19>object``<20>.(``<21>bound_method`)`<22>()`;
}
let _: i32 = CallMethod(`<23>x`, `<24>C.Method`);
```

</div>
</div>

{{% note %}}



{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col" style="order: 1">

```cpp
class C {
 public:
  auto Method() const -> int;
  static auto Static() -> int;
  int field;
};

C x = {42};

auto GetField(
    const C& object,
    int C::* pm) -> int {
  return object.*pm;
}
int _ = GetField(x, &C::field);

auto CallMethod(
    const C& object,
    int (C::* pmf)() const) -> int {
  return (object.*pmf)();
}

int _ = CallMethod(x, &C::Method);
```

</div>
<div class="col" style="order: 2">

```carbon
class C {

  fn Method[self: Self]() -> i32;
  fn Static() -> i32;
  var field: i32;
};

var x: C = {.field = 42};

fn GetField[T:! BindToValue(C)
            where .Result = i32]
    (object: C, bound_field: T) -> i32 {
  return object.(bound_field);
}
let _: i32 = GetField(x, C.field);

fn `<1>CallMember`[T:! BindToValue(C)
              where .Result impls (
                  Call where .Result = i32)]
    (object: C, bound_member: T) -> i32 {
  return object.(bound_member)();
}
let _: i32 = CallMember(x, C.Method);
let _: i32 = CallMember(x, `<0>C.Static`);
```

</div>
</div>

{{% note %}}



{{% /note %}}

---

## It models each aspect of these C++ features.
## And fits them into a larger, generalized design.

{{% note %}}



{{% /note %}}
