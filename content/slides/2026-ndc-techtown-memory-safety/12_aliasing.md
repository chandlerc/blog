+++
weight = 12
outputs = ["Reveal"]
+++

# Alias tracking

## 3rd safety ingredient

{{% note %}}

Alias tracking answers the question: "What could this pointer reference?"

{{% /note %}}

---

## Aliasing declared on APIs

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<3>i32*` = &`<1>x[0]`;

  // ...
}
```

</div><div class="col">

```carbon{}
class buf(T: ...) {
  disjoint owned ^Elts of T;

  impl as `<1>IndexRefWith(i32)`
      fn (`<2>ref self`, arg: i32) -> `<2>^Elts` ref T;

  // More later
}
```

</div></div>

<div class="fragment" data-fragment-index="2">

- `^Elts` in the return is short for `^self.Elts`
- Defines how the return aliases the parameters

</div><div class="fragment" data-fragment-index="3">

- `p` is given the type `^x.Elts i32*`
  - `^x.Elts` part is determined by compiler, optional in source
  - provides the connection between ``p`` and ``x``

</div><div class="fragment" data-fragment-index="4">

- This is enough to connect `p` to `x` in our `Run()` example
  - We'll revisit alias tracking comprehensively after introducing _invalidation effects_ and _flow tracking_ to see how they all work together

</div>

{{% note %}}

- **Click** `^Elts` in the return type is short for `^self.Elts`, declaring how the returned reference aliases the `self` parameter.
- **Click** This gives `p` the type `^x.Elts i32*`, connecting `p` to the elements owned by `x`.
- **Click** That's the only piece of alias tracking we need to complete our motivating use-after-free example. Once we introduce invalidation effects and flow-sensitive tracking for locals, we'll come back to alias tracking more comprehensively to see how parameter aliasing, return aliasing, and data structures fit together with effects and flow tracking.

{{% /note %}}
