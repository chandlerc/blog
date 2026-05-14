+++
weight = 5
outputs = ["Reveal"]
+++


# Expressivity

## Support for common C++ patterns

---

## Expressivity is important

Benefits:
- Can show more things memory safe
- Adds flexibility when structuring code
- Enables migration of C++ code to Carbon

Goal: Represent common C++ coding patterns in strict Carbon with minimal use of `unsafe` and rearchitecting.

---

## Mutability without exclusivity

```
// Parameters can optionally alias
fn Swap(`<2>ref x: i32`, `<2>ref y: i32`) {
  // Implementation works even if &x == &y.
  let tmp: i32 = x;
  x = y;
  y = tmp;
}

fn FisherYatesShuffle(ref vec: buf(i32)) {
  for (i: i32 in Core.IntRange(vec.Size() - 2)) {
    let j: i32 = Random(i, vec.Size());
    // Two simultaneous mutable references into ``vec``
    Swap(`<1>ref vec[i]`, `<1>ref vec[j]`);
  }
}
```

<div class="fragment" data-fragment-index="3">

- 🦀 Would need changes to work under Rust's "shared XOR mutable" restriction
  - The two references may point to the same element

</div>

<div class="fragment" data-fragment-index="4">

- Unsafe code making an aliasing pointer won't introduce UB

</div>


{{% note %}}

More generally, even unsafe code has fewer footguns in Carbon, since it won't optimize assuming there aren't aliasing pointers.

{{% /note %}}

---

## Self reference

- An object can have pointers to other fields in the same instance

```
class Form {
  var first: strbuf;
  var last: strbuf;
  var current: ^(first, last) strbuf*;
}
```

- This is used in some small-size optimization implementations
  - Pointer either points to an inline buffer or heap allocation

---

## Field granularity

- Pointers to one member aren't invalidated when changing another
  - Upcoming `Tournament` example shows a case of this
  - It's a retheming of a real example from Dawn, a WebGPU implementation
- 🦀 There is a proposed change to the Rust safety model called [view types](https://smallcultfollowing.com/babysteps/series/view-types/) for providing field granularity
  - On the drawing board

---

## Transfer of ownership

- Two effects that are refinements of `invalidate`: `mix` and `move`
- Local pointer types with automatic place sets are updated
- Allows less invalidation when relocating, as in `PushBack`

---

## C++ features supported by Carbon but not Rust

Carbon has a large commitment to supporting C++ features independent of safety
- Inheritance
- Specialization
- Templates
- Implicit conversions
- Function overloading
- ...

---

# Other kinds of safety

---

## Same mechanisms

The same mechanisms used to enforce use-after-free:

- Safety effects (like invalidation)
- Places and place sets
- Function input requirements (like overlap/disjoint)
- Types
- Flow-sensitive state

are also used to enforce other safety properties.

---

## Thread safety (ALT1)

- Acquiring and releasing locks are modeled in Carbon as safety effects
  - Tracked in flow-sensitive state
- Clang's `REQUIRES` attribute becomes a Carbon input requirement
- Each mutex has a place set tracking what it protects
  - Clang's `GUARDED_BY` attribute becomes a `guarded` annotation
- Pointers and references used across threads must be marked `shared`
  - Local places become shared as a result of
    safety effects produced by thread APIs

{{% note %}}

- https://abseil.io/docs/cpp/guides/synchronization#thread-annotations
- Thread safety WIP: [examples](https://docs.google.com/document/d/1d6QYzR4lNT32ZMUfK8v6Ff9oFuhD19tA-fviWpp7JDU/edit?tab=t.e2wembz1kcfh#heading=h.lmtmcn7hexe0), safety units [27](https://docs.google.com/document/d/1iaZYwiJBjUpoPqSNuUGAsG8SVRdlaLw3BKvDNTD81WE/edit?tab=t.0), [37](https://docs.google.com/document/d/1WCpAS5RynIsV0g1Y8QNl0UYiN591gGYontr362mfbcw/edit?tab=t.0), [43](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## Thread safety based on [Clang `-Wthread-safety`][thread-safety] (ALT2)
 
[thread-safety]: https://clang.llvm.org/docs/ThreadSafety.html

- Each mutex has a place set that it protects
  - Variables can be `guarded` by this mutex
- Model lock acquisition and release as safety effects, like invalidation
  - Track the held locks in flow-sensitive state
  - Add precision with place sets in the type system
- Model lock requirements across APIs as _constraints_
- Require pointers and references shared across threads to be marked `shared`
  - Thread sharing APIs have effects that require `shared`
  - Restrict access to `shared` data unless `guarded` by a lock that is held

---
<!--

## Thread safety example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp
class BankAccount {
 private:
  std::mutex mu;
  int balance `<1>GUARDED_BY(mu)`;

  void AdjustBalance(int amount)
      `<2>REQUIRES(mu)` {
    balance += amount;
  }

 public:
  void TransferFrom(BankAccount& b,
                    int amount) {
    `<4>std::scoped_lock l(mu)`;
    b.AdjustBalance(-amount);
    AdjustBalance(amount);
  }
};
```

</div><div class="col">

```
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

-->

## Thread safety example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}
class BankAccount {
 private:
  std::mutex mu;
  int balance `<1>GUARDED_BY(mu)`;

  void Deposit(int amount) {
    balance += amount;  // ⚠️
  }

  void Withdraw(int amount)
      `<2>REQUIRES(mu)` {
    balance -= amount;
  }
 public:
  void TransferFrom(BankAccount& b,
                    int amount) {
    `<4>std::scoped_lock l(mu)`;
    b.Withdraw(amount);  // ⚠️
    Deposit(amount);
  }
};
```

</div><div class="col">

```carbon{}
class BankAccount {
  private var mu: Core.Mutex;
  private `<1>guarded(mu)` var balance: i32;

  private fn Deposit(`<6>ref self`, amount: i32) {
    self.balance += amount;
  }

  private fn Withdraw(
      `<3>shared` ref self, amount: i32)
      `<2>where locked(mu)` {
    self.balance -= amount;
  }

  fn TransferFrom(`<3>shared` ref self,
        `<3>shared` ref b: Self, amount: i32) {
    `<4>var lock: auto = self.mu.AcquireLock()`;
    `<5>b`.Withdraw(amount);  // ❌ Error
    `<6>self.Deposit(amount);  // ❌ Error`
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
- The `Deposit` method can't take a `shared` argument.
  - Notice how the error moves from the `Deposit` function to its caller.
  - `Deposit` may be called on objects that aren't shared across threads.


References: [safety unit 43: Unstructured Threads Pt 2](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## Initialization safety

- Safety effects mark functions that perform initialization or destructive move
- Flow-sensitive state tracks initialization status for locals
- For non-locals, fields and parameters are required to be initialized unless a wrapper type is used
