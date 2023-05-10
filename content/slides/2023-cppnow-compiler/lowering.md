+++
weight = 8
outputs = ["Reveal"]
+++

# Data-oriented lowering!

{{% note %}}

{{% /note %}}

---

## Eh... not really...

{{% note %}}

{{% /note %}}

---

## Somewhat data-oriented lowering?

- Because of the semantics IR, some aspects of lowering will fall out:
  - Traversing the IR to emit LLVM IR will be fast and efficient
  - Other operations like high-level optimizations or constant evaluation similarly
- But LLVM itself is _not_ especially data-oriented in its design
- Currently no plan to try to change this, but interesting area of future work

{{% note %}}

{{% /note %}}

---

## Ultimately, limited by LLVM today

- LLVM heavily uses sparse, pointer-based data structures
- Tends to be very inefficient, often >50% cycles stalled on data
  - Despite heavily optimized data structures below the core IR

<div class="fragment">

Also, we have a long way to go before this can be our focus!

</div>
