+++
weight = 45
outputs = ["Reveal"]
+++

# Migrating C++ → _strict_ Carbon

## Using permissive mode and interop

{{% note %}}

Going to show how these tools allow this migration to be incremental.

{{% /note %}}

---

## Incremental migration from C++ → _strict_ Carbon

### Non-goals

- Adding safety annotations to C++ code
- Proving arbitrary C++ code is safe

---

## Incremental migration from C++ → _strict_ Carbon

### Instead, our goals are:

- Mechanical migration of C++ to permissive Carbon
- Deploy safety annotations and safety checking in Carbon
- **Incremental** steps for each these migrations 
  - Fine-grained C++ → Carbon migration
  - Safety annotations can be introduced gradually
  - Flexible order and layering

---

## Incremental migration from C++ → _strict_ Carbon

### How we achieve those goals

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

**Permissive mode** acts as an intermediate step between C++ and strict Carbon

- Allows a mechanical migration from C++
- Syntax and semantics of Carbon
- Safety checks are relaxed, no safety annotations required

</div><div class="col" style="text-align: center;">

C++

↓

permissive Carbon

↓

strict Carbon

</div></div>

---

## Incremental migration from C++ → _strict_ Carbon

### How we achieve those goals

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

**C++ interop** in both directions

- Migrate in smaller pieces
- In any order
- Permissive Carbon can call C++ freely
- Strict Carbon can call C++, with restrictions

</div><div class="col" style="text-align: center;">

Carbon ⇄ C++

</div></div>

---

## Every step improves safety

- _Permissive_ Carbon is safer than C++
  - Less undefined behavior (UB)
- Strict checking doesn't _introduce_ UB even when interacting with permissive or unsafe code

{{% note %}}

- Our use cases include code bases with lots of unsafe code.
- Not in a position for strict code to make assumptions that the unsafe code could violate.
- Will talk about this more later.

{{% /note %}}

---

## "unsafe"

`unsafe`: Escape hatch to perform dangerous unchecked operations
- No `unsafe` blocks, just `unsafe` operations
- Operations that would be considered dangerous in C++ are marked `unsafe` even in permissive mode (reinterpret or const cast)
- Anything that can't be checked is an `unsafe` operation in strict mode
- Calls to unsafe functions must be marked `unsafe`

{{% note %}}

While unsafe operations are sometimes necessary,
we expect Carbon's expressivity to reduce the need
compared to Rust.

{{% /note %}}

---

## Multi-step migration strategy

1. Migrate C++ → permissive Carbon
2. Define safety contract in permissive Carbon
   - Uses Carbon-specific safety annotations
   - Affects strict Carbon callers
3. Switch Carbon from permissive → strict
   - Requires fixing violations or `unsafe`

<p>&nbsp;</p>

<div class="fragment">

### Alternatively:

1. Define safety contract with a Carbon wrapper
   - Implemented with C++ interop
2. Migrate C++ to Carbon later

</div>

{{% note %}}

