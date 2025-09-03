+++
weight = 2
outputs = ["Reveal"]
+++

## Syntax is similar

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
fn `main`() {
  let mut `s` = String::from("Hello");
  s.`push_str`(" world!");
  println!(`s`);
}
```

</div>
<div class="col fragment">

```carbon{}
fn `Run`() {
  var `s`: strbuf = "Hello";
  s.`Append`(" world!");
  Core.Print(`s`);
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

## Code organization

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
// tables.rs

`struct Table` { ... }
```

```rust{}
// `hosting`.rs
pub use crate::tables::Table;

pub fn add_to_waitlist() { ... }
pub fn seat_at_table() {
  ...
  `crate::serving::add_table(t)`;
}
`pub fn clear_table`(t: Table) { ... }
```

```rust{}
// `serving`.rs
pub use crate::tables::Table;

`pub fn add_table`(t: Table) { ... }
pub fn take_order() {}
pub fn take_payment() {
  ...
  `crate::hosting::clear_table(t)`;
}
```

</div>
<div class="col fragment">

```carbon{}
// tables.carbon

class `Table` { ... }

fn `AddSeatedTable`(t: Table) { ... }
fn `ClearTable`(t: Table) { ... }
```

```carbon{}
// hosting.carbon
import library "`tables.carbon`"

fn AddToWaitlist() { ... }
fn SeatAtTable() {
  ...
  `AddSeatedTable`(t);
}
```

```carbon{}
// serving.carbon
import library "`tables.carbon`"

fn TakeOrder() {}
fn TakePayment() {
  ...
  `ClearTable`(t);
}
```

{{% note %}}

Rust uses a very simple code organization system of crates that form packages.
All the code for a crate is compiled at once. No forward declarations or
anything fancy.

Carbon's organization is more complex in order to support organizing code in the
same ways that fairly advanced C++ libraries do:

- Forward declarations
- Separate compilation of an API file and an implementation file
- Potentially multiple sharded implementation files
- Ability to decompose a package into multiple separate API files that are
  individually importable

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
// tables.rs

struct Table { ... }
```

```rust{}
// hosting.rs
pub use crate::tables::Table;

pub fn add_to_waitlist() { ... }
pub fn seat_at_table() {
  ...
  crate::serving::add_table(t);
}
pub fn clear_table(t: Table) { ... }
```

```rust{}
// serving.rs
pub use crate::tables::Table;

pub fn add_table(t: Table) { ... }
pub fn take_order() {}
pub fn take_payment() {
  ...
  crate::hosting::clear_table(t);
}
```

</div>
<div class="col">

```carbon{}
// tables.carbon

class Table { ... }

fn AddSeatedTable(t: Table);
fn `ClearTable`(t: Table);
```

```carbon{}
// tables.`impl`.carbon

fn AddSeatedTable(t: Table) { ... }
fn `ClearTable`(t: Table) { `...` }
```

```carbon{}
// hosting.carbon
` `
fn AddToWaitlist();
fn `SeatAtTable`();
```

```carbon{}
// hosting.`impl`.carbon
import library "`tables`.carbon"

fn AddToWaitlist() { ... }
fn SeatAtTable() {
  ...
  `AddSeatedTable`(t);
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

## Carbon code organization follows fom C++

- C++ "library" (Abseil, SQLite, ...) -> Carbon `package`
  - Typical unit of versioning, repository, distribution
- C++ header file -> Carbon API file
  - Unit of API that can be imported
- C++ source file -> Carbon `impl` file
  - Enabling physical separation of implementation, including dependencies
- C++ `*_fwd.h` headers like `ios_fwd.h` -> Carbon `extern` declarations
  - Allows wide APIs with sparse client usage to have narrow client dependencies

{{% note %}}

The big thing here is that this is a _lot_ of complexity. But it allows us to
support the _existing_ organizational schemes of large-scale C++ code bases.

{{% /note %}}

---

## Types

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
struct `Up` {
  `count`: i32,
}

impl `Up` {
  fn `inc`(&mut self) { self.count += 1; }
}
```

</div>
<div class="col fragment">

```carbon{}
class `Up` {
  fn `Inc`[ref self: Self]() {
    self.count += 1;
  }

  private var `count`: i32;
}
```

</div>
</div>

{{% note %}}

Rust types have an API separate from their storage, while Carbon types look much
more like C++ -- a closed set of members, both methods and fields.

Not sure either of these is more or less complex, or better or worse, but Carbon
is specifically choosing to follow more closely to how C++ builds types here.

And it goes further than just this, in Carbon we also support inheritance ...

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
struct Up {
  count: i32,
}

impl Up {
  fn inc(&mut self) { self.count += 1; }
}
```

</div>
<div class="col">

```carbon{}
`base` class Up {
  `virtual` fn Inc[ref self: Self]() {
    self.count += 1;
  }

  `protected` var `count`: i32;
}

base class UpOrDown {
  `extend base: Up`;

  `override` fn Inc[ref self: Self]() {
    self.Add(1);
  }

  `virtual` fn Dec[ref self: Self]() {
    self.Add(-1);
  }

  private fn Add[ref self: Self](
      delta: i32) {
    self.count += delta;
  }
}
```

</div>
</div>

{{% note %}}

We also directly support inheritance in Carbon, just like C++. We don't expect
to support multiple inheritance in the same way as C++, but we do expect to
support the use cases for it through a mixins system.

We can debate which way of defining a type and its API is "better", but its not
a big difference. The real difference here is anchoring on something much more
familiar coming from C++.

But inheritance and especially mixins add a ton of complexity to the language.

In Rust, you can still achieve similar results, but rather than the complexity
of that being in the language, it is kept separate with tools like `#[Derive]`
built on proc macros.

{{% /note %}}

---

## Functions

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}


