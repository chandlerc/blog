+++
title = "Generic implementation strategies in Carbon and Clang"
outputs = ["Reveal"]
date = "2024-10-24"
+++

<style>
em { color: #ff8; }
</style>

{{< slide background-opacity="0.5" background-size="contain" background-image="https://assets.swoogo.com/uploads/medium/4089750-6670c7c7b0a41.png" >}}

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Generic implementation strategies in Carbon and Clang

</div>
<div class="col-container"><div class="col-2">

### Richard Smith

#### @zygoloid

Carbon / Google

</div><div class="col right">

### LLVM Developers' Meeting 2024

</div></div>

{{% note %}}

Going to talk about how C++ templates are implemented in Clang

Some benefits and limitations of that approach

And a new approach we're using in the Carbon toolchain

{{% /note %}}

<!--
<div class="right">

https://zy.golo.id/slides/2024-llvm-generic-implementation

</div>
-->