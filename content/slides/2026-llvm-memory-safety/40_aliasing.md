+++
weight = 40
outputs = ["Reveal"]
+++

<br/>

<br/>

<br/>

<br/>

# Alias tracking

## 4th safety ingredient

What could this pointer reference?

{{% note %}}

The 4th safety ingredient is alias tracking, which is about answering the
question: "what could this pointer reference?"

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
  - This is the type of `&x[0]`
  - `^x.Elts` part is optional in source
  - provides the connection between ``p`` and ``x``

</div>

{{% note %}}

Here is a bit more of the definition of the `buf` type.

- **click** Indexing into the `buf` type is translated into a call into the `IndexRefWith` interface.
- **click** The signature of this method tells you how the return can reference the parameters.
- In this case, the result is a reference to something in `^Elts`, an abbreviation for`^self.Elts`.
- So we know the returned `T` reference is somewhere in the owned data of the `buf` object given by the `Elts` name.
- **click** This determines the place set used in the type of `p`, namely `^x.Elts`.
- This is where `p`'s needed connection to `x` comes from. 

{{% /note %}}
