+++
weight = 25
outputs = ["Reveal"]
+++

# Flow sensitivity within functions

## 2nd safety ingredient

---

## Carbon allows you to omit places for locals

```carbon{}
fn Run() {
  var x: buf(i32) = (1, 20, 300);
  var p: `<1>i32*` = `<2>&x[0]`;
  x.PushBack(4000);
  // ❌ Compiler error
  Core.Print(`<1>*p`);
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

{{% /note %}}
