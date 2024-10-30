+++
weight = 1000
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" background-opacity="0.5" >}}

# Bonus slides: token soup

---

### Token soup

Parse: collect list of tokens

```cpp
template<typename T> T clamp(const T &a)
  = { "return" "a" "<" "T" "(" ")" "?" "T" "(" ")" ":" "a" ";" }
```

<div class="fragment">

Instantiate: replay tokens

```cpp
template<> int clamp<int>(const int &a) {
  return a < int() ? int() : a;
}
```

Or:

```cpp
using T = int;
template<> T clamp<T>(const T &a) {
  return a < T() ? T() : a;
}
```

---

### Token soup

Good:

- Simple: reuses components you already had
- Orthogonal: rest of frontend doesn't need to know
- "Parsing" templates is very cheap
- *Permissive* and *compatible*: can choose how to interpret code late
  - No need for `typename X::template Y<...>`
  - Better *error recovery*

<div class="fragment">

Bad:

- Incomplete (example: redeclaration matching)
- Pay full cost for each instantiation

</div>
<div class="fragment">

- Wrong

</div>

---

### Token soup

```cpp
int a = 1;
namespace N {
  template<typename T> int f() { return a; }
  int a = 2;
}
int b = N::f<int>();
```

<div class="fragment">

EDG:

- Name lookup during instantiation ignores things declared later
- Prototype instantiation immediately after definition
  - Diagnose templates with syntax errors
  - Collect information from template definition context and annotate on tokens

</div>

<div class="fragment">

MSVC (old parser):

- `b == 2`

</div>

---

### Token soup

- Easy to implement
- Hard to implement well