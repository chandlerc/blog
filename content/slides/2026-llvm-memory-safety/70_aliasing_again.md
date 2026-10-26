+++
weight = 70
outputs = ["Reveal"]
+++

# Alias tracking

## (continued)

{{% note %}}

We talked before how a function return could alias its inputs,
but there are two other cases for tracking aliasing.

{{% /note %}}

---

## Aliasing between parameters

- Carbon has a vocabulary for expressing whether parameters are disjoint or may overlap
- If disjoint, caller has to have a proof
  - Gives the callee more information
- "May overlap" is the default

```carbon{}
fn OverlapError(ref b: buf(i32), ref s: i32) invalidate(^b.Elts) {
  `b.PushBack(s)`;
  // ❌ Error: ``s`` may overlap ``^b.Elts``,
  //    invalidated by ``b.PushBack(s)``.
  `s` = b.Size();
}
```


{{% note %}}

- A function's parameters could alias each other.
- This means **click** a change to one parameter could invalidate **click** the other.
- So Carbon has a syntax to require that callers provide disjoint parameters.

{{% /note %}}

---

## Aliasing in data structures

### Types with external pointers

- Pointer in classes must specify explicitly what they can point to
- Classes that reference something external need to have a place parameter

```carbon{}
class HasPtr(`^A of i32`) {
  var p: `^A` i32*;
}

fn Example() {
  var i: i32 = 1;
  var has_ptr: HasPtr(`^i`) = {.p = &i};
}
```

🦀 Rust similarly requires a lifetime parameter when fields reference something outside that struct.

{{% note %}}

- If a type is going to reference a place that isn't a field or owned, it needs **Click** a place parameter.
- This introduces a name that can be used in **Click** the types within the class.
- **Click** Which is then specified when instantiating that type.

References: [safety unit 33](https://docs.google.com/document/d/198w8Zr6ZaLT7sTzp2zIb5mB_jRNYbP0Girhwqfnt85Y/edit?tab=t.0)  

{{% /note %}}
