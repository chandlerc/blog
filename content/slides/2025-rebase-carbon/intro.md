+++
weight = 2
outputs = ["Reveal"]
+++

```carbon{}
fn `Run`() {
  var `s`: strbuf = "Hello";
  s.`Append`(" world!");
  Core.Print(`s`);
}
```

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
`<1>package Geometry`;

`<2>import Math`;

class `<3>Circle` {
  var `<4>r`: `<5>f32`;
}


fn `<6>ScaleAreaAndAppend`(
    `<7>circle`: Circle, `<7>log2_scale`: i32,
    `<10>ref` `<8>results`: `<9>buf(f32)`) {
  var `<14>area`: f32 = `<11>Math`.`<12>Pi` * `<13>c.r` * `<13>c.r`;

  // Compute and apply the scale.
  let `<15>scale`: i32 = 1 << log2_scale;
  `<16>area *= scale`;

  // Append to in the provided container.
  results.`<17>Append`(area);
}


```

</div>
<div class="col">

```cpp{}
`<2>#include <numbers>`

`<1>namespace Geometry` {

class `<3>Circle` {
public:
  `<5>float` `<4>r`;
}

auto `<6>ScaleAreaAndAppend`(
    const Circle& `<7>circle`, int `<7>log2_scale`,
    `<9>std::vector<float>``<10>&` `<8>results`) -> void {
  float `<14>area` = `<11>std::numbers`::`<12>pi` * `<13>c.r` * `<13>c.r`;

  // Compute and apply the scale.
  int `<15>scale` = 1 << log2_scale;
  `<16>area *= scale`;

  // Append to in the provided container.
  results.`<17>push_back`(area);
}

}  // Geometry
```

</div>

---

## Code organization

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
// `<1>tables.carbon`

class `<2>Table` { ... }

fn `<3>AddSeatedTable`(t: Table) { ... }
fn `<4>ClearTable`(t: Table) { ... }
```

```carbon{}
// `<5>hosting.carbon`
import library "`<6>tables.carbon`"

fn `<7>AddToWaitlist`() { ... }
fn `<8>SeatAtTable`() {
  ...
  `<9>AddSeatedTable`(t);
}
```

```carbon{}
// `<10>serving.carbon`
import library "`<11>tables.carbon`"

fn `<12>TakeOrder`() {}
fn `<13>TakePayment`() {
  ...
  `<14>ClearTable`(t);
}
```

</div>
<div class="col">

```cpp{}
// `<1>tables.h`

class `<2>Table` { ... };

inline auto `<3>AddSeatedTable`(const Table& t)
    -> void { ... }
inline auto `<4>ClearTable`(const Table& t)
    -> void { ... }
```

```cpp{}
// `<5>hosting.h`
#include "`<6>tables.h`"

inline auto `<7>AddToWaitlist`() -> void { ... }
inline auto `<8>SeatAtTable`() -> void {
  ...
  `<9>AddSeatedTable`(t);
}
```

```cpp{}
// `<10>serving.h`
#include "`<11>tables.h`"

inline auto `<12>TakeOrder`() -> void { ... }
inline auto `<13>TakePayment`() -> void {
  ...
  `<14>ClearTable`(t);
}
```

</div>
</div>

{{% note %}}

- Forward declarations
- Separate compilation of an API file and an implementation file
- Potentially multiple sharded implementation files
- Ability to decompose a package into multiple separate API files that are
  individually importable

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
// `<1>tables.carbon`

class Table { ... }

fn AddSeatedTable(t: Table);
fn `<2>ClearTable`(t: Table)`<3>;`
```

```carbon{}
// tables.`<4>impl`.carbon

fn AddSeatedTable(t: Table) { ... }
fn `<6>ClearTable`(t: Table) { `<7>...` }
```

```carbon{}
// hosting.carbon
`<8> `
fn AddToWaitlist();
fn `<9>SeatAtTable`();
```

```carbon{}
// hosting.`<10>impl`.carbon
import library "`<11>tables`.carbon"

fn AddToWaitlist() { ... }
fn SeatAtTable() {
  ...
  `<12>AddSeatedTable`(t);
}
```

</div>
<div class="col">

```cpp{}
// `<1>tables.h`

class Table { ... };

auto AddSeatedTable(const Table& t) -> void;
auto `<2>ClearTable`(const Table& t) -> void`<3>;`
```

```cpp{}
// tables`<4>.cpp`
#include "`<5>tables.h`"

auto AddSeatedTable(const Table& t)
    -> void { ... }