fn `append_i32`(s: &mut String, i: i32) { ... }
fn `append_f32`(s: &mut String, f: f32) { ... }

```

</div>
<div class="col fragment">

```carbon{}

`overload` Append {
  `fn` (ref s: strbuf, i: i32) { ... }
  `fn` (ref s: strbuf, f: i32) { ... }
}
```

</div>
</div>

{{% note %}}

Functions in Rust are super straightforward.

In Carbon, they sometimes are as well...

But other times, they're complex as they also support overloading.

This doesn't support _all_ overloading patterns of C++, some of those are mapped
instead into the generics mechanism. But it supports a large body of the
patterns directly which makes it able to very ergonomically match C++ API
designs. The down side is this comes with a ton of language complexity.

And here, again, Rust _can_ model something like overloading, and in fact it
uses a similar pattern to the fallback in Carbon with its generics system. But
similar to with inheritance, this is pushing the complexity out of the language,
and into the library code that wants to have this style of API design.

And again, I'm not saying that's a bad choice! It's a _huge_ simplification to
the language. But it is a tradeoff that makes Rust APIs feel less like C++ APIs
and vice versa.

{{% /note %}}

---

{{< slide visibility="hidden" >}}

## Generics

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
// TODO: Rust generics example
```

</div>
<div class="col fragment">

```carbon{}
// TODO: Carbon generics example, and then add specialization, and then a template
```

</div>
</div>

{{% note %}}

Both Rust and Carbon have fairly similar generics systems. There are some minor
differences, for example how name lookup works.

But C++ generic programming relies _heavily_ on specialization for performance
optimizations. So we ended up needing to bake specialization directly into the
generics system from day one, which adds a bunch of complexity that I know Rust
folks have been grappling with.

And it gets even worse for Carbon, because Carbon doesn't just have these
definition checked generics like Rust, it also has _template_ generics that
model how C++ templates work. These are instantiated and late-type-checked. And
they can even do the really difficult parts of specialization like C++ does
where different specializations have different *API*s, not just different
implementations.

{{% /note %}}

---

{{< slide visibility="hidden" >}}

## Conversions

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
fn f(i: i64) {
  let truncated = `<1>i as i32`;
  let fallible =
      `<2>i32::try_from(i).unwrap_or(-1)`;
}

fn make_i64<I: `<6>Into<i64>`>(i: I) -> i64 {
  return `<7>i.into()`;
}

fn g(i: i32) {
  let larger: i64 = `<3>i.into()`;
  let larger2 = `<4>i64::from(i)`;
  let larger3 = `<5>make_i64(i)`;
}
```

</div>
<div class="col fragment" data-fragment-index="8">

```carbon{}
fn F(i: i64) {
  let truncated: auto = `<9>i as i32`;

  // Unwrapping syntax not yet decided...
}

