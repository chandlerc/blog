+++
weight = 200
outputs = ["Reveal"]
+++

### Subtree reuse

{{% note %}}

Incredibly important to reuse

This is the largest source of avoidable cost

{{% /note %}}

Clang `TreeTransform`

- Attempts to reuse non-dependent parts of tree

```cpp{|3,7,9}
template<range R> auto average(const R &v)
    -> range_value_t<R> {
  int n = 0;
  range_value_t<R> sum = 0;
  for (auto &elem : v) {
    sum += elem;
    ++n;
  }
  return sum / (n ? n : 1);
}
```

<div class="fragment">

Actually reuses:

```cpp
IntegerLiteral <line:3:11> 'int' 0
IntegerLiteral <line:4:26> 'int' 0
IntegerLiteral <line:9:25> 'int' 1
```

</div>

---

### Subtree reuse

Clang `TreeTransform`

- Attempts to reuse non-dependent parts of tree
- Usually fails

Why?

<div class="fragment">

- Children change
- Local variables
- Types change
- Initializers
- Pack expansions

</div>

---

### Dependent parse trees

Cost of building instantiation

- Comparable to cost of building template
- Usually less: *some* work is shared
  - Parsing
  - Unqualified name lookup
  - Reuse some non-dependent parts of tree
- Can still be surprisingly high

---

### Example: type trait

```cpp
template<typename T> struct is_const {
  static constexpr bool value = __is_const(T);
};
const bool b1 = is_const<int[1]>::value;
const bool b2 = is_const<int[2]>::value;
...
```

<!--
1000001: 47.49user 2.14system 0:49.67elapsed 99%CPU (0avgtext+0avgdata 3165492maxresident)k
      1: 0.04user 0.05system 0:00.09elapsed 100%CPU (0avgtext+0avgdata 94208maxresident)k

- 50 µs, 3 KiB per variable


minus null: 6.47user 1.22system 0:07.70elapsed 99%CPU (0avgtext+0avgdata 1428792maxresident)k

- 43 µs, 1.6 KiB per instantiation


-fsyntax-only: 36.33user 1.69system 0:38.05elapsed 99%CPU (0avgtext+0avgdata 2899928maxresident)k
   minus null: 4.28user 0.91system 0:05.20elapsed 99%CPU (0avgtext+0avgdata 1428040maxresident)k

- 33 µs, 1.5 KiB per variable
-->

<div class="fragment">

- 43 µs, 1.6 KiB per instantiation

</div>
<div class="fragment">

```cpp
template<typename T>
constexpr bool is_const = __is_const(T);
const bool b1 = is_const<int[1]>;
const bool b2 = is_const<int[2]>;
...
```

</div>
<div class="fragment">

<!--
30.55user 1.50system 0:32.07elapsed 99%CPU (0avgtext+0avgdata 2501884maxresident)k
0.05user 0.04system 0:00.09elapsed 98%CPU (0avgtext+0avgdata 94208maxresident)k

- 30 µs, 2.4 KiB per variable
-->

- 23 µs, 1.0 KiB per instantiation

</div>
<div class="fragment">

<!--

Raw:

```cpp
const bool b = __is_const(int[N]);
```

</div>
<div class="fragment">

8.45user 1.00system 0:09.45elapsed 99%CPU (0avgtext+0avgdata 1670084maxresident)k
0.04user 0.05system 0:00.09elapsed 100%CPU (0avgtext+0avgdata 93184maxresident)k

- 8.4 µs, 1.6 KiB per variable (!)

-fsyntax-only: 6.69user 0.94system 0:07.64elapsed 99%CPU (0avgtext+0avgdata 1668016maxresident)k
     baseline: 0.01user 0.02system 0:00.03elapsed 100%CPU (0avgtext+0avgdata 86016maxresident)k

- 7.6 µs, 1.6 KiB per variable (!!)


Null:

```cpp
const bool b = false;
```
6.47user 1.22system 0:07.70elapsed 99%CPU (0avgtext+0avgdata 1428792maxresident)k
0.05user 0.04system 0:00.10elapsed 99%CPU (0avgtext+0avgdata 93184maxresident)k

- 7.7 µs, 1.4 KiB per variable (!)

-fsyntax-only: 4.28user 0.91system 0:05.20elapsed 99%CPU (0avgtext+0avgdata 1428040maxresident)k
     baseline: 0.01user 0.01system 0:00.03elapsed 97%CPU (0avgtext+0avgdata 86016maxresident)k

- 5.2 µs, 1.3 KiB per variable (!!)
-->

Directly computing `__is_const(int[N])`:

- 0.7 µs, 0.2 KiB

</div>


<!--

Null:

```carbon
fn F() {
  let b0: bool = false;
  let b1: bool = false;
  ...
```

0.82user 0.07system 0:00.90elapsed 99%CPU (0avgtext+0avgdata 467916maxresident)k

Raw:

```carbon
fn __is_const(T:! type) -> bool = "is_const";

fn F() {
  let b0: bool = __is_const([i32; 0]);
  let b1: bool = __is_const([i32; 1]);
  ...
```

2.84user 0.15system 0:03.01elapsed 99%CPU (0avgtext+0avgdata 1351428maxresident)k

- 2.1 µs, 0.9 KiB per instantiation

Generic fn:

```carbon
fn IsConst(T:! type) -> bool {
  return __is_const(T);
};

fn F() {
  let b0: bool = IsConst([i32; 0]);
  let b1: bool = IsConst([i32; 1]);
  ...
```

3.95user 0.15system 0:04.10elapsed 99%CPU (0avgtext+0avgdata 1369856maxresident)k

- 4.1 µs, 0.9 KiB per instantiation (18 B more per instantiation!!!)

-->