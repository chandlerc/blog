+++
weight = 80
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# The language foundations that support checked generics

{{% note %}}

- Looking back, we can see a lot of ways the non-generic parts of the language
  need to be a certain way to support checked generics.

{{% /note %}}

---

## Generics imposes constraints on the rest of the language

- Carbon is using different foundations than are present in C++

---

## Checked generics need: Name lookup isn't very context-sensitive

- Helpful for readers of the code
- _Necessary_ if you want code to have the same meaning whether it is generic or
  not
- To be able to type check a function call, must be able to say what its
  signature is
- Carbon has package namespacing, no
  [argument-dependent lookup](https://en.cppreference.com/w/cpp/language/adl),
  and no open overloading to reduce context-sensitivity

{{% note %}}

- Open overloading is where different libraries can see different overloads of
  the same function
- Notice that omitting features from the language design can be just as
  important as the features included.

{{% /note %}}

---

## Checked generics need: no ad-hoc specialization

How can we type check code using `vector<T>` without knowing `T` if its API
changes when `T==bool`?

---

## Checked generics need: no circular dependencies

Shows up in unexpected ways in Carbon's specialization support

{{% note %}}

- At least, it was a surprise to me -- it felt more like a discovery than an
  invention

{{% /note %}}

---

## Checked generics need: coherence

- Coherence is something that Carbon takes seriously even outside the context of
  generics
  - We don't want the meaning of code to change if an import is added
  - We think it makes code much easier to understand and manage at scale
- Coherence and specialization are both good; they work even better together

<!-- "Because the Coherence problem is the actual Problem To Be Solved." -->
<!-- - https://news.ycombinator.com/item?id=35769018 -->

---

## Checked generics need: simplification

- Carbon's interface implementation is its only mechanism for open extension,
  and its only mechanism for specialization
- Means there is only one way to overload an operator, iterate through a
  container, and so on
- Simplicity elsewhere in the language, particularly in the type system, reduces
  complexity of checked generics geometrically