fn Make64[I:! `<12>ImplicitAs(i64)`](i: I) -> i64 {
  return `<13>i`;
}

fn G(i: i32) {
  let larger: i64 = `<10>i`;

  let larger3: auto = `<11>Make64(i)`;
}
```

</div>
</div>

{{% note %}}

Conversions seem like a small thing, but its another place where we actually
have surprising complexity hiding. Rust only supports explicit conversions. But
Carbon needs to be able to support C++ API designs that rely on implicit
conversions. Adding implicit conversions can seem simple, but is actually a huge
deal -- you need to make them consistent, and reason about where all they
happen.

And it adds even more complexity when combined with overloading.

{{% /note %}}

---

## This pattern ends up _pervasive_

{{% note %}}

I've only skimmed a few of the differences at a high level, but hopefully its
clear how broad this ends up being.

Also, I've sneakily introduced you to a bunch of Carbon code. ;]

Now let's get into the really interesting part...

{{% /note %}}

---

## What about safety?

## 🚧 🚧 Warning: very early, work-in-progress! 🚧 🚧 {.fragment}

{{% note %}}

{{% /note %}}

---

{{< slide visibility="hidden" >}}

## Unsafety scope

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
use std::mem::MaybeUninit;

fn f<'a>(x: &mut `<1>MaybeUninit<&'a i32>`)
    -> &'a i32 {
  `<2>unsafe` { (`<4>*`x).`<3>assume_init()` }
}

fn g<'a>(x: `*`mut MaybeUninit<&'a i32>)
    -> &'a i32 {
  `unsafe` { (`*`x).assume_init() }
}
```

</div>
<div class="col fragment">

```carbon{}


fn F[^a](x: `Core.MaybeUninit`(`i32*` ^a)`*`)
    -> i32* ^a {
  return (*x).`unsafe` `assume_init`();
}

fn G[^a](x: Core.MaybeUninit(i32* ^a)`* unsafe`)
    -> i32* ^a {
  return (`unsafe` `*`x).`unsafe` assume_init();
}
```

</div>
</div>

{{% note %}}

A simple difference in safety looks a lot like the other parts of the language.

Rust uses a really nice and simple model where you have an unsafe region that
allows code to do things that aren't provably correct in the type system, as
long as they uphold the underlying model requirements.

With Carbon, we want to have even more _incrementality_ coming from C++, and so
expect to have two big differences:

First, we want to narrowly classify each _operation_ as safe or unsafe rather
than using an entire region.

And second, we want to combine that with regions that select different modes for
which unsafe operations have to be marked explicitly.

This is a much more complex way to model unsafety in some respects -- we have to
come up with distinct syntax for each construct, but also manage for that syntax
to be consistently auditable and recognizable.

But it lets us be much more incremental coming from C++. The initial migration
of largely unsafe C++ code into Carbon can use a permissive mode that only
requires explicit `unsafe` markings on things that were already similarly
annotated in C++ like `reinterpret_cast`. The key is that we don't _regress_ the
visibility of unsafe constructs coming from C++. And then we can incrementally
add more markers and ratchet up the region-based marking requirements.

{{% /note %}}

---

## Mutability and exclusivity

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```rust{}
fn g(_: &i32, _: &i32) {}
fn g_mutate(_: &mut i32, _: &mut i32) {}

fn f(`x: &i32`, `y: &mut i32`) {
  // OK: Can have many shared borrows.
  `g(x, x)`;

  // ERROR: Can't mutate.
  `*x = 42`;

  // OK: Can mutate.
  `*y = 42`;

  // ERROR: Can't have more than one
  // mutable borrow.
  `g_mutate`(`y`, `y`);
}
```

</div>
<div class="col fragment">

```carbon{}
fn G(_: i32, _: i32) {}
fn GMutate(ref _: i32, ref _: i32) {}

