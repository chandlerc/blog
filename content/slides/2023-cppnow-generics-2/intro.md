+++
weight = 1
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# The _**how**_ of checked generics

{{% note %}}

In Part 1, Josh and Chandler introduced checked generics, why they're great and
why we want them.
In this part, Josh and Richard are going to dig into some interesting
non-trivial details. Subtitle of part 2 is "the how of checked generics", but
unofficially it's "checked generics are hard".

{{% /note %}}

<!--

## Many open language design questions

- Unsolved problems for checked generics in C++-like languages
- Languages like: C++, Rust, Swift, Carbon, Cpp2, Circle, ...
- No consensus on a solution or there are significant disadvantages to existing
  solutions

-->

---

## There are many hard problems

This talk is about 4:

- Type equality
- Termination
- Coherence
- Specialization

{{% note %}}

Going to focus on four hard problems. We'll explain what each of these means,
why it's hard, how it's handled by the generics systems in Swift and Rust, and
how we approached it in Carbon.

{{% /note %}}

---

## Learning from the experience of others

- Have benefited a lot from open language development process
   - posts from the designers of these languages
   - public discussion of language evolution
- This talk is going to try and pay that forward
   - new solutions to these problems, with better properties

{{% note %}}

Carbon's generics design benefitted a lot from the open design discussions on
these topics in other languages -- in github, in design documentation, and in
blog posts -- and are really grateful for all that information being made
available. We hope that this talk contains ideas that future language designers
can benefit from too. We think that Carbon has novel solutions to these
problems that really improve on the prior approaches.

{{% /note %}}
