+++
weight = 3
outputs = ["Reveal"]
+++

# Carbon's compile-time goals

{{% note %}}

{{% /note %}}

---

## Carbon has a goal of fast compile times:

> Software development iteration has a critical "edit, test, debug" cycle.
> Developers will use IDEs, editors, compilers, and other tools that need
> different levels of parsing. For small projects, raw parsing speed is
> essential; for large software systems, scalability of parsing is also
> necessary.
>
> -- [Carbon's goal for fast and scalable development][fast-goal]

[fast-goal]:
  https://github.com/carbon-language/carbon-lang/blob/trunk/docs/project/goals.md#fast-and-scalable-development

{{% note %}}

{{% /note %}}

---

## Not just about compiling to a binary...

- Need fast _tooling_:
  - Formatting
  - Jump-to-definition
  - Refactoring tools and other IDE plugins
- Many of these need _interactive_ levels of speed
  - `distcc` and other distributed compute approaches don't apply

{{% note %}}

{{% /note %}}

---

## We set ourselves a challenge:

- Parse and lex at {{% fragment %}}**10 million lines of code /
  second**{{% /fragment %}}
- Semantic analysis at {{% fragment %}}**1 million lines of code /
  second**{{% /fragment %}}
- Lower to a binary at {{% fragment %}}**0.1 million lines of code /
  second**{{% /fragment %}}{{% fragment %}} Maybe...{{% /fragment %}}

{{% note %}}

{{% /note %}}

---

## Thinking about it the other way is eye opening:

- Average budget of **_100 ns_** per line to lex and parse
- Average budget of **_1 μs_** per line for semantic analysis
- Let's think about these in terms of our latency numbers...

{{% note %}}

{{% /note %}}

---

## Latency numbers table:

| Operation                          | Time in ns | Time in ms |
| ---------------------------------- | ---------- | ---------- |
| CPU cycle                          | 0.3 - 0.5  |            |
| L1 cache reference                 | 1          |            |
| Branch misprediction               | 3          |            |
| L2 cache reference                 | 4          |            |
| Mutex lock/unlock                  | 17         |            |
| Main memory reference              | 100        |            |
| SSD Random Read                    | 17,000     | 0.017      |
| Read 1 MB sequentially from memory | 38,000     | 0.038      |
| Read 1 MB sequentially from SSD    | 622,000    | 0.622      |

{{% note %}}

{{% /note %}}

---

## Mapping those onto our budgets

- About 200-300 cycles, maybe 500 instructions, per **_line_** lexed & parsed
- Only one main memory access per **_line_** lexed & parsed (on average)!!!
- Can't allocate memory per token... or line of tokens...
- So many approaches just stop being viable if you want to hit this
- Have to use every byte of every cache line accessed to have any hope

{{% note %}}

{{% /note %}}

---

# 😱😱😱

{{% note %}}

TODO: Maybe a goofy cat picture here instead of emojis?

{{% /note %}}

---

## Ok, so how are we going to do this?

{{% note %}}

{{% /note %}}