fn f(`x: i32`, `ref` y: i32) {
  // OK: Can have many immutable values.
  `G(x, x)`;

  // ERROR: Can't mutate.
  `x = 42`;

  // OK: Can mutate.
  `y = 42`;


  // OK: Can mutate multiple objects.
  `GMutate`(`ref y`, `ref y`);
}
```

</div>
</div>

{{% note %}}

Let's talk about the main show of safety though, pointer-like constructs.
Borrows in Rust, and pointers in Carbon.

Rust has a very simple and powerful model: mutable borrows must be exclusive,
while shared borrows must be immutable.

We expect to have a more complex safety model in Carbon specifically design to
let us express more code patterns and prove their memory safety: exclusive
pointers, immutable pointers, and _mutable non-exclusive_ pointers. This last
category is a big new set of complexity that Carbon is taking on.

{{% /note %}}

---

## Deep dive into the safety model differences

{{% note %}}

Let's take a deeper dive into this specific area as the safety differences are
in some ways some of the most interesting to look at. And here, we're going to
switch up and start looking at very concrete and real world examples to
understand how they fit into these different models in different ways.

{{% /note %}}

---

```c{}


OPENSSL_EXPORT int EVP_AEAD_CTX_seal_scatter(
    const EVP_AEAD_CTX *ctx,
    `uint8_t *out`,
    `uint8_t *out_tag`, size_t *out_tag_len, `size_t max_out_tag_len`,
    `const uint8_t *nonce`, `size_t nonce_len`,
    const uint8_t *in, size_t in_len,
    const uint8_t *extra_in, size_t extra_in_len,
    const uint8_t *ad, size_t ad_len);

```

{{% note %}}

https://commondatastorage.googleapis.com/chromium-boringssl-docs/aead.h.html#EVP_AEAD_CTX_seal_scatter

This is taken form BoringSSL code. But it's in C, not C++.

Let's imagine a reasonably modern C++ wrapper API around this...

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}


int EVP_AEAD_CTX_seal_scatter(
    const EVP_AEAD_CTX *ctx,
    `<2>std::span<uint8_t> out`,
    `<3>std::span<uint8_t> out_tag`,
    size_t *out_tag_len,
    std::span<const uint8_t> nonce,
    `<1>std::span<const uint8_t> in`,
    std::span<const uint8_t> extra_in,
    std::span<const uint8_t> ad);

```

</div>
<div class="col fragment" data-fragment-index="4">

```carbon{}


fn EVP_AEAD_CTX_seal_scatter[`<5>^a`](
    ctx: const EVP_AEAD_CTX `<6>^a` *,
    out: slice(u8 `<7>^a`),
    out_tag: slice(u8 `<8>^a`),
    out_tag_len: u64 ^a *,
    nonce: slice(const u8 ^a),
    input: slice(const u8 `<9>^a`),
    extra_input: slice(const u8 ^a),
    ad: slice(const u8 ^a) ad) -> i32;

```

</div>
</div>

{{% note %}}

`EVP_AEAD_CTX_seal_scatter` encrypts and authenticates bytes from `in` and from
`ad`. It writes `in.size()` bytes of ciphertext to `out` and the authentication
tag to `out_tag`. It returns one on success and zero otherwise.

If `in` and `out` alias then `out == in`. `out_tag` may not alias any other
argument.

There are two ways this API can appear in a migration to memory safety in
Carbon:

1. The API and its implementation migrated to Carbon, along with callers
2. Just callers to the API migrated to Carbon, with a binding generated for the
   function.

### Rust migration

In both cases, this same migration to Rut can not be done mechanically, as the
API can not be represented directly in Rust:

1. The `in` and `out` can alias, but the `in` is `const` so that if they don’t
   alias the function will not modify `in`. This is not expressible with
   immutable refs.
2. The `in` and `out` can alias while writing to `out`. This is not expressible
   with mutable refs.

So in Rust, you’d need to split the API into two versions: an in-place one and a
non-in-place one. And then rewrite all callers to choose between the two based
on whether they have aliasing pointers or not, which may require non-local
knowledge to determine, pushing the same issue down the call stack. Once a
choice is made the callers have to be rewritten to work with the new API. This
introduces multiple non-trivial steps to a migration of the callers from C++ to
Rust. This may also require larger changes in callers in order to ensure
_exclusive_ access for any mutable pointers given.

### Carbon migration

Carbon can directly represent this API in both cases. A naive conversion to
Carbon can use the same loan parameter for all pointer arguments, allowing them
all to alias (aka to point to overlapping places).

