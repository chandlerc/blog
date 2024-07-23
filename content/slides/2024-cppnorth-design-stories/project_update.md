+++
weight = 1
outputs = ["Reveal"]
+++

# Carbon Language

# after 2 years...

{{% note %}}

{{% /note %}}

---

{{< slide auto-animate="" >}}

## Carbon: an experimental _successor_ to C++

Starts with our goals for C++ in https://wg21.link/p2137r0:

- Performance-critical software
- Software and language evolution
- Code that is easy to read, understand, and write
- Practical safety and testing mechanisms
- Fast and scalable development
- Modern OS platforms, hardware architectures, and environments

{{% note %}}

- Carbon's goals as a successor language to C++ start from the goals we outlined
  in P2137 for C++ itself: [read goals].
- Today, while C++ may be the best language out there to hit these goals, it
  still leaves a _lot_ on the table, and the gaps are widening in terms of what
  we'd like to see here, not narrowing.
- Because C++ is struggling to improve and better address these goals, we'd like
  to try a different approach as a successor language, which does slightly tweak
  these goals...

{{% /note %}}

---

{{< slide auto-animate="" >}}

## Carbon: an experimental _successor_ to C++

- Performance-critical software
- Software and <span class="fragment highlight" data-fragment-index="3">language
  evolution</span>
- Code that is easy to read, understand, and write
- Practical safety and testing mechanisms
- Fast and scalable development
- Modern OS platforms, hardware architectures, and environments
- <span class="fragment highlight" data-fragment-index="1">_Interoperability</span>
  with and
  <span class="fragment highlight" data-fragment-index="2">migration</span> from
  existing C++ code_

{{% note %}}

- We need to add a goal to address interoperability and migration from existing
  C++ code. If we can do _that_ while also addressing these other goals, we have
  a really compelling direction.
- But to sustain that going forward, we can't just improve once. We need the
  language to continue to evolve over time.

{{% /note %}}

---

## Carbon open source project

https://github.com/carbon-language/carbon-lang

<div class="diagram-center">
<a href="https://star-history.com/#carbon-language/carbon-lang">
<img alt="Carbon's GitHub star history graph"
     src="carbon-star-history.webp"
     height="720">
</a>
</div>

{{% note %}}

- We went public two years ago ... you might be able to see when. =D Way to go
  CppNorth, and thanks for the awesome launch event!

- Steady activity and growth over the two years since then!

{{% /note %}}

---

## Carbon open source project

- 1750 PRs merged since we were here last
- 121 new contributors
- Active [Discord server](https://discord.gg/ZjVdShJDAs), both real-time and async discussion
- Defined [project milestones](https://github.com/carbon-language/carbon-lang/blob/trunk/docs/project/milestones.md)
- Publishing [annual roadmaps](https://github.com/carbon-language/carbon-lang/blob/trunk/docs/project/roadmap.md)

---
{{< slide visibility="hidden" >}}

## Carbon's milestones

- **0.1**: the MVP (Minimum Viable Product) to _start_ evaluating Carbon
  - Focused on complete, functioning _C++ interop_
- **0.2**: feature complete to enable both finishing evaluations & concluding
  experiment
  - Notable feature: _memory safety_
- **1.0**: _if_ the experiment is successful, our production-ready milestone

{{% note %}}

{{% /note %}}

---
{{< slide class="vcenter" visibility="hidden" >}}

## These milestones are **_over one year_** in scope

### We're building for _sustainability_ and the _long term_ {.fragment}

---

## Carbon's roadmap for 2024: _Implementation!_

{{% note %}}

- Drive the toolchain's implementation
- Toolchain can build a minimal program mixing C++ and Carbon
- Share ideas & progress with the C++ community (Hi!)

Maybe live demo the toolchain type checking a generic?

{{% /note %}}

---

## But this talk isn't about Carbon's toolchain...

{{% note %}}

Let's dive into some complex corners of C++ and Carbon and talk about how the
design process of the Carbon features aiming to align and interop with those C++
features taught me more about them and changed how I think about them...

{{% /note %}}
