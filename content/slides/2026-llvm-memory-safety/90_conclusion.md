+++
weight = 90
outputs = ["Reveal"]
+++

# Conclusion

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

<div class="fragment" data-fragment-index="1">

1.  _Place sets_: naming memory locations

</div><div class="fragment" data-fragment-index="2">

2.  _Ownership_: tree of responsiblity for objects

</div><div class="fragment" data-fragment-index="3">

3. _Alias tracking_: what a pointer can reference

</div><div class="fragment" data-fragment-index="4">

4. _Invalidation_: when a pointer can become dangling

</div>

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint `<2>owned` `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<3>^Elts` ref T;

  fn PushBack(ref self, x: T)
      `<4>invalidate(Elts)`;
}
```

</div></div>

{{% note %}}

FIXME

{{% /note %}}

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

<div class="fragment" data-fragment-index="1">

5.  _Flow-sensitivity within functions_: for precision and conciseness

</div><div class="fragment" data-fragment-index="2">

6.  _Generic checking without monomorphization_: place parameters erased before generating output code

</div>

</div><div class="col">

```carbon{}
import Core library "io";

fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<1>i32*` = &x[0];
  x.PushBack(4000);
  // ❌ Compiler error: use of ``p`` after it was
  //    invalidated by ``x.PushBack(4000)``.
  Core.Print(*p);
}
```

</div></div>

{{% note %}}

FIXME

{{% /note %}}

---

## More to this story

- Aliasing syntax
- Transfer of ownership
- Multiple owners (e.g. reference counting)
- Data race safety uses the same ingredients
  - Lifts `-Wthread-safety` into the type system, making it sound
- Other kinds of safety
- Permissive mode
- Interop with and migration from C++

<br/>

<br/>

1.5 hour presentation that goes deeper:
[video](https://drive.google.com/file/d/1tQlzpnbWZfn2WtTFMoJgF93QteByBBwm/view?usp=sharing),
[transcript](https://docs.google.com/document/d/1JB9H3KzVixAPC5WIytS4AMyrvjwzC7TXqp596veLT34/edit?usp=sharing),
[slides](https://chandlerc.blog/slides/2026-memory-safety-deep-3/)

---

## In summary

Smooth and incremental transition from C++ to safe Carbon

- Memory Safe
  - Compile-time use-after-free checking
- Expressive
  - Common C++ patterns made safe without rearchitecting
- Incremental
  - Supports C++ interop and migration

---

## Feedback and further discussion

Please join us in the #safety channel in [Carbon's Discord](https://discord.gg/ZjVdShJDAs)

https://docs.carbon-lang.dev/#join-us has instructions for joining the community

- I am [`josh11b`](https://github.com/josh11b) on [Carbon's Discord](https://discord.gg/ZjVdShJDAs) and [GitHub](https://github.com/carbon-language/carbon-lang/)
- I am [`Josh L`](https://rust-lang.zulipchat.com/#user/1095509) on [rust-lang Zulip](https://rust-lang.zulipchat.com/)

<br/>
<br/>

This presentation: https://chandlerc.blog/slides/2026-llvm-memory-safety/

---

## More resources: Safety units
 
Safety units are how we've developed the memory safety design
- [Google Drive folder](https://drive.google.com/drive/folders/1Wenw_38k-dKKk81feVzhsbaRYDrOvJag)
- Will be distilled into official proposals that update Carbon's design

<br/>
<br/>

Some safety units of interest:

- Catalog of place set expressions and safety annotations: [safety unit 40](https://docs.google.com/document/d/1wkOJaUyp19iMywKdbhCRjTvEe7s2RqDLZ2k--81OeMQ/edit?tab=t.0)
- Initialization safety: [safety unit 26](https://docs.google.com/document/d/1Aegbp2LwLI8NuWCpfv8G8pOfBqTGWoczBM6Ej5M4WQA/edit?tab=t.0)
- Thread safety WIP: [examples](https://docs.google.com/document/d/1d6QYzR4lNT32ZMUfK8v6Ff9oFuhD19tA-fviWpp7JDU/edit?tab=t.e2wembz1kcfh#heading=h.lmtmcn7hexe0), safety units [27](https://docs.google.com/document/d/1iaZYwiJBjUpoPqSNuUGAsG8SVRdlaLw3BKvDNTD81WE/edit?tab=t.0), [37](https://docs.google.com/document/d/1WCpAS5RynIsV0g1Y8QNl0UYiN591gGYontr362mfbcw/edit?tab=t.0), [43](https://docs.google.com/document/d/1WVWcmJdVBlapza_kPj2l3mOO-yw_hNXpb2u-Ren-I5M/edit?tab=t.0)