This can then later be incrementally improved by splitting apart the loan
parameters, giving a unique one to each group of pointer parameters that do not
alias other groups. Note that none of the pointers impose exclusive access on
callers.

But this has more complexity, as it does require writing a lot of loan
parameters which you can omit in the migrated Rust APIs.

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}


int EVP_AEAD_CTX_seal_scatter(
    const EVP_AEAD_CTX *ctx,
    `<2>std::span<uint8_t> out`,
    std::span<uint8_t> out_tag,
    size_t *out_tag_len,
    std::span<const uint8_t> nonce,
    `<1>std::span<const uint8_t> in`,
    std::span<const uint8_t> extra_in,
    std::span<const uint8_t> ad);

```

</div>
<div class="col">

```carbon{}


fn EVP_AEAD_CTX_seal_scatter[^a](
    ctx: const EVP_AEAD_CTX ^a *,
    `<2>out: slice(u8 ^a)`,
    out_tag: slice(u8 ^a),
    out_tag_len: u64 ^a *,
    nonce: slice(const u8 ^a),
    `<1>input: slice(const u8 ^a)`,
    extra_input: slice(const u8 ^a),
    ad: slice(const u8 ^a) ad) -> i32;

```

</div>
</div>

{{% note %}}

This uses a single loan parameter throughout, so anything can alias. This is not
what the docs say, but it is what the code says in C++. Now that we're in
Carbon, we can improve on this.

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}


int EVP_AEAD_CTX_seal_scatter(
    const EVP_AEAD_CTX *ctx,
    `<1>std::span<uint8_t> out`,
    `<4>std::span<uint8_t> out_tag`,
    size_t *out_tag_len,
    std::span<const uint8_t> nonce,
    `<1>std::span<const uint8_t> in`,
    std::span<const uint8_t> extra_in,
    std::span<const uint8_t> ad);

```

</div>
<div class="col">

```carbon{}


fn EVP_AEAD_CTX_seal_scatter[`<2>^inout`](
    ctx: const EVP_AEAD_CTX ^*,
    `<3>out: slice(u8 ^inout)`,
    `<5>out_tag`: slice(u8 `<6>^`),
    out_tag_len: u64 ^*,
    nonce: slice(const u8 ^),
    `<3>input: slice(const u8 ^inout)`,
    extra_input: slice(const u8 ^),
    ad: slice(const u8 ^)) -> i32;

```

</div>
</div>

{{% note %}}

Now the aliasing can be specified without requiring splitting into two functions
with different APIs. Nothing can alias except in and out. This can be done
incrementally as a post-migration step.

Note that in can not be an immutable reference still, however. Since it can
alias with out we can only say that the view of the data through in will not be
used to mutate, which is what the pointer-to-const says.

Equivalent APIs for this _do_ exist in Rust, and we can look at how they are
structured...

{{% /note %}}

---

```rust{}
pub trait Aead {
    fn encrypt<'msg, 'aad>(
        &self,
        nonce: &Nonce<Self>,
        `plaintext`: impl Into<Payload<'msg, 'aad>>,
    ) -> Result<`Vec<u8>`>;
}

pub trait AeadInPlace {
    fn encrypt_in_place_detached(
        &self,
        nonce: &Nonce<Self>,
        associated_data: &[u8],
        `buffer`: &mut [u8],
    ) -> Result<Tag<Self>>;
}
```

https://docs.rs/aead/latest/aead/trait.Aead.html
https://docs.rs/aead/latest/aead/trait.AeadInPlace.html

{{% note %}}

These are actual Rust APIs for these operations. And maybe they're even _better_
APIs, that's a separate debate. But the real point here is that they have had to
use a very different shape, which makes migrating from the original API to these
a much larger change.

Carbon has to have a lot of extra complexity in order to model the original
shape of API, but a consequence is that the migration becomes much easier.

{{% /note %}}

---

## Not all mutations are sound with aliasing...

{{% note %}}

We do still need to model exclusivity, and when supporting both we'll need to
handle the complexity of modeling the relationship between them.

Let's look at an even more complex real-world example that will let us examine
this in detail. This comes from the Dawn project.

{{% /note %}}

---

