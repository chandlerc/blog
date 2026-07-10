+++
weight = 35
outputs = ["Reveal"]
+++

# Other kinds of safety

---

## Same mechanisms

The same mechanisms used to enforce use-after-free:

- Safety effects (like invalidation)
- Places and place sets
- Function input requirements (like overlap/disjoint)
- Types

are also used to enforce other safety properties.

---

## Thread safety goals

- Straight translation of [Clang's  `-Wthread-safety` thread-safety annotations][thread-safety]
- Prevent data races

[thread-safety]: https://clang.llvm.org/docs/ThreadSafety.html

<br/>

<br/>

Not trying to prevent deadlock, no guarantee of forward progress

{{% note %}}

- https://clang.llvm.org/docs/ThreadSafety.html
- https://abseil.io/docs/cpp/guides/synchronization#thread-annotations

{{% /note %}}

---

## Thread safety approach

- Each mutex has a place set of `guarded` variables
- Safety effects for important events (similar to invalidation)
  - Acquiring or releasing locks
  - Sharing places across threads
- Status tracked in flow-sensitive state and function signatures
  - Shared places can only be passed to `shared` parameters
  - Lock requirements are function constraints
- Restrict access to `shared` data unless `guarded` by a lock that is held
- `shared` is an addition beyond the C++ annotations

{{% note %}}

- Thread safety WIP: [examples](https://docs.google.com/document/d/1d6QYzR4lNT32ZMUfK8v6Ff9oFuhD19tA-fviWpp7JDU/edit?tab=t.e2wembz1kcfh#heading=h.lmtmcn7hexe0), safety units [27](https://docs.google.com/document/d/1iaZYwiJBjUpoPqSNuUGAsG8SVRdlaLw3BKvDNTD81WE/edit?tab=t.0), [37](https://docs.google.com/document/d/1WCpAS5RynIsV0g1Y8QNl0UYiN591gGYontr362mfbcw/edit?tab=t.0), [43](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## Thread safety example

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```cpp{}
class BankAccount {
 private:
  std::mutex mu;
  int balance `<1>GUARDED_BY(mu)`;

  void Withdraw(int amount)
      `<2>REQUIRES(mu)` {
    balance -= amount;
  }

  void Deposit(int amount) {
    `<7>balance += amount;  // ⚠️ Warning`
  }
 public:
  void TransferFrom(BankAccount& b,
                    int amount) {
    `<5>mu.lock()`;
    b.Withdraw(amount);  // ⚠️ Warning
    Deposit(amount);
    mu.unlock();
  }
};
```

</div><div class="col">

```carbon{}
class BankAccount {
  private var mu: Core.Mutex;
  private `<1>guarded(mu)` var balance: i32;

  private fn Withdraw(
      `<4>shared` ref self, amount: i32)
      `<2>where locked(mu)` {
    `<3>self.balance -= amount`;
  }

  private fn Deposit(`<9>ref` self, amount: i32) {
    `<7>self.balance += amount;`
  }

  fn TransferFrom(`<9>shared ref` self,
        shared ref b: Self, amount: i32)`<10> `{
    `<5>self.mu.Lock()`;
    `<6>b.Withdraw(amount);  // ❌ Error`
    `<8>self.Deposit(amount);  // ❌ Error`
    `<10>self.mu.Unlock()`;
  }
}
```

</div></div>

{{% note %}}

- The `guarded` annotation is like `GUARDED_BY` and adds the place of the marked field to the place set `mu` guards.
- The `where locked` annotation indicates that the mutex must be held to call this function, like `REQUIRES`.
  - This allows reading and writing the `balance` guarded by that mutex.
- The `shared` keyword marks that these references may bind to something shared across threads.
- The mutex `mu` may be acquired either using a scoped object or individual lock and release methods. While it is held, we can access the guarded fields.
- The `b` argument is not covered by `self.mu`'s guard, so the access is disallowed.
- The `Deposit` method is declared as taking an plain `ref` parameter. This means it can only be called on objects that aren't currently shared, so it is legal to write to the `balance` field.
- However, this call is not allowed
- since `self` is `shared`, it can't be passed to a plain `ref`.
  - Notice how the error moves from the `Deposit` function to its caller.
  - `Deposit` may be called on objects that aren't shared across threads.
- The `Unlock` call generates a safety effect that cancels out the safety effect from the earlier `Lock` call, so the function does not get an effect annotation.

References: [safety unit 43: Unstructured Threads Pt 2](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)

{{% /note %}}

---

## `shared` references are similar to Rust's `&`

- Deeply immutable until you reach something with interior mutability
- 🦀 Rust: getting that `&` reference to share across threads uses a shared borrow
- Carbon: gets a similar result using sharing safety effects

---

## Differences from Rust

- Approach to interior mutability
  - 🦀 Rust: a mutex contains the guarded data
  - Carbon: a mutex guards other variables
- Use of shared references
  - 🦀 Rust: pervasive
  - Carbon: only when sharing across threads
- Carbon doesn't mark thread safety on _types_
  - Contrast with 🦀 Rust's `Send` and `Sync` traits
  - Can always make a `shared` reference to an object
  - Methods _opt-in_ to working on a `shared` reference

---

## Differences from Rust

- Approach to interior mutability
- Use of shared references
- Carbon doesn't mark thread safety on _types_
  - Contrast with 🦀 Rust's `Send` and `Sync` traits
  - Can always make a `shared` reference to an object
  - Methods _opt-in_ to working on a `shared` reference

```carbon{}
class BankAccount {
  // Can operate on shared references
  private fn Withdraw(`<1>shared ref` self, amount: i32) ...;

  // Can't operate on shared references
  private fn Deposit(`<2>ref` self, amount: i32);
}
```

---

## Initialization safety

- Safety effects mark functions that perform initialization or destructive move
- Flow-sensitive state tracks initialization status for locals
  - No full path-sensitivity or correlated conditions
  - No inlining
  - Just simple static rules
- For non-locals, fields and parameters are required to be initialized unless a wrapper type is used
  - Similar to 🦀 Rust's `MaybeUninit`

{{% note %}}

Initialization safety is again implemented using a similar approach, just with different safety effects and additional flow-sensitive state.

I have an appendix on flow-sensitivity, available in the slides, if you want to dive into that more.

{{% /note %}}
