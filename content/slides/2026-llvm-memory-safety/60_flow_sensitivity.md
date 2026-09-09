+++
weight = 60
outputs = ["Reveal"]
+++

# Flow sensitivity within functions

## 5th safety ingredient

---

## Automatic aliasing for locals

- Few safety annotations needed for locals
  - More concise
  - More like C++
- Uses flow-sensitive analysis for precision
  - Reduces invalidations
  - Analysis comes _after_ overload resolution
  - Overloads selected is an input into the analysis

{{% note %}}

**slide**

- As previously mentioned, we also have defaults for function signature annotations, but can only use defaults there some of the time
- Don't have defaults for types. Expectation is they are written less often, and require some care

{{% /note %}}
