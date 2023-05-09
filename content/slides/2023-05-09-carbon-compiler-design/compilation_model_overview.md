+++
weight = 4
outputs = ["Reveal"]
+++

# Data-oriented _compiler_ design

{{% note %}}

{{% /note %}}

---

## Data-oriented compiler design

- Based on data-oriented design popularized in the games industry
- Locality alone isn't a good model for modern hardware
- All inputs likely in memory, no slow disk or memory in practice
- Little or no "interesting" computation involved
- Memory- and cache-bandwidth will almost always be limiting factor

{{% note %}}

{{% /note %}}

---

## Simple and memory-dense rather than lazy

- Inputs all fit in memory, no underlying reason for laziness
- Emphasis on processing input near memory bandwidth speed
- Need resulting memory representation to be similarly dense as input
- Even for (very) large inputs, no reason to add complexity to eager approach
  - 10k lines of code (< 40 bytes / line) easily fits into cache across wide
    range of hardware
  - Streaming through cache at memory bandwidth seems easily acceptable speed
  - Can focus on efficient, tight processing

{{% note %}}

{{% /note %}}

---

## Core data structure pattern:

- Primary homogenous dense array packed with most ubiquitous data
- Indexed access to allow most connections to use _adjacency_
  - Avoids storage for these connections
- Side arrays for each different kind of secondary data needed
  - Connected to primary array with compressed index (smaller than pointer)
- Flyweight handles wrap indices and provide keys to the APIs

{{% note %}}

{{% /note %}}

---

## Advantages of this pattern:

- Can densely pack main array, almost every bit is used
  - Differently shaped data factored into their own densely packed arrays
  - Enumerated states or bit-pack flags to fully use every byte of cache
- Indexed access to the "next" node doesn't depend on reading the current node
  - Processor can pipeline these memory accesses

{{% note %}}

{{% /note %}}

---

## Let's look at how this manifests at every layer

{{% note %}}

First up, the lexer

{{% /note %}}
