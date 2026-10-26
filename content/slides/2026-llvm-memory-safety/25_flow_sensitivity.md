+++
weight = 25
outputs = ["Reveal"]
+++

# Flow sensitivity within functions

## 2nd safety ingredient

{{% note %}}

The next safety ingredient explains why our example didn't
include an explicit place set in the pointer type.

{{% /note %}}

---

## Carbon allows you to omit places for locals

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<1>i32*` = `<2>&x[0]`;
  x.PushBack(4000);
  // ❌ Use after invalidation error
  Core.Print(*p);
}
```

<br/>

In the body of a function, can omit place sets and have them determined by the compiler

<div class="fragment" data-fragment-index="1" >

- Compiler deduces what places `p` can point to, based on the type of `&x[0]`

</div><div class="fragment" data-fragment-index="3" >

- Client code is concise
  - Our use after free example has no annotations

</div><div class="fragment" data-fragment-index="4" >

- Uses flow-sensitive analysis for precision
  - Analysis comes _after_ overload resolution

</div>

{{% note %}}

Here is our example again.

- **click** Here is the pointer type.
- For locals, the compiler can generally figure out the place sets automatically.
- So the code can omit the place set part of the pointer type.
- **click** It is determined from the type of the intializer, the address of first element of `x`.
- **click** The result is that client code can look more like C++ code, without any extra safety annotations.
- **click** And since the compiler is determining the place sets itself, it can do so in a flow-sensitive manner for more precision.
- Note though, we need to know what function is being called in order to use it in the analysis. This means things like overload selection have to happen first, before determining place sets.

{{% /note %}}
