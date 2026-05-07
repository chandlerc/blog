+++
weight = 5
outputs = ["Reveal"]
+++

## Goal of Carbon's memory safety design

#### <span class="fragment highlight-current-green" data-fragment-index="2">Smooth</span> and <span class="fragment highlight-current-green" data-fragment-index="3">incremental</span> transition from C++ to <span class="fragment highlight-current-green" data-fragment-index="1">memory safety</span> in Carbon

<div class="fragment" data-fragment-index="1">

- Result needs to be memory safe

</div><div class="fragment" data-fragment-index="2">

- Expressivity to represent common C++ code patterns
  - Makes the transition _smooth_

</div><div class="fragment" data-fragment-index="3">

- Incremental in two ways
  - Migrate to Carbon a little at a time
  - Incrementally add safety once migrated

</div>

---

## Safety, with _strict_ and _permissive_ modes

- _Strict_ Carbon is fully memory safe:
  - Temporal: Preventing "use after free" (UAF) at compile time
  - Spatial: Runtime bounds checking as in 🦀 Rust and being added to C++
  - Type, initialization, null pointer, and data race safety
- _Permissive_ Carbon is an intermediate step between C++ and strict Carbon
  - Strictly safer than C++
  - Relaxing non-runtime safety checks
- Every step toward strict Carbon reduces undefined behavior (UB)
  - Strict checking doesn't _introduce_ UB even when unsafe code misbehaves
  - Reduction in UB from migrating to Carbon even before adding safety annotations

---

# Temporal safety

## Preventing use after free at compile time

---

## C++ Example from [Sean Baxter][sean-example]

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

#### Code

```cpp{}
#include <vector>
#include <cstdio>

int main() {
  std::vector<int> vec { 1, 20, 300 };
  for(int i : vec) {
    `<2>vec.push_back(i);`
    printf("%d\n", i);
  }
}
```

</div>
<div class="col fragment" data-fragment-index="1">

#### Output

```none
1
5
-2102744966
```

</div>
</div>

<div class="fragment" data-fragment-index="2">

`vec.push_back(i)` causes a reallocation that invalidates the iteration the `for` loop is performing

</div>

[sean-example]: https://x.com/seanbax/status/1767577484961202261

{{% note %}}

- https://godbolt.org/z/x7njszh14

{{% /note %}}

---

## Anatomy of a use after free (C++)

```cpp{}
#include <vector>
#include <cstdio>

int main() {
  `<1>std::vector<int> x { 1, 20, 300 }`;
  `<2>int* p = &x[0]`;
  `<3>x.push_back(4000)`;
  printf("%d\n", `<4>*p`);    // <- 💣💥
}
```

<br>

<div class="fragment" data-fragment-index="1" >

1.  **Allocation**

</div><div class="fragment" data-fragment-index="2">

2.  **Capture** a pointer into allocation

</div><div class="fragment" data-fragment-index="3">

3.  **Free** or reallocation

</div><div class="fragment" data-fragment-index="4">

4.  **Use** of dangling pointer

</div>

{{% note %}}

Let's walk through a minimal example of use after free.
Every use after free has four steps.

1. To have a "free," you need an allocation. Here, the C++ standard ``vector`` type allocates on the heap to store its elements.

2. To have a "use," you need to capture an address into the allocation.

3. The "free" is any deallocation or realllocation that invalidates the captured address.

4. And finally we have the "use" after the free, dereferencing the dangling pointer ``p``.

{{% /note %}}

---

## Anatomy of a use after free (Carbon)

```carbon{}
import Core library "io";

fn Run() {
  // ``buf(T)`` is Carbon's equivalent of C++'s
  // ``std::vector<T>`` or Rust's ``Vec<T>``
  `<1>var x: buf(i32) = (1, 20, 300)`;
  `<2>var p: i32* = &x[0]`;
  `<3>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<4>*p`);
}
```

<br/>

