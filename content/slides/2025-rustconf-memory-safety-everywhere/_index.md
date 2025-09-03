+++
title = "Memory safety everywhere with both Carbon and Rust"
outputs = ["Reveal"]
date = "2025-09-03"

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
.left, .center, .right {
    grid-column-end: span 2;
    text-align: center;
    align-self: start;
}

.less-tightly, .more-tightly {
    grid-column: span 3;
    text-align: center;
}

.crab {
    font-size: 90px;
    grid-column: span 1;
}
.question {
    grid-column: span 1;
    text-align: right;
    font-size: 64px;
    /* for some reason the questions is wider than 1fr */
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
    font-weight: 600;
    font-size: 64px;
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

# Memory safety everywhere<br/>with both Carbon and Rust {.title}

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### RustConf 2025

</div></div>
<div class="right">

https://chandlerc.blog/slides/2025-rustconf-memory-safety-everywhere

</div>

{{% note %}}


{{% /note %}}
