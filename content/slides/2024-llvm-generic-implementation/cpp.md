+++
weight = 150
outputs = ["Reveal"]
+++

## C++ template representations

```cpp
template<typename T> T clamp_nonnegative(const T &a) {
  return a < T() ? T() : a;
}
```

<div class="fragment">

Two main approaches:

- Token soup with token replay: used by EDG, MSVC (old parser)
- Dependent parse trees with tree transform: used by Clang, GCC

</div>

{{% note %}}

How are C++ templates implemented?

Not enough time to talk about token soup

{{% /note %}}

---

{{< slide background-image="interstitial.jpg" background-opacity="0.5" >}}

# Dependent parse trees

---

### Dependent parse trees

Parse: build normal IR

```cpp
template<typename T> T clamp_nonnegative(const T &a) {
  return a < T() ? T() : a;
}
```

<div class="fragment">

```cpp{|8-9|1-2,5-7,10}
FunctionDecl <col:22, line:3:1> line:1:24 clamp_nonnegative 'T (const T &)'
├─ParmVarDecl <col:30, col:39> col:39 referenced a 'const T &'
╰─CompoundStmt <col:42, line:3:1>
  ╰─ReturnStmt <line:2:3, col:26>
    ╰─ConditionalOperator <col:10, col:26> '<dependent type>'
      ├─BinaryOperator <col:10, col:16> '<dependent type>' '<'
      │ ├─DeclRefExpr <col:10> 'const T' lvalue ParmVar 0xd67ffd0 'a' 'const T &'
      │ ╰─CXXUnresolvedConstructExpr <col:14, col:16> 'T' 'T'
      ├─CXXUnresolvedConstructExpr <col:20, col:22> 'T' 'T'
      ╰─DeclRefExpr <col:26> 'const T' lvalue ParmVar 0xd67ffd0 'a' 'const T &'
```

... with explicit representation for dependent constructs

</div>

---

### Dependent parse trees

Instantiate: tree transformation builds a new tree

```cpp
template<> int clamp_nonnegative<int>(const int &a) {
  return a < int() ? int() : a;
}
```

```cpp{|8-9|1-2,5-7,10}
FunctionDecl <col:22, line:3:1> line:1:24 clamp_nonnegative 'int (const int &)'
├─ParmVarDecl <col:30, col:39> col:39 used a 'const int &'
╰─CompoundStmt <col:42, line:3:1>
  ╰─ReturnStmt <line:2:3, col:26>
    ╰─ConditionalOperator <col:10, col:26> 'int'
      ├─BinaryOperator <col:10, col:16> 'bool' '<'
      │ ├─DeclRefExpr <col:10> 'const int' lvalue ParmVar 0xddc7958 'a' 'const int &'
      │ ╰─CXXScalarValueInitExpr <col:14, col:16> 'int'
      ├─CXXScalarValueInitExpr <col:20, col:22> 'int'
      ╰─DeclRefExpr <col:26> 'const int' lvalue ParmVar 0xddc7958 'a' 'const int &'
```

---

### Dependent parse trees

Instantiate: tree transformation builds a new tree

```cpp
template<> int clamp_nonnegative<int>(const int &a) {
  return a < int() ? int() : a;
}
```

```cpp{7,11}
FunctionDecl <col:22, line:3:1> line:1:24 clamp_nonnegative 'int (const int &)'
├─ParmVarDecl <col:30, col:39> col:39 used a 'const int &'
╰─CompoundStmt <col:42, line:3:1>
  ╰─ReturnStmt <line:2:3, col:26>
    ╰─ConditionalOperator <col:10, col:26> 'int'
      ├─BinaryOperator <col:10, col:16> 'bool' '<'
      │ ├─ImplicitCastExpr <col:10> 'int' <LValueToRValue>
      │ │ ╰─DeclRefExpr <col:10> 'const int' lvalue ParmVar 0xddc7958 'a' 'const int &'
      │ ╰─CXXScalarValueInitExpr <col:14, col:16> 'int'
      ├─CXXScalarValueInitExpr <col:20, col:22> 'int'
      ╰─ImplicitCastExpr <col:26> 'int' <LValueToRValue>
        ╰─DeclRefExpr <col:26> 'const int' lvalue ParmVar 0xddc7958 'a' 'const int &'
```

* May result in somewhat different tree

<!--

---

### Dependent parse trees

Good:

- *Semantic representation* of whole program
- Can reuse non-dependent portions of tree
- *Orthogonal* (mostly)

<div class="fragment">

Bad:

- Frontend IR complexity
- Builds large representation

</div>

-->