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

## Thread safety

- C++ annotations like `ABSL_LOCKS_EXCLUDED` are modelled in Carbon as safety effects
- `ABSL_EXCLUSIVE_LOCKS_REQUIRED` becomes a Carbon input requirement
- A place set tracks what is protected by a mutex

{{% note %}}

- https://abseil.io/docs/cpp/guides/synchronization#thread-annotations
- Thread safety WIP: [examples](https://docs.google.com/document/d/1d6QYzR4lNT32ZMUfK8v6Ff9oFuhD19tA-fviWpp7JDU/edit?tab=t.e2wembz1kcfh#heading=h.lmtmcn7hexe0), safety units [27](https://docs.google.com/document/d/1iaZYwiJBjUpoPqSNuUGAsG8SVRdlaLw3BKvDNTD81WE/edit?tab=t.0), [37](https://docs.google.com/document/d/1WCpAS5RynIsV0g1Y8QNl0UYiN591gGYontr362mfbcw/edit?tab=t.0), [43](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## Thread safety example


<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp
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
    `<3>MutexLock l(&mu)`;
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
      shared ref self, amount: i32)
      `<2>where locked(^mu.Guarded)` {
    self.balance += amount;
  }


  fn TransferFrom(shared ref self,
        shared ref b: Self, amount: i32) {
    `<3>var lock: auto = self.mu.AcquireLock()`;
    `<4>b`.AdjustBalance(-amount);  // ❌ Error
    self.AdjustBalance(amount);
  }
}
```

</div></div>

---

## Initialization safety

- Safety effects mark functions that perform initialization or destructive move
- Flow-sensitive state tracks initialization status for locals
- For non-locals, fields and parameters are required to be initialized unless a wrapper type is used