```cpp{}
class DeviceBase {
 public:
  // Returns a pointer into an internal buffer.
  auto `GetInternalFormat`(wgpu::TextureFormat format) const
      -> `const Format*` {
    return &mFormatTable[ComputeFormatIndex(format)];
  }

  // Adds a value to an internal set.
  auto `EmitWarningOnce`(std::string_view message) -> void {
    `mWarnings.insert`(std::string{message});
  }

 private:
  std::array<Format, 109> `mFormatTable`;
  std::set<std::string> `mWarnings`;
};
```

---

```cpp{}
auto ValidateStorageTextureFormat(
    DeviceBase* device,
    wgpu::TextureFormat storageTextureFormat,
    wgpu::StorageTextureAccess access) -> MaybeError {
  // Holding a pointer into ``device``
  const Format* `format` =
      device->GetInternalFormat(storageTextureFormat);

  if (storageTextureFormat == wgpu::TextureFormat::BGRA8Unorm &&
      access == wgpu::StorageTextureAccess::ReadOnly) {
    // A shape change inside ``device``.
    `device->EmitWarningOnce`(
        "bgra8unorm with read-only access is deprecated.");
  }

  // Dereferencing the pointer after a shape change of ``device``.
  if (!TextureFormatSupportStorageAccess(`*format`, access)) {
    return ErrorData("Format does not support storage texture access.");
  }
  return {};
}
```

{{% note %}}

Here we know the "shape change" in `device` is orthogonal to the `format`
pointer. In fact, since the pointer comes from an `array`, it _can’t_ be
invalidated by a shape change.

Nonetheless we'd expect this code to be rejected unless the two methods
`GetInternalFormat` and `EmitWarningOnce` can express that they do not touch
aliasing parts of `DeviceBase`.

{{% /note %}}

---

```carbon{}
class DeviceBase {
  // Returns a pointer into an internal buffer.
  fn GetInternalFormat[`ref` self: `const Self`](
     format: Wgpu.TextureFormat) -> const Format `^self` `*` {
    return &self.mFormatTable[ComputeFormatIndex(format)];
  }

  // Adds a value to an internal set.
  fn EmitWarningOnce[`ref` `exclusive` self: Self](message: Core.Str) {
    // insert() requires exclusive access to ``self.mWarnings`` which
    // requires exclusive access to ``self``.
    self.mWarnings.insert(Core.StrBuf.Make(message));
  }

  private var mFormatTable: array(Format, 109);
  private var mWarnings: Cpp.std.set(Core.StrBuf);
}
```

---

```carbon{}
fn ValidateStorageTextureFormat(
    device: DeviceBase `exclusive` *,
    storageTextureFormat: Wgpu.TextureFormat,
    access: Wgpu.StorageTextureAccess) -> MaybeError {
  // Holding a pointer into ``device``, holds a non-exclusive borrow on ``device``.
  let `format`: const Format`*` =
      `device`->GetInternalFormat(storageTextureFormat);

  if (storageTextureFormat == Wgpu.TextureFormat.BGRA8Unorm &&
      access == Wgpu.StorageTextureAccess.ReadOnly) {
    // ERROR under strict compilation, but allowed in permissive mode.
    // A shape change inside ``device``. Needs an exclusive borrow on ``device``
    `device->EmitWarningOnce`(
        "bgra8unorm with read-only access is deprecated.");
  }

  // Dereferencing the pointer after a shape change of ``device``.
  if (!TextureFormatSupportStorageAccess(*format, access)) {
    return ErrorData("Format does not support storage texture access.");
  }
  return {};
}
```

{{% note %}}

This example requires holding a reference across a shape change of a `set`. It’s
not immediately a security bug because the reference is to a different part of
the larger class, not into the `set` that may be reallocated.

It will build in permission Carbon but be rejected in strict Carbon, unless we
extend the expressivity of the language enough to determine it is sound.

In Rust this code would always be rejected with safe constructs, and would be UB
with `unsafe` pointers.

In simpler cases, where the reference is held into the container being mutated
with a shape-changing allocation, we want to reject a migration into _strict_
Carbon as doing so is already a latent security bug.

{{% /note %}}

---

