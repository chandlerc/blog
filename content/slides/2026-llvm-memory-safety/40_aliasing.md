+++
weight = 40
outputs = ["Reveal"]
+++

# Alias tracking

## What could this pointer reference?

## 3rd safety ingredient

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

</div>
