+++
weight = 50
outputs = ["Reveal"]
+++

# Carbon / C++ interop

## Allows mixing C++ and Carbon during migration

{{% note %}}

Realistically, one file migrated to Carbon would still call and be called by other C++ code. Interop allows that to continue.

{{% /note %}}

---

## Interop: Strict Carbon calling C++

### Conservative heuristic C++ contract assumed

```carbon{}
import Cpp library "<vector>";

fn Run() {
  // C++ std::vector<T>
  var x: `<1>Cpp.std.vector(i32)` = (1, 20, 300);
  // `<2>Pointer into ^x.any`
  var p: i32* = &x[0];
  // `<3>Any non-const method invalidates`
  // iterators from and pointers into ``x``.
  x.push_back(4000);
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

<div class="fragment" data-fragment-index="2">

- Assumes returns can alias anything reachable from parameters, including ``*this``

</div>
<div class="fragment" data-fragment-index="3">

- `unknown` effect: all non-const `std::vector` methods will invalidate all derived pointers and iterators

</div>

{{% note %}}

- In addition to the straightforward C++ interop from permissive Carbon, we also support calling C++ from strict Carbon
- This relies on a heuristic for determining a conservative safety contract for C++ functions.
- Here is the same use-after-free example, except **Click** with a C++ standard vector.

{{% /note %}}

---

## Interop: Strict Carbon calling C++

### Conservative heuristic will have false positives

```carbon{}
fn Run() {
  // C++ std::vector<T>
  var x: Cpp.std.vector(i32) = (1, 20, 300);
  // Pointer into ``^x.any``.
  var p: `<1>i32* = &x[0]`;
  // `<2>x[1] is a non-const method call!`
  // so it invalidates ``p``!
  var q: `<2>i32* = &x[1]`;
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x[1]``.
  Core.Print(*p);
}
```

<div class="fragment" data-fragment-index="2">

- `[]` operator can invalidate in other containers, such as `absl::flat_hash_map`

</div><div class="fragment" data-fragment-index="4">

- Can't be more precise without additional information about the C++ API

</div>

---

## Interop: Carbon calling C++

### Argument aliasing heuristic

"shared XOR mutable" rule for allowed aliasing of reference parameters

```cpp
void F(`<1>const int& a`, `<1>const int& b`, `<2>int& c`, `<2>int& d`);
```

<br/>

<div class="fragment" data-fragment-index="1">

- `a` and `b` are `const` and so may overlap

</div><div class="fragment" data-fragment-index="2">

- `c` and `d` are not `const` and so must be disjoint from each other and from `a` and `b`

</div><div class="fragment" data-fragment-index="3">

- As if this Carbon function:

```
void F(const ref a: i32, const ref b: i32,
       ^ ref c: i32, ^ ref d: i32);
