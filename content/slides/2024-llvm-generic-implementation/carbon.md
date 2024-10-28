+++
weight = 300
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" background-opacity="0.5" >}}

# Faster? Smaller?

{{% note %}}

For Carbon we wanted to try to find an alternative representation that would
require less memory and that we could compile faster

{{% /note %}}

---

## Carbon approach: overlay

Idea: treat instantiation as overlay on template

- Instantiation is dependent parse tree plus set of "patches"
- Only represent the parts that change
- Only rebuild the parts that change

{{% note %}}

Data-oriented design approach:
do this with dense arrays

{{% /note %}}


<!--

---

## Carbon toolchain

- Prioritize performance over ease of implementation
- Data oriented design

-->

---

## Carbon toolchain

Parse generic:

- Build array of dependent constructs
- Generic refers opaquely to array elements

<div class="fragment">

Build specific:

- Compute concrete value corresponding to array elements

</div>

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: `<0>R`)
    -> `<1>R`.Value {
  var n: i32 = 0;
  var sum: `<1>R`.Value = 0;
  for (elem in v) {
    sum += elem;
    ++n;
  }
  return sum / (if n != 0 then n else 1);
}
```

{{% note %}}

Start by identifying a value that is dependent

Find all the places it occurs

Also in types and constant values of subexpressions

{{% /note %}}

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #0)
    -> `<0>#0.Value` {
  var n: i32 = 0;
  var sum: `<0>#0.Value` = 0;
  for (elem in v) {
    sum += elem;
    ++n;
  }
  return sum / (if n != 0 then n else 1);
}
```

- `#0` = `R`

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #0)
    -> #1 {
  var n: i32 = 0;
  var sum: #1 = `0`;
  for (elem in v) {
    sum += elem;
    ++n;
  }
  return sum / (if n != 0 then n else 1);
}
```

- `#0` = `R`
- `#1` = `#0.Value`

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #0)
    -> #1 {
  var n: i32 = 0;
  var sum: #1 = 0.(`ImplicitAs(#1).Convert`)();
  for (elem in v) {
    sum += elem;
    ++n;
  }
  return sum / (if n != 0 then n else 1);
}
```

- `#0` = `R`
- `#1` = `#0.Value`

`R.Value impls Numeric` implies that<br>
`IntLiteral(0) impls ImplicitAs(R.Value)`

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #0)
    -> #1 {
  var n: i32 = 0;
  var sum: #1 = 0.(#2)();
  for (elem in v) {
    sum += elem;
    ++n;
  }
  return sum / (if n != 0 then n else 1);
}
```

- `#0` = `R`
- `#1` = `#0.Value`
- `#2` = `(IntLiteral(0) as ImplicitAs(#1)).Convert`

---