Reference: [Safety Unit No. 45: Permissive mode](https://docs.google.com/document/d/1kfgjozZBNbvSl32m4mzf4JA2l7R87HE2A0HmL8GLwqY/edit?tab=t.0)

{{% /note %}}

---

## Example: C++ → permissive Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### C++ code

```cpp{}
class Tournament {
 private:
  std::vector<Location> venues_;
  std::vector<Team> teams_;

 public:
  auto EliminationRound(
      const Matches& semis) -> void {
    // ...
    teams_.resize(new_size);
  }

  auto Venue(const Matches& semis) const
      -> const Location*;
  // ...
};
```

</div>
<div class="col fragment" data-fragment-index="1">

### Permissive Carbon

```carbon{}
class Tournament {

  private venues_: buf(Location);
  private teams_: buf(Team);


  fn EliminationRound(
      ref self, semis: Matches) {
    // ...
    self.teams_.Resize(new_size);
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div></div>

{{% note %}}

- This is a direct translation
- No safety annotations needed yet

{{% /note %}}

---

## Example: C++ → permissive Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### C++ code

```cpp{}
class Tournament {
 public:
  auto EliminationRound(
      const Matches& semis) -> void;
  auto Venue(const Matches& semis) const
      -> const Location*;
};
```

<p>

<div class="fragment" data-fragment-index="1">

```cpp{}
auto Finals(
    Tournament& t,
    const Matches& semis) -> void {
  const Location* l = t.Venue(semis);
  t.EliminationRound(semis);
  ScheduleGame(l, t);
}
```

</div></div><div class="col">

### Permissive Carbon

```carbon{}
class Tournament {

  fn EliminationRound(
      ref self, semis: Matches);
  fn Venue(self, semis: Matches)
      -> const Location*;
}
```

<p>

<div class="fragment" data-fragment-index="2">

```carbon{}
fn Finals(
    ref t: Tournament,
    semis: Matches) {
  let l: const Location* = t.Venue(semis);
  t.EliminationRound(semis);
  ScheduleGame(l, ref t);
}
```

</div></div></div>

{{% note %}}

Compressing the class to just its API so I can show calling code.

Again the translation is direct.

{{% /note %}}

---

## Example: permissive → strict (step 1)

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Permissive Carbon

```carbon{}
class Tournament {
  private venues_: buf(Location);
  private teams_: buf(Team);

  fn EliminationRound(
      ref self, semis: Matches) {
    // ...



    self.teams_.Resize(new_size);
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div>

<div class="col fragment" data-fragment-index="1">

### Strict Carbon

```carbon{}
class Tournament {
  private venues_: buf(Location);
  private teams_: buf(Team);

  fn EliminationRound(
      ref self, semis: Matches) {
    // ...
    // ❌ Error: call to ``Resize``
    // invalidates ``^teams_.Elts``,
    // effect not in function signature.
    `self.teams_.Resize(new_size)`;
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div></div>

{{% note %}}

- We only get safety errors once we try and switch to strict mode.
- This error is saying we need a safety annotation because we are calling a function that invalidates.

{{% /note %}}

---

## Example: permissive → strict (step 1)

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Strict Carbon with error

```carbon{}
class Tournament {
  private venues_: buf(Location);
  private teams_: buf(Team);


  fn EliminationRound(
      ref self, semis: Matches) {
    // ...
    // ❌ Error: call to ``Resize``
    // invalidates `<3>^teams_.Elts`,
    // `<2>effect not in function signature`.
    self.teams_.Resize(new_size);
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div>
<div class="col fragment" data-fragment-index="1">

### Strict Carbon (fixed)

```carbon{}
class Tournament {
  private venues_: buf(Location);
  private teams_: buf(Team);
  alias `<3>^Teams = ^teams_.Elts`;

  fn EliminationRound(
      ref self, semis: Matches)
      `<2>invalidate`(`<3>^Teams`) {
    // ...


    self.teams_.Resize(new_size);
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div></div>

{{% note %}}

- To fix this error, we add the safety effect to the function signature, so callers of this function are aware of the invalidation.
- We declare an alias to give a public name to the owned place set so it can appear in this class' API.

{{% /note %}}

---

## Example: permissive → strict (step 2)

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Permissive Carbon

<div style="visibility: hidden;">

```







```

</div>

<p>

<div class="fragment" data-fragment-index="1">

```
fn Finals(ref t: Tournament,
          semis: Matches) {
  let l: const Location* = t.Venue(semis);
  t.EliminationRound(semis);


  ScheduleGame(l, ref t);



}
```

</div></div><div class="col">

### Strict Carbon

```
class Tournament {
  fn EliminationRound(
      ref self, semis: Matches)
      `<3>invalidate(^Teams)`;
  fn Venue(self, semis: Matches)
      -> const Location*;
}
```

<p>

<div class="fragment" data-fragment-index="2">

```
fn Finals(ref t: Tournament,
          semis: Matches) {
  let l: const Location* = t.Venue(semis);
  `<3>t.EliminationRound(semis)`;
  // ❌ Error: use of ``l`` after invalidation
  // by ``t.EliminationRound(semis)``
  ScheduleGame(`<4>l`, ref t);
  // ❌ Error: call to ``t.EliminationRound``
  // invalidates ``^t.Teams``, effect not in
  // function signature.
}
```

</div></div></div>

{{% note %}}

- *Click* We can update the calling code as an independent step.
- *Click* There are two safety errors in ``Finals``.
- *Click* The first one looks like a use after free error, caused by the invalidation effect on the `EliminationRound` method,
- *Click* and the use of a reference into the `Tournament` object afterwards.

{{% /note %}}

---

## Example: permissive -> strict (step 2)


<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Strict Carbon with errors

```
class Tournament {

  fn EliminationRound(
      ref self, semis: Matches)
      invalidate(^Teams);
  fn Venue(self, semis: Matches)
      -> const Location*;
}
```

<p>

```
fn Finals(ref t: Tournament,
          semis: Matches) {

  let l: const Location* = t.Venue(semis);
  t.EliminationRound(semis);
  // ❌ Error: use of ```<2>l``` after invalidation
  // by ``t.EliminationRound(semis)``
  ScheduleGame(l, ref t);
  // ❌ Error: call to ``t.EliminationRound``
  // invalidates ``​`<4>^t.Teams`​``, effect not in
  // function signature.
}
```

</div>
<div class="col fragment" data-fragment-index="1">

### Strict Carbon (fixed)

```
class Tournament {
  alias `<3>^Venues = ^venues_.Elts`;
  fn EliminationRound(
      ref self, semis: Matches)
      invalidate(^Teams);
  fn Venue(self, semis: Matches)
      -> const `<3>^Venues` Location*;
}
```

<p>

```
fn Finals(ref t: Tournament,
          semis: Matches)
    `<4>invalidate(^t.Teams)` {
  let l: const Location* = `<2>t.Venue(semis)`;
  t.EliminationRound(semis);


  ScheduleGame(l, ref t);



}
```

</div></div>

{{% note %}}

- The `l` pointer that got invalidated came from a call to the `Venue` method.
- We can fix the error by making its return more precise, so it doesn't overlap the place set that gets invalidated.

Note that this example shows an issue we saw in the wild:

- Presented a real-world example in "Memory safety everywhere with both Carbon and Rust", RustConf 2025
- Example taken from Dawn, a WebGPU implementation

The second error is the propagation of the invalidation effect, as before.

{{% /note %}}

---

## Field granularity

We could prove this example is safe due to the additional precision of field granularity.
- This example is a retheming of code from Dawn, a WebGPU implementation

<br/>

<br/>

🦀 There is a proposed change to the Rust safety model called [view types](https://smallcultfollowing.com/babysteps/series/view-types/) for providing field granularity
- On the drawing board

{{% note %}}

Field granualarity fits naturally within Carbon's use of places.

{{% /note %}}