```rust{}
fn ValidateStorageTextureFormat(
    device: &mut DeviceBase,
    storageTextureFormat: Wgpu::TextureFormat,
    access: Wgpu::StorageTextureAccess) -> Result<(), String> {
  // Holding a pointer into ``device``, holds a non-exclusive borrow on ``device``.
  let `format`: `&`Format =
      `device`.GetInternalFormat(storageTextureFormat);

  if storageTextureFormat == Wgpu::TextureFormat::BGRA8Unorm &&
     access == Wgpu::StorageTextureAccess::ReadOnly {
    // ERROR: A shape change inside ``device``.
    // Needs an exclusive borrow on ``device``.
    `device.EmitWarningOnce`(
        "bgra8unorm with read-only access is deprecated.");
  }

  // Dereferencing the pointer after a shape change of ``device``.
  if !TextureFormatSupportStorageAccess(*format, access) {
    return Err("Format does not support storage texture access.".to_string());
  }
  return Ok(());
}
```

{{% note %}}

When using an unsafe pointer to make it compile (similar to the permissive mode
in Carbon), Rust encounters _undefined behaviour_, while permissive Carbon does
not encounter undefined or erroneous behaviour in this example:
https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&gist=38e8e020570f954a5c25ec79cb04ceb3

{{% /note %}}

---

```rust{}
fn ValidateStorageTextureFormat(
    device: &mut DeviceBase,
    storageTextureFormat: Wgpu::TextureFormat,
    access: Wgpu::StorageTextureAccess) -> Result<(), String> {
  // Holding an unsafe pointer into ``device``.
  let `format`: `*`const Format =
      device.GetInternalFormat(storageTextureFormat) as `*const _`;

  if storageTextureFormat == Wgpu::TextureFormat::BGRA8Unorm &&
     access == Wgpu::StorageTextureAccess::ReadOnly {
    // OK because we used a raw pointer instead of a non-exclusive borrow.
    // But still does a shape change.
    `device`.EmitWarningOnce(
        "bgra8unorm with read-only access is deprecated.");
  }

  // Dereferencing the pointer after a shape change of ``device``.
  // **UB** in Rust with unsafe pointers: The format pointer was invalidated
  // by the exclusive borrow of ``device``.
  if !TextureFormatSupportStorageAccess(unsafe { `*format` }, access) {
    return Err("Format does not support storage texture access.".to_string());
  }
  return Ok(());
}
```

{{% note %}}

{{% /note %}}

---

```text
error: Undefined Behavior: attempting a read access using <370> at alloc308[0x18],
       but that tag does not exist in the borrow stack for this location
  --> src/main.rs:60:50
   |
60 |   if !TextureFormatSupportStorageAccess(unsafe { *format }, access) {
   |                                                  ^^^^^^^ this error occurs as part of an
   |                                                          access at alloc308[0x18..0x1c]
   |
help: <370> was created by a SharedReadOnly retag at offsets [0x18..0x1c]
  --> src/main.rs:46:31
   |
47 |       device.GetInternalFormat(storageTextureFormat) as *const _;
   |       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: <370> was later invalidated at offsets [0x0..0x1d0] by a Unique function-entry retag
      inside this call
  --> src/main.rs:52:5
   |
53 | /     device.EmitWarningOnce(
54 | |         "bgra8unorm with read-only access is deprecated.");
   | |__________________________________________________________^
```

{{% note %}}

{{% /note %}}

---

```carbon{}
fn ValidateStorageTextureFormat(
    device: DeviceBase exclusive *,
    storageTextureFormat: Wgpu.TextureFormat,
    access: Wgpu.StorageTextureAccess) -> MaybeError {
  // Holding a pointer into ``device``, holds a non-exclusive borrow on ``device``.
  let format: const Format* = device->GetInternalFormat(storageTextureFormat);

  if (storageTextureFormat == Wgpu.TextureFormat.BGRA8Unorm &&
      access == Wgpu.StorageTextureAccess.ReadOnly) {
    // ERROR under strict compilation, but allowed in permissive mode.
    // A shape change inside ``device``. Needs an exclusive borrow on ``device``
    device->EmitWarningOnce(
        "bgra8unorm with read-only access is deprecated.");
  }

  // Dereferencing the pointer after a shape change of ``device``.
  // **Not UB** in Carbon.
  if (!TextureFormatSupportStorageAccess(`*format`, access)) {
    return ErrorData("Format does not support storage texture access.");
  }
  return {};
}
```

{{% note %}}

{{% /note %}}

---

## Whew! 😮‍💨 That's a lot...