auto `<6>ClearTable`(const Table& t)
    -> void { `<7>...` }
```

```cpp{}
// hosting.h
`<8> `
auto AddToWaitlist() -> void;
auto `<9>SeatAtTable`() -> void;
```

```cpp{}
// hosting`<10>.cpp`
#include "hosting.h"
#include "`<11>tables`.h"

auto AddToWaitlist() -> void { ... }
auto SeatAtTable() -> void {
  ...
  `<12>AddSeatedTable`(t);
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

## Carbon code organization follows fom C++

- C++ "library" (Abseil, SQLite, ...) -> Carbon `package`
  - Typical unit of versioning, repository, distribution
- C++ header file -> Carbon API file
  - Unit of API that can be imported
- C++ source file -> Carbon `impl` file
  - Enabling physical separation of implementation, including dependencies
- C++ `*_fwd.h` headers like `ios_fwd.h` -> Carbon `extern` declarations
  - Allows wide APIs with sparse client usage to have narrow client dependencies

{{% note %}}

This is a _lot_ of complexity. But it allows us to support the _existing_
organizational schemes of large-scale C++ code bases.

{{% /note %}}

---

## Types, methods, inheritance

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
class `<1>Up` {
  fn `<2>Count`[`<3>self: Self`]() -> `<4>i32` {
    `<5>return self.count`;
  }

  fn `<6>Inc`[`<7>ref self`: Self]() {
    `<8>self.count` += 1;
  }

  private var `<9>count`: i32;
}
```

</div>
<div class="col">

```cpp{}
class `<1>Up` {
public:
  auto `<2>Count`() `<3>const` -> `<4>int` {
    `<5>return count`;
  }

  auto `<6>Inc`()`<7> `-> void {
    `<8>count += 1`;
  }

private:
  int `<9>count`;
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
`<1>base` class Up {
  `<2>virtual` fn Inc[ref self: Self]() {
    self.count += 1;
  }

  `<3>protected` var count: i32;
}

base class UpOrDown {
  `<4>extend base: Up`;

  `<5>override` fn Inc[ref self: Self]() {
    self.Add(1);
  }

  `<6>virtual` fn Dec[ref self: Self]() {
    self.Add(-1);
  }

  private fn Add[ref self: Self](
      delta: i32) {
    self.count += delta;
  }
}
```

</div>
<div class="col">

```cpp{}
`<1>class` Up {
public:
  `<2>virtual` auto Inc() -> void {
    count += 1;
  }

`<3>protected`:
  int count;
}

class UpOrDown : `<4>public Up` {
public:
  auto Inc() -> void `<5>override` {
    self.Add(1);
  }

  `<6>virtual` auto Dec() -> void {
    self.Add(-1);
  }

private:
  auto Add(delta: i32) -> void {
    count += delta;
  }
}
```

</div>
</div>

{{% note %}}

We also directly support inheritance in Carbon, just like C++. We don't expect
to support multiple inheritance in the same way as C++, but we do expect to
support the use cases for it through a mixins system.

{{% /note %}}

---

## Generics

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}


fn `<1>Max`[`<2>T`: `<6>Less`](`<3>lhs`: `<4>T`, `<3>rhs`: `<4>T`) -> T {
  return if `<5>lhs < rhs` then rhs else lhs;
}


class `<7>Point`(`<8>T`: type) {
  var x: T;
  var `<10>y`: `<9>T`;
}
```

</div>
<div class="col">

```cpp{}
template <typename `<2>T`>
  requires `<6>std::totally_ordered`<T>
auto `<1>Max`(`<4>T` `<3>lhs`, `<4>T` `<3>rhs`) -> T {
  return `<5>lhs < rhs` ? rhs : lhs;
}

template <typename `<8>T`>
class `<7>Point` {
  T x;
  `<9>T` `<10>y`;
};
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

## Generics

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}


fn Max[T: Less](lhs: T, rhs: T) -> T {
  return if lhs < rhs then rhs else lhs;
}

class Point(T: type) {
  var x: T;
  var y: T;
}
```

</div>
<div class="col">

```rust{}


fn max<T: Ord>(lhs: T, rhs: T) -> T {
    if lhs < rhs {
        rhs
    } else {
        lhs
    }
}

struct Point<T> {
    x: T,
    y: T,
}
```

</div>
</div>

{{% note %}}

Both Rust and Carbon have fairly similar generics systems. There are some minor
differences, for example how name lookup works.

{{% /note %}}
