+++
weight = 100
outputs = ["Reveal"]
+++

{{< slide background-image="interstitial.jpg" >}}

# Conclusion

---

## Talked about four problems

Carbon has new solutions to:

- Type equality
- Termination rules
- Coherence
- Specialization

Plus non-generics parts of the language that supports checked generics.

{{% note %}}

- We think these solutions are really good
- The solutions support efficient compilation, clearer error messages, and
  programming in the large. By which I mean, large teams working on large
  projects over long time periods.

{{% /note %}}

---

## Other problems?

---
{{< slide auto-animate="" >}}

## Checked generics are an active area of research

There are a lot more problems than those covered in this talk

- Checked variadic generics
- Generic associated types
- Interaction between checked and template generics
- Interaction between generics and implicit conversions

{{% note %}}

- A sampling of examples: some we in Carbon have made good progress on, some
  Rust or Swift are actively working on
- `<click>` For example, Swift and Carbon have proposals for checked variadic generics.
  Carbon's was sent to RFC in the last week.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Checked generics are an active area of research

There are a lot more problems than those covered in this talk

- Checked variadic generics

<ul style="list-style: none;">
<li>

  - Swift
    - [SE-0393: Value and Type Parameter Packs](https://github.com/apple/swift-evolution/blob/main/proposals/0393-parameter-packs.md)
    - [SE-0398: Allow Generic Types to Abstract Over Packs](https://github.com/apple/swift-evolution/blob/main/proposals/0398-variadic-types.md)
  - Carbon [Proposal #2240: Variadics](https://github.com/carbon-language/carbon-lang/pull/2240)

</li></ul>

- Generic associated types
- Interaction between checked and template generics
- Interaction between generics and implicit conversions

{{% note %}}

- For example, Swift and Carbon have proposals for checked variadic generics.
  Carbon's was sent to RFC in the last week.

{{% /note %}}

---

## Promise to keep working on this

- Carbon is continuing to work on finding good solutions to issues that arise
  with checked generics
- We are working in the public, and are happy to share the results of our
  research

---

{{< slide background-image="interstitial.jpg" >}}

# Questions?

---

{{< slide background-image="interstitial.jpg" >}}

# Thank you!

<!-- TODO: make a good TY slide -->

---

## Resources and more information:

- This talk: https://chandlerc.blog/slides/2023-cppnow-generics-2
- https://github.com/carbon-language/carbon-lang#getting-started
- Carbon Generics design overview:
  - https://github.com/carbon-language/carbon-lang/blob/trunk/docs/design/generics/overview.md
- [Proposal #920: Generic parameterized impls](https://github.com/carbon-language/carbon-lang/pull/920)
  - [Carbon impl lookup resolution and specialization design](https://github.com/carbon-language/carbon-lang/blob/trunk/docs/design/generics/details.md#lookup-resolution-and-specialization)
- [Proposal #2173: Associated constant assignment versus equality](https://github.com/carbon-language/carbon-lang/pull/2173)
- [Proposal #2687: Termination algorithm for impl selection](https://github.com/carbon-language/carbon-lang/pull/2687)
- ["Generics and templates" channel](https://discord.gg/8K7gkQDy) of our [Discord](https://discord.gg/NECBAaZ4) server