<div class="fragment" data-fragment-index="1" >

1.  **Allocation**

</div><div class="fragment" data-fragment-index="2">

2.  **Capture** a pointer into allocation

</div><div class="fragment" data-fragment-index="3">

3.  **Free** or reallocation

</div><div class="fragment" data-fragment-index="4">

4.  Prevents **use** of dangling pointer

</div>

{{% note %}}

In Carbon, the code looks the similar, and the steps are the same, but the compiler gives an error.

{{% /note %}}

---

## How is the error detected?

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var `<2>x`: `<1>buf(i32)` = (1, 20, 300);
  var p: `<4>i32*` = &`<3>x[0]`;
  `<5>x.PushBack(4000)`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(`<6>*p`);
}
```

</div><div class="col">

```carbon{}
class `<1>buf(T: ...)` {
  disjoint `<2>owned ^Elts` of T;

  impl as `<3>IndexRefWith`(i32)
      fn (ref self, arg: i32)
          -> `<4>^Elts ref T`;

  fn PushBack(ref self, x: T)
      `<5>invalidate(^Elts)`;
  // ...
}
```

</div></div>

<div class="fragment" data-fragment-index="2">

1.  ``x`` owns a heap allocation.

</div><div class="fragment" data-fragment-index="4">

2.  ``&x[0]`` has type ``^x.Elts i32*``. <br> ``^x.Elts`` tracks where ``p`` can point (may be omitted for locals).

</div><div class="fragment" data-fragment-index="5">

3.  Call to ``Pushback`` has an ``invalidate(^x.Elts)`` safety effect, invalidating ``p``.

</div><div class="fragment" data-fragment-index="6">

4.  Use of invalidated pointer ``p`` is a compile error.

</div>

{{% note %}}

Notice how there aren't any safety annotations in the `Run()` function on the left. The safety annotations that let Carbon detect the use after free are on the ``buf(T)`` type, and they describe how to safely use its API.

- `buf` is a parameterized type, here `T` is the type of the elements, `i32` in this case
- This is a declaration that the `buf` type owns a heap allocation that is exposed in its API.
- The indexing operator ``[``...``]`` takes a reference to the ``buf`` (``self`` or ``x``) and an integer index. It returns a reference to an element inside the set of places ``^self.Elts``.  
- The declaration ``var p: i32* = &x[i];`` doesn't include the optional place argument in the pointer type, so it defaults to "automatic." It starts out with the set of places from the type returned by the initializer, namely ``^x.Elts``.  Here ``^x`` is the place holding the variable ``x``, and ``^x.Elts`` is the set of places holding the elements of ``x``.
- The ``PushBack`` method takes a reference to the ``buf`` (``self`` or ``x``) and a value to append. It has the side effect of invalidating pointers into ``^self.Elts``, including ``p``.   
- Dereferencing ``p`` in ``Core.Print(*p);`` once ``p`` is invalid triggers an error.

{{% /note %}}

---

## How is the error detected?

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: i32* = &x[0];
  x.PushBack(4000);
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint owned `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<1>^Elts` ref T;

  fn PushBack(ref self, x: T)
      invalidate(`<1>^Elts`);
  // ...
}
```

</div></div>

1.  ``x`` owns a heap allocation.
2.  ``&x[0]`` has type ``^x.Elts i32*``. <br> ``^x.Elts`` tracks where ``p`` can point (may be omitted for locals).
3.  Call to ``Pushback`` has an ``invalidate(^x.Elts)`` safety effect, invalidating ``p``.
4.  Use of invalidated pointer ``p`` is a compile error.

{{% note %}}

Notice how the ``^Elts`` place set connects the allocation to references into that allocation and its later invalidation.

{{% /note %}}

---

## Thread safety

- Acquiring and releasing locks are modeled in Carbon as safety effects
  - Tracked in flow-sensitive state
