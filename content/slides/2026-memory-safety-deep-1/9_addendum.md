+++
weight = 9
outputs = ["Reveal"]
+++

# Addendum

## How we got here

---

## This is the third safety model we considered

### First approach: Ante's Rust-like model

- Take Rust and add non-exclusive mutable borrows
- Struggled with transitions between the three modes:
  - Exclusive (needed for things that e.g. reallocated)
  - Non-exclusive mutable (more flexible when applicable)
  - Immutable shared
- Concerns about having too many pointer types
- Lacked expressivity and precision
  - Field granularity requires additional mechanisms (view types)
  - Doesn't handle different methods requiring different capabilities from fields
- Expected to work, and so became our backup plan while we explored other options
- [The Algebra of Loans in Rust](https://nadrieril.github.io/blog/2025/12/21/the-algebra-of-loans-in-rust.html): most promising direction

{{% note %}}

FIXME: Split into multiple slides

References:

- [Ante programming language](https://antelang.org/): has "safe shared mutability" and algebraic effects
- [The Algebra of Loans in Rust](https://nadrieril.github.io/blog/2025/12/21/the-algebra-of-loans-in-rust.html): most promising direction for adding expressivity to Rust-like models

{{% /note %}}

---

## This is the third safety model we considered

### 2nd: Safety effects model with flow-sensitive checking

- Inspired by group borrows blog posts ([nmsmith](https://gist.github.com/nmsmith/cdaa94aa74e8e0611221e65db8e41f7b), [verdagon.dev](https://verdagon.dev/blog/group-borrowing))
- Very precise in simple cases
- Delays commitment to what capabilities are needed by a type until actually calling the method that needs that capabilities
- Can add more kinds of effects to increase precision
- Example: writes were an effect rather than `const` restricting what the type could do
  - Less code duplication to be const correct ([nim-lang.org](https://nim-lang.org/araq/writetracking.html))
- Struggles with precision when there is type erasure
- Found potential workarounds, but ends up far down the road of reproducing the body of the function in the signature
  - `F` calls `G` and so has whatever effects `G` has

{{% note %}}

FIXME: Split into multiple slides

References:

- nmsmith's "An alternative model for "lifetimes" in Mojo.md": [https://gist.github.com/nmsmith/cdaa94aa74e8e0611221e65db8e41f7b](https://gist.github.com/nmsmith/cdaa94aa74e8e0611221e65db8e41f7b)
- Evan Ovadia's "Group Borrowing: Zero-Cost Memory Safety with Fewer Restrictions": [https://verdagon.dev/blog/group-borrowing](https://verdagon.dev/blog/group-borrowing)
- Araq's "Write tracking for Nim" [https://nim-lang.org/araq/writetracking.html](https://nim-lang.org/araq/writetracking.html)

{{% /note %}}

---

## This is the third safety model we considered

### Final model: Goldilocks hybrid

- Hybrid between the two previous models
- Uses types, `const`, and ownership to limit possible effects with type erasure
- Uses safety effects and flow-sensitivity sparingly where they are most helpful
  - Reference card of effects, not a wall poster
- Fewer pointer types (since never exclusive) and more compatibility between them than the Ante approach
- "`const` only on pointers/references not types" and "preserve `const`" reduce the need for code duplication for const correctness

{{% note %}}

FIXME: Split into multiple slides, so we can include more content

The effect annotation approach of the second model struggled with type
erasure. So for this final model, we leaned more on fixed types to
address that weakness.

We combined that with the expressivity and precision of safety effects
and flow-sensitivity, but limited to the cases where that was most
impactful.

Safety effects and flow-sensitivity are most helpful when:
- representing transitions
- adding precision when not using all capabilities of the type
  - this includes things like "not assuming that invalidation is required when writing" and field granularity

They struggle with:
- type erasure (generics, inheritance), and
- feeding into the type information used to make decisions that affect semantics like overload resolution.

So Carbon uses these tools more as a late check that the code is valid, not to determine semantics.

The exclusivity in this final model is restricted to single ownership.
This doesn't prevent there being other pointers to the object, which
made the model much more flexible and easier to use than the exclusive
pointers of the Ante-inspired model.

{{% /note %}}

---

# Addendum

## `const`

---

## `const`

- Means: restricting permission to mutate through this path
- Const in Carbon is on pointers and references, not types
- Const not immutability
  - Arises naturally from non-exclusive pointers: if pointer `p` can point to `x` or `y`, and `x` is immutable, can't change through `p`, but a change to `y` might be observed through `p`.
  - Better match for C++
- Invalidation requires mutation, can use const to limit permissions, reducing the effects of generic or otherwise type erased code

{{% note %}}

References: safety units
[31](https://docs.google.com/document/u/0/d/11uPz2JFcq72v7pA8WnPvs98ntTDdfYO59ezygZbLwrE/edit)
[32](https://docs.google.com/document/d/1d0Vi6M72wemy2UWk10-QrZ_Gt9zf0lR1iXS-A2PH_S8/edit?tab=t.0)
[33](https://docs.google.com/document/d/198w8Zr6ZaLT7sTzp2zIb5mB_jRNYbP0Girhwqfnt85Y/edit?tab=t.0)
[33b](https://docs.google.com/document/d/1Yflg3Mi59lnrM4YaFexdRI1qAbndOChRr8TTLQdXvis/edit?tab=t.0)
[34](https://docs.google.com/document/d/1J3P_uEKtLFscz2zw1VWsBm4EBiHXd6yGJvjCLSeojJ8/edit?tab=t.0)

{{% /note %}}

---

## Immutable borrows instead of expensive copies

- If you don't mutate an object, a `const` reference is equivalent to a copy
  - Much cheaper for some types
- Carbon defaults to "value" calling convention
  - Different behavior for different types
  - Copies types where that is cheap
  - Or an immutable borrow \+ `const` reference
    - An error if a copy is needed
    - Means expensive copies will be explicit in source
- Good for generics where `T` or `const T&` will be more efficient depending on `T`

{{% note %}}

References: safety units
[31](https://docs.google.com/document/u/0/d/11uPz2JFcq72v7pA8WnPvs98ntTDdfYO59ezygZbLwrE/edit)
[32](https://docs.google.com/document/d/1d0Vi6M72wemy2UWk10-QrZ_Gt9zf0lR1iXS-A2PH_S8/edit?tab=t.0)
[33](https://docs.google.com/document/d/198w8Zr6ZaLT7sTzp2zIb5mB_jRNYbP0Girhwqfnt85Y/edit?tab=t.0)
[33b](https://docs.google.com/document/d/1Yflg3Mi59lnrM4YaFexdRI1qAbndOChRr8TTLQdXvis/edit?tab=t.0)
[34](https://docs.google.com/document/d/1J3P_uEKtLFscz2zw1VWsBm4EBiHXd6yGJvjCLSeojJ8/edit?tab=t.0)

{{% /note %}}

---

## Immutable borrows

- Rule: something that could overlap an immutable borrow can't be passed mutably
  - Validation that signatures of calls agrees with flow-sensitive state
  - Checked in the second "safety effect checking" step that doesn't affect semantics
- But Carbon's immutable borrows are not first class
  - Only for parameters and locals, not in data structures
- Tracking which places are immutable similar to which places have been shared across threads
  - Both are flow-sensitive tracking of status of places
  - Difference in triggers (value parameter borrows vs. safety effects)
  - Difference in capabilities (no writes vs. no reads or writes)

---

## Preserve `const`

- "Preserve `const`" means:
  - Function doesn't mutate through parameter
  - Function returns a derived reference
  - Caller can figure out if derived reference should be `const` based on what was passed in to the parameter
- Avoids `const` and non-`const` versions of the same function

```
class C {
  var field: i32;
  // ``const ref self`` -> doesn't mutate ``self``
  // ``^field i32*`` -> returns pointer to ``self.field``
  //    ``const`` if ``self`` is ``const`` in caller
  fn PreservesConst(const ref self) -> ^field i32* {
    return &self.field;
  }
}
```

---

# Addendum

## Initialization safety

---

## Initialization safety

FIXME

---

# Appendix

---

## Original UAF example in Carbon

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

#### Code

```
import Core library "io";

fn Run() {
  // ``buf(T)`` is Carbon's equivalent of C++'s
  // ``std::vector<T>`` or Rust's ``Vec<T>``
  var vec: buf(i32) = (1, 20, 300);
  for (i: i32 in vec) {
    vec.PushBack(i);
    Core.Print(i);
  }
}
```

</div><div class="col fragment" data-fragment-index="3">

#### Output

```none
1
20
300
1
20
300
...
```

</div>
</div>

<div class="fragment" data-fragment-index="1">

-  Not a memory safety bug in Carbon

</div><div class="fragment" data-fragment-index="2">

-  Iteration with indices to allow bounds checking

</div><div class="fragment" data-fragment-index="3">

-  Infinite loop

</div>
