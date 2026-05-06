+++
title = "Benchmarking and Optimizing the Carbon Compiler"
outputs = ["Reveal"]
date = "2026-05-08"

[reveal_hugo]
total_time = 3000
+++
<style>
.reveal h1.title {
    font-size: 2.6em;
}

.reveal h1.arrow {
    padding-top: 50px;
    padding-bottom: 50px;
    font: var(--r-code-font);
    font-size: 6.5em;
}

.reveal h1.arrow_long {
    padding-top: 50px;
    padding-bottom: 50px;
    font: var(--r-code-font);
    font-size: 1.25em;
}

.hana-grid {
display: grid;
height: 100vh;
width: 100vw;
grid-template-columns: repeat(6 1fr);
grid-template-rows: auto [arrow] 200px [field] max-content;
> * {
    align-self: center;
}

.left, .center, .right {
    grid-column-end: span 2;
    align-self: start;
}

.left {
    text-align: left;
}

.center {
    text-align: center;
}

.right {
    text-align: right;
}

.less-tightly, .more-tightly {
    text-align: left;
    grid-column-end: span 3;
}

.crab {
    font-size: 90px;
    grid-column: span 1;
    position: relative;
    top: -0.25em;
}
.question {
    grid-column: span 2;
    text-align: right;
    /*font-size: 64px;*/
    /* for some reason the questions is wider than 1fr */
}

.rust {
    align-items: center;
    grid-column: span 2;
}
.rust-with-arrow {
    text-align: left;
    grid-column: span 3;
}
.carbon-with-arrow {
    text-align: right;
    grid-column: span 3;
}

.arrow {
    grid-column: span 6;
    grid-row: "arrow";
    text-align: center;
    img {
    height: 150px;
    }
}

.greenfield, .brownfield {
    align-items: center;
    grid-row: "field";
}
.greenfield {
    grid-column-end: span 3;
    text-align: left;
}
.brownfield {
    grid-column-end: span 3;
    text-align: right;
}

</style>

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Benchmarking & Optimizing {.title}

# the Carbon Compiler

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### NDC Toronto 2026

</div></div>
<div class="right">

https://chandlerc.blog/slides/2026-ndc-toronto-carbon-benchmarking

</div>

{{% note %}}

One of the top goals of the Carbon Language project is to have an absurdly fast
compiler and toolchain. Much of this stems from leveraging the ideas of
data-oriented design to make the data structures of the compiler radically more
efficient on modern computers. However, this talk isn't about any of that.

Even with excellent data structures and design, you can't fully realize the peak
performance available from today's hardware without careful benchmarking and
optimization. This talk will walk through the complex challenges of accurately
and effectively benchmarking the Carbon compiler. This will include concrete
examples of problems, the solutions, and references to the open source code
where the audience can find, learn from, and borrow from these solutions.

The talk will also dive into some of the specific optimization challenges and
techniques applied based on these benchmarks. It will show how to implement
these optimizations in a clean and maintainable way. It will also provide
references to the open source code so the audience can refer back to how these
optimizations are achieved.

Together, these will help everyone in the audience be better able to achieve
their performance goals for low-level software: first, by measuring performance
in ways that are both effective and matter, and second, by learning how to apply
advanced optimization techniques to solve complex performance problems.

{{% /note %}}
