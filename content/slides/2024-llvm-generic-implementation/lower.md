+++
weight = 1100
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" background-opacity="0.5" >}}

# Bonus slides: lowering

---

## Lowering

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #1)
    -> #2 {
  var n: i32 = 0;
  var sum: #2 = 0.(#3)();
  for (elem in v.(#4)() ... v.(#5)()) {
    sum.(#6)(elem);
    ++n;
  }
  return sum.(#7)(if n != 0 then n else 1);
}
```

<div class="fragment">

->

```llvm
define void @_CAverage.Main.abc123() {
entry:
  %n.var = alloca i32, align 4
  store i32 0, ptr %n.var, align 4
  %sum.var = alloca
```

</div>
<div class="fragment">

- `#2` = `i32` (Carbon)

</div>
<div class="fragment">

- Lowers to `i32` (LLVM)

</div>

---

## Lowering

```carbon
fn Average[R:! Range where R.Value impls Numeric](v: #1)
    -> #2 {
  var n: i32 = 0;
  var sum: #2 = 0.(#3)();
  for (elem in v.(#4)() ... v.(#5)()) {
    sum.(#6)(elem);
    ++n;
  }
  return sum.(#7)(if n != 0 then n else 1);
}
```

<div class="fragment">

->

```llvm
define void @_CAverage.Main.abc123(%v.param: ptr) {
entry:
  %n.var = alloca i32, align 4
  store i32 0, ptr %n.var, align 4
  %sum.var = alloca i32, align 4
  store i32 0, ptr %sum.var, align 4
  ...
```

---

## Lowering

- Track which slots are lowered, and the lowered values

```llvm
#1 -> ptr
#2 -> i32
#3 -> <builtin implicit conversion from IntLiteral to i32>
#4 -> @_CBegin.Array.Core.abc123
#5 -> @_CEnd.Array.Core.abc123
#6 -> <builtin AddAssign for i32>
#7 -> <builtin DivWith for i32>
```

<div class="fragment">

- When lowering the same generic again, check for matching lowered values and reuse

</div>
<div class="fragment">

- Use a fingerprint of the lowered values in the decorated name of the specific

</div>

---

## Lowering

Result:

- Specifics with the same generic and same overlays lowered to the same function
- Example: `Vector(i32*).Size` and `Vector(String*).Size` are the same function

<div class="fragment">

Overlay model gives us the information to do this

- List of things that vary between specifics
- Per-specific lowered value

</div>

<!--

Imperfect: recursion / mutual recursion break the scheme, need to identify and
handle SCCs

-->