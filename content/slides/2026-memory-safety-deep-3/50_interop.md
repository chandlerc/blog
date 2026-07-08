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

## Interop: Carbon calling C++

### Data structure aliasing

- C++ classes that can reference external/unowned memory have an additional place set parameter in Carbon
  - Includes C++ base classes accessed by a pointer or reference
- Assumption is returned objects could reference anything passed in

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