- Clang's `REQUIRES` attribute becomes a Carbon input requirement
- Each mutex has a place set tracking what it protects
  - Clang's `GUARDED_BY` attribute becomes a `guarded` annotation
- Shared pointers and references parameters must be marked `shared`
  - Local pointers and references become shared as a result of
    safety effects produced by thread APIs

{{% note %}}

- https://abseil.io/docs/cpp/guides/synchronization#thread-annotations
- Thread safety WIP: [examples](https://docs.google.com/document/d/1d6QYzR4lNT32ZMUfK8v6Ff9oFuhD19tA-fviWpp7JDU/edit?tab=t.e2wembz1kcfh#heading=h.lmtmcn7hexe0), safety units [27](https://docs.google.com/document/d/1iaZYwiJBjUpoPqSNuUGAsG8SVRdlaLw3BKvDNTD81WE/edit?tab=t.0), [37](https://docs.google.com/document/d/1WCpAS5RynIsV0g1Y8QNl0UYiN591gGYontr362mfbcw/edit?tab=t.0), [43](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## Thread safety example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}
class BankAccount {
 private:
  Mutex mu;
  int balance `<1>GUARDED_BY(mu)`;

  void AdjustBalance(int amount)
      `<2>REQUIRES(mu)` {
    balance += amount;
  }

 public:
  void TransferFrom(BankAccount& b,
                    int amount) {
    `<4>MutexLock l(&mu)`;
    b.AdjustBalance(-amount);
    AdjustBalance(amount);
  }
};
```

</div><div class="col">

```carbon{}
class BankAccount {
  private var mu: Core.Mutex;
  private `<1>guarded(mu)` var balance: i32;

  private fn AdjustBalance(
      `<3>shared` ref self, amount: i32)
      `<2>where locked(mu)` {
    self.balance += amount;
  }


  fn TransferFrom(`<3>shared` ref self,
        `<3>shared` ref b: Self, amount: i32) {
    `<4>var lock: auto = self.mu.AcquireLock()`;
    `<5>b`.AdjustBalance(-amount);  // ❌ Error
    self.AdjustBalance(amount);
  }
}
```

</div></div>

{{% note %}}

- The `guarded` annotation is like `GUARDED_BY` and adds the place of the marked field to the place set `mu` guards.
- The `where locked` annotation indicates that the mutex must be held to call this function, like `REQUIRES`.
- The `shared` keyword marks that these references may bind to something shared across threads.
- The mutex `mu` may be acquired either using a scoped object or individual lock and release methods. While it is held
- The `b` argument is not covered by `self.mu`'s guard, so the access is disallowed.

{{% /note %}}

---

# Incremental C++ → Carbon migration

## Using permissive mode and interop

---

## Incremental C++ → Carbon migration

### Non-goals

- Adding safety annotations to C++ code
- Proving _arbitrary_ C++ code is safe

---

## Incremental C++ → Carbon migration

### Instead, our goals are:

- Migrate C++ to Carbon
- Safety annotations and safety checking only on Carbon code
- **Incremental** migration steps
  - Fine-grained C++ -> Carbon migration
  - Safety annotations can be introduced gradually
  - Flexible order and layering

---

## Incremental C++ → Carbon migration

### How we achieve those goals

- **C++ interop** in both directions allows smaller pieces to be migrated, and in any order
- **Permissive mode** acts as an intermediate step between C++ and strict Carbon

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
  std::vector<Location> `<2>venues_`;
  `<4>std::vector`<Team> `<3>teams_`;

public:
  auto `<5>EliminationRound`(
      `<6>const Matches& semis`)`<7> `-> void {
    // ...
    teams_.`<8>resize`(new_size);
  }

  auto `<9>Venue`(`<10>const Matches& semis`) `<11>const`
      -> `<12>const Location*`;
  // ...
};
```

</div>
<div class="col fragment" data-fragment-index="1">

### Permissive Carbon

```carbon{}
class Tournament {

  private `<2>venues_`: buf(Location);
  private `<3>teams_`: `<4>buf`(Team);


  fn `<5>EliminationRound`(
      `<7>ref` self, `<6>semis: Matches`) {
    // ...
    self.teams_.`<8>Resize`(new_size);
  }

  fn `<9>Venue`(`<11>self`, `<10>semis: Matches`)
      -> `<12>const Location*`;

  // ...
}
```

</div></div>

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
    Tournament`<3>&` t,
    const Matches& semis) -> void {
  const Location* `<4>l` = `<5>t`.Venue(`<5>semis`);
  `<6>t`.EliminationRound(`<6>semis`);
  ScheduleGame(`<7>l`, `<7>t`);
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
    `<3>ref` t: Tournament,
    semis: Matches) {
  let `<4>l`: const Location* = `<5>t`.Venue(`<5>semis`);
  `<6>t`.EliminationRound(`<6>semis`);
  ScheduleGame(`<7>l`, `<7>ref t`);
}
```

</div></div></div>

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
    // effect not in function signature.
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
      `<2>invalidate(^Teams)` {
    // ...


    self.teams_.Resize(new_size);
  }

  fn Venue(self, semis: Matches)
      -> const Location*;
  // ...
}
```

