+++
weight = 400
outputs = ["Reveal"]
+++

## Tradeoff

<!--

Token soup model: good for

- *Error recovery*
- *Permissiveness* and *compatibility*

Dependent parse tree model: good for

- *Semantic representation* of templates
- *Orthogonality*

Overlay model: good for

- *Small representation*
- *Fast instantiation*

-->

Clang dependent parse tree model:

- *Semantic representation* of templates
- *Orthogonality*

Carbon toolchain overlay model:

- *Smaller representation*<span class="fragment">: 1.2KiB -> 120B (~10x)</span>
- *Faster instantiation*<span class="fragment">: 43µs -> 4µs (~10x)</span>

<div class="fragment">

- Supports *lowering optimizations* (not implemented yet)

</div>

{{% note %}}

For a simple type trait:
about an order of magnitude faster and smaller than Clang

Overlay also has benefits for lowering

{{% /note %}}

---

{{< slide background-image="interstitial.jpg" background-opacity="0.5" >}}

<div class="right">

https://docs.carbon-lang.dev/#join-us

</div>

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

## Questions?

</div>

<div class="right">

<small>

Slides: https://chandlerc.blog/slides/2024-llvm-generic-implementation <br>
Image credit: https://unsplash.com/photos/a-blue-background-with-lines-and-dots-xuTJZ7uD7PI

</small>

</div>