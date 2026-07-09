+++
weight = 85
outputs = ["Reveal"]
+++

# Appendix: Flow-sensitivity

---

## Flow-sensitivity is used in a few places

-   Automatic aliasing for locals
-   Which places are currently shared across threads
-   Which places have been initialized

Gives a precise answer without having to be explicit in the source, but flow-sensitive analysis comes after semantics, so can't influence overload or impl selection. Only affects _validity_.

---

## Automatic aliasing for locals

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
fn F() {
  var x: i32 = 1;
  var y: i32 = 2;
  var p: `<0>i32*` = `<1>&x`;
  if (true) {
    `<8>var z`: i32 = 3;
    `<2>p = &z`;
    while (true) `<6>{`
      if (G(p)) {
        `<3>p = &x`;
      } else {
        `<4>p = &y`;
      }
      `<5>if` (H(p)) {
        `<7>break`;
      }
    }
  `<8>}`
  `<9>J(p)`;
}
```

</div><div class="col">

```



`<0>p has type ^*p i32*`, `<1>^*p = ^x`


`<2>^*p = ^z`

`<6>^*p = ^(x, y, z)`
`<3>^*p = ^x`

`<4>^*p = ^y`

`<5>^*p = ^(x, y)`
`<7>^*p = ^(x, y)`


`<8>^*p = ^(x, y), ^z invalidated`
`<9>^*p = ^(x, y)`, ``p`` is still valid

```

</div></div>


{{% note %}}

If the place parameter on a local is omitted, **Click** it is given a new place
set whose value is determined by the compiler, and is allowed to change
from statement to statement. A flow-sensitive analysis determines a set
of places that are possible at each point.

\<step through the analysis\>

- **Click** Initialization and **Click**  assignment statements overwrite the place set
  based on the type of the right hand side. **Click** **Click** 
- **Click** When two control paths join, we take the union of the places
  that are possible on the two paths. **Click**
- **Click** Note that `p` can only reference `x` or `y` when the loop is exited.
- By having different values at different points, we can get
  more precision than if we had a fixed place set with the union
  over the course of the whole function.
- **Click** Here `p` remains valid even when the local `z` is invalidated from leaving its scope.
- **Click** Allowing its use.

{{% /note %}}

---

## Properties of places

Fixed:

-   Single place or multiple?
-   Type?
-   Overlap with other places?
-   Owner

Flow-sensitive:

-   Initialized?
-   Can write?
-   Shared across threads?
-   Guarding mutex is currently acquired?
