+++
title = "Carbon: from C++ to Memory Safety"
outputs = ["Reveal"]
date = "2025-10-18"

[reveal_hugo]
total_time = 1500
+++
<style>
.reveal h1.title {
    font-size: 2.8em;
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
}

</style>

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Carbon: from C++ to Memory Safety {.title}

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### REBASE 2025

</div></div>
<div class="right">

https://chandlerc.blog/slides/2025-rebase-carbon

</div>

{{% note %}}


{{% /note %}}