## Building a generic

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #0)
    -> #1 {
  var n: i32 = 0;
  var sum: #1 = 0.(#2)();
  for (elem in v.(#3)() ... v.(#4)()) {
    sum.(#5)(elem);
    ++n;
  }
  return sum.(#6)(if n != 0 then n else 1);
}
```

- `#0` = `R`
- `#1` = `#0.Value`
- `#2` = `(IntLiteral(0) as ImplicitAs(#1)).Convert`
- `#3` = `#0.Begin`
- `#4` = `#0.End`
- `#5` = `(#1 as AddAssign).Op`
- `#6` = `(#1 as DivWith(i32)).Op`

(Pseudocode, actually done in SemIR)

---

## Generic representation

These are *instructions* extracted from the generic:

- `#0` = `R`
- `#1` = `#0.Value`
- `#2` = `(IntLiteral(0) as ImplicitAs(#1)).Convert`
- `#3` = `#0.Begin`
- `#4` = `#0.End`
- `#5` = `(#1 as AddAssign).Op`
- `#6` = `(#1 as DivWith(i32)).Op`

<div class="fragment">

Can represent this as a block of code

</div>

---

## Generic representation

We have computed a *compile-time function* to form a specific from a generic:

```carbon
fn MakeAverageSpecific(R:! Range where R.Value impls Numeric) -> <function> {
  let v0:! auto = R;
  let v1:! auto = v0.Value;
  let v2:! auto = (IntLiteral(0) as ImplicitAs(v1)).Convert;
  let v3:! auto = v0.Begin;
  let v4:! auto = v0.End;
  let v5:! auto = (v1 as AddAssign).Op;
  let v6:! auto = (v1 as DivWith(i32)).Op;
  return <make specific>(Average, (v0, v1, v2, v3, v4, v5, v6));
}
```

<div class="fragment">

Forming a specific from a generic is compile-time function evaluation.

</div>

---

## Building a specific

```carbon
MakeAverageSpecific([i32; 3])
```

```carbon
fn MakeAverageSpecific(R:! Range where R.Value impls Numeric) -> <function> {
  let v0:! auto = R;
  let v1:! auto = v1.Value;
  let v2:! auto = (IntLiteral(0) as ImplicitAs(v1)).Convert;
  let v3:! auto = v0.Begin;
  let v4:! auto = v0.End;
  let v5:! auto = (v1 as AddAssign).Op;
  let v6:! auto = (v1 as DivWith(i32)).Op;
  return <make specific>(Average, (v0, v1, v2, v3, v4, v5, v6));
}
```

---

## Building a specific

```carbon
MakeAverageSpecific([i32; 3])
```

```carbon
fn MakeAverageSpecific(R:! Range where R.Value impls Numeric) -> <function> {
  let v0:! auto = [i32; 3];
  let v1:! auto = i32;
  let v2:! auto = <builtin IntLiteral to i32 conversion>;
  let v3:! auto = [i32; 3].Begin;
  let v4:! auto = [i32; 3].End;
  let v5:! auto = <builtin AddAssign for i32>;
  let v6:! auto = <builtin DivWith for i32>;
  return <make specific>(Average, (v0, v1, v2, v3, v4, v5, v6));
}
```

---

## Specific representation

<div class="col-container"><div class="col">

#### Generic

```
Average[R:! Range where...]

inst[0] = R
inst[1] = #0.Value
inst[2] =
  (IntLiteral(0) as ImplicitAs(#1)).Convert
inst[3] = #0.Begin
inst[4] = #0.End
inst[5] = (#1 as AddAssign).Op
inst[6] = (#1 as DivWith(i32)).Op
```

</div><div class="col">

#### Specific

```
Average with R = [i32; 3]

value[0] = [i32; 3];
value[1] = i32;
value[2] =
  <builtin IntLiteral to i32 conversion>;
value[3] = [i32; 3].Begin;
value[4] = [i32; 3].End;
value[5] = <builtin AddAssign for i32>;
value[6] = <builtin DivWith for i32>;
```

</div></div>

<div class="fragment">

```carbon
let a: [i32; 3] = (1, 2, 3);
let b: auto = Average(a);
```

</div><div class="fragment">

- Look up return type of generic: `inst[1]`
- Look up `value[1]` in specific: `i32`
 
</div>

---

## Templates

So far, only talked about types and constant values that *symbolically* depend on
generic parameters.

What about templates?

- Kind of instruction may depend on parameters
- Validity may depend on parameters too

---

## Templates

Add another kind of instruction to instantiate a single expression

```carbon
fn CallF[template T:! type](x: T) {
  `x.F`();
}
```

---

## Templates

Add another kind of instruction to instantiate a single expression

```carbon
fn CallF[template T:! type](x: T) {
  `#0()`;
}
```

- `#0` = ``<instantiate member access>(`x`, `F`)``

---

## Templates

Add another kind of instruction to instantiate a single expression

```carbon
fn CallF[template T:! type](x: T) {
  #1;
}
```

- `#0` = ``<instantiate member access>(`x`, `F`)``
- `#1` = ``<instantiate call>(#0)``

<div class="fragment">

Evaluating `<instantiate>` instruction produces another instruction
- Evaluation can fail

</div><div class="fragment">

Not a dependent parse tree representing the eventual meaning of the program
- Instead, a *computation* that builds that meaning

</div>

---

## Templates

Forming a specific is still a compile-time function evaluation

- But have compile-time instruction that computes another instruction
- Useful metaprogramming tool in general

---

## Code complexity cost

Lose orthogonality

- Clang: `Expr*`, `Stmt*`, `Decl*`
  - Same for non-template and template

- Carbon: `pair<InstId, SpecificId>`
  - Must track `SpecificId` when navigating IR
  - Whole toolchain needs to know about generics

{{% note %}}

Example of non-orthogonality

{{% /note %}}