```

</div>

{{% note %}}

Carbon has its own notion of "shared XOR mutable" which only applies
when calling C++ functions.

{{% /note %}}

---

## Interop: Strict Carbon calling C++

### Heuristic is precise for simple APIs

Don't have to write a wrapper to call C++ functions unless there is something interesting to say about the safety contract (some choice not expressed in the C++ signature)

- Functions that don't take pointer parameters beyond `this`
- Functions that don't return pointers or references
  - Or the caller shouldn't hold onto the return, like with `Cpp.std.cout <<`...
- Or the heuristic is close enough that no wrapper is needed

---

## Interop: Strict Carbon calling C++

### Heuristic is sufficient for light usage

- Fewer wrappers means less boilerplate, toil, and friction

{{% note %}}

References:
- [Safety Unit No. 38: C++ const& params](https://docs.google.com/document/d/19NO1pBXB8VUFb6kO08qssE6RkuW84SzLU8WjWT91mEg/edit?tab=t.0#heading=h.7hwbrvenqhof)
- [Safety Unit No. 44: calling C++](https://docs.google.com/document/d/1sXzXLttz93aQv5Dql_lPAIhk0B9njJKB3SsvRvV3UWk/edit?tab=t.0)

{{% /note %}}

---

## Reverse interop: C++ calling Carbon

- Actual argument values of place parameters are erased, and so are not required to call Carbon
  - (also needed for separate compilation)
- Carbon assumes C++ code respects the aliasing constraints specified in Carbon signatures

{{% note %}}

Reference: [Safety Unit No. 47: separate compilation](https://docs.google.com/document/d/14TjtgXoIB4eAp_JDO_2BF_bpOukU229iOeI0ZR8oidc/edit?tab=t.0)

{{% /note %}}

---

# Eliminating undefined behavior

## by migrating to strict Carbon

---

## Undefined behavior (UB)

- Fully strict code has no UB
- Permissive code with no safety annotations has a subset of the UB of the corresponding C++ code
  - Some UB is diagnosed (e.g. ODR)
  - Some UB becomes erroneous behavior (signed arithmetic overflow)
    - Means won't optimize based on unvalidated assumptions that could introduce UB
- Execution within Carbon, with no C++, only has UB in permissive mode or after the execution passes through an operation marked `unsafe`

---

## Undefined behavior (UB)

### Mixing modes doesn't compromise safety

Adding safety annotations to permissive code or switching to strict mode never introduces UB
- May optimize based on safety information, but not in ways that introduce UB if unsafe code compromises safety assumptions
- 🦀 No [Rustonomicon](https://doc.rust-lang.org/nomicon/) saying it is UB to to alias a mutable reference

---

## Undefined behavior (UB)

### Reasonable C++ code doesn't compromise safety

As long as C++ code follows a set of rules, it is won't introduce UB into strict Carbon code
- Code violating the rules should be recognized as either buggy or dangerous by C++ developers
- Should be reasonable to build a sanitizer to detect violations of the rules
  - Like Clang's upcoming `-fbounds-safety`
- Example: `delete this;` is considered dangerous, and Carbon assumes the C++ code won't do it

{{% note %}}

We can build the sanitizer reactively if we find that we need it.

Reference: [C++ FAQ: delete this](https://isocpp.org/wiki/faq/freestore-mgmt#delete-this)

{{% /note %}}

<!--

OLD TEXT - not needed for the presentation

* Less UB, even in permissive mode  
  * Where possible, bad code is diagnosed, such as ODR  
  * Otherwise we try and make it erroneous behavior instead of UB  
    * Means won't optimize   
* Safety annotations may affect code generation, but not in ways that introduce UB when they are incorrect
  * Example: Won't optimize on disjointness of parameters
  * FIXME: Optimize loads based on immutability?

Result: Mixing modes doesn't compromise safety

Unsafe code can do things that compromises the safety of strict mode code, but that code would have been UB without the extra safety checking of strict mode. Unsafe code can prevent Carbon from detecting UB in strict code, but it would have been UB without the extra safety checking of strict mode.

* Permissive Carbon or C++ code without UB doesn't compromise safety of strict mode code.  
  * 🦀 No [Rustonomicon](https://doc.rust-lang.org/nomicon/); no reliance on exclusivity or other invariants C++ code ordinarily doesn't abide by  
  * Only concern is strict code relying on the safety contract promised by the signature of called functions.  
* Monotonic increase in safety as code migrated to Carbon, function contracts updated, strict checking enabled

FIXME: Gemini says:

* **Less Undefined Behavior**: Permissive mode diagnoses bad code or makes it "erroneous behavior" instead of UB.
* **Fail-Safe Annotations**: Incorrect safety annotations do not introduce UB.
* **Safe Interoperability**: Mixing strict Carbon with permissive Carbon or C++ does not compromise safety.
* **No Exclusivity Trap**: Carbon doesn't rely on invariants (like Rust's exclusivity) that C++ violates.
* **Monotonic Safety**: Safety increases incrementally as code is migrated and checked.


- If you had no safety annotations: would have subset of UB of C++
- Adding safety annotations detects some UB and does not introduce new UB
- Fully strict code has no UB
- Execution within Carbon, no C++, only has UB in permissive mode, or after the execution passes through an unsafe operation
  - For these purposes, C++ code is considered permissive without unsafe unless it has a bug that would be recognized as bug by C++ developers
  - Concern: unusual C++ code that does things like `delete this;`
    https://isocpp.org/wiki/faq/freestore-mgmt#delete-this
- Goal: compositional understanding of the safety of a library

-->