</div></div>

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

```carbon{}
fn Finals(ref t: Tournament,
          semis: Matches) {
  let l: const Location* = t.Venue(semis);
  t.EliminationRound(semis);


  ScheduleGame(l, ref t);



}
```

</div></div><div class="col">

### Strict Carbon

```carbon{}
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

```carbon{}
fn Finals(ref t: Tournament,
          semis: Matches) {
  let l: const Location* = t.Venue(semis);
  t.`<3>EliminationRound`(semis);
  // ❌ Error: using ``l`` after invalidation
  // by ``t.EliminationRound(semis)``
  ScheduleGame(`<4>l`, ref t);
  // ❌ Error: calling ``t.EliminationRound``
  // invalidates ``^t.Teams``, effect not in
  // `<5>function signature`.
}
```

</div></div></div>

---

## Example: permissive → strict (step 2)


<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Strict Carbon with errors

```carbon{}
class Tournament {

  fn EliminationRound(
      ref self, semis: Matches)
      invalidate(^Teams);
  fn Venue(self, semis: Matches)
      -> const Location*;
}
```

<p>

```carbon{}
fn Finals(ref t: Tournament,
          semis: Matches) {

  let l: const Location* = t.Venue(semis);
  t.EliminationRound(semis);
  // ❌ Error: using ``l`` after invalidation
  // by ``t.EliminationRound(semis)``
  ScheduleGame(`<5>l`, ref t);
  // ❌ Error: calling ``t.EliminationRound``
  // invalidates ``​^t.Teams​``, effect not in
  // `<6>function signature`.
}
```

</div>
<div class="col fragment" data-fragment-index="1">

### Strict Carbon (fixed)

```carbon{}
class Tournament {
  alias `<2>^Venues = ^venues_.Elts`;
  fn EliminationRound(
      ref self, semis: Matches)
      invalidate(^Teams);
  fn Venue(self, semis: Matches)
      -> const `<3>^Venues` Location*;
}
```

<p>

```carbon{}
fn Finals(ref t: Tournament,
          semis: Matches)
    `<6>invalidate(^t.Teams)` {
  let `<4>l`: const Location* = t.Venue(semis);
  t.EliminationRound(semis);


  ScheduleGame(`<5>l`, ref t);



}
```

</div></div>

{{% note %}}

Steps can be done independently: fix from moving `Finals` to strict is a second step.

Note that this example shows an issue we saw in the wild:

- Presented a real-world example in "Memory safety everywhere with both Carbon and Rust", RustConf 2025
- Example taken from Dawn, a WebGPU implementation

Realistically, this code would still call and be called by other C++ code, which brings us to...

{{% /note %}}


