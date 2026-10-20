+++
weight = 90
outputs = ["Reveal"]
+++

# Conclusion

---

## Ingredients

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Core library "io";

fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<2>i32*` = &x[0];
  x.PushBack(4000);
  // ❌ Compiler error
  Core.Print(*p);
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint `<3>owned` `<1>^Elts` of T;

  impl as IndexRefWith(i32)
      fn (ref self, arg: i32)
          -> `<4>^Elts` ref T;

  fn PushBack(ref self, x: T)
      `<5>invalidate(^Elts)`;
}
```

</div></div>

<div class="fragment" data-fragment-index="1">

1.  _Place sets_: naming memory locations

</div><div class="fragment" data-fragment-index="2">

2.  _Flow-sensitivity within functions_: for precision and conciseness

</div><div class="fragment" data-fragment-index="3">

3.  _Ownership_: tree of responsiblity for objects

</div><div class="fragment" data-fragment-index="4">

4. _Alias tracking_: what a pointer can reference

</div><div class="fragment" data-fragment-index="5">

5. _Invalidation_: when a pointer can become dangling

</div><div class="fragment" data-fragment-index="6">

6.  _Generic checking without monomorphization_: place parameters erased before generating output code

</div>

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

## Feedback and further discussion

- Please join us in the #safety channel in [Carbon's Discord](https://discord.gg/ZjVdShJDAs)
- https://docs.carbon-lang.dev/#join-us has instructions for joining the community
- [Google drive with safety design work](https://drive.google.com/drive/folders/1Wenw_38k-dKKk81feVzhsbaRYDrOvJag)

<br/>
<br/>

This presentation: https://chandlerc.blog/slides/2026-llvm-memory-safety/
