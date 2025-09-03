+++
weight = 1
outputs = ["Reveal"]
+++

## What does "memory safety _everywhere_" mean?

{{% note %}}

{{% /note %}}

---

## Reminder of why emory safety is important

- Memory unsafety remains the dominant cause of security vulnerabilities
  - Over 65% of high / critical vulnerabilities (sources [1], [2], [3], [4],
    [5])
- Only durable solution found: memory safe programming languages
- Evidence clearly shows this works
  - https://security.googleblog.com/2024/09/eliminating-memory-safety-vulnerabilities-Android.html

[1]: https://www.chromium.org/Home/chromium-security/memory-safety
[2]:
  https://android-developers.googleblog.com/2020/02/detecting-memory-corruption-bugs-with-hwasan.html
[3]:
  https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit#gid=1190662839
[4]:
  https://msrc-blog.microsoft.com/2019/07/16/a-proactive-approach-to-more-secure-code/
[5]: https://langui.sh/2019/07/23/apple-memory-safety/

{{% note %}}

{{% /note %}}

---

### You probably know how to write memory safe software!

<ul>
<li class="fragment">Java / Kotlin</li>
<li class="fragment">JavaScript / TypeScript</li>
<li class="fragment">Python</li>
<li class="fragment">... and yes, Rust! <span class="fragment">🦀</span></li>
</ul>

{{% note %}}

{{% /note %}}

---

## The "_everywhere_" is the tricky part...

{{% note %}}

{{% /note %}}

---

## A _lot_ of software in the world

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col fragment" style="order: 1">

<img src="https://imgs.xkcd.com/comics/dependency.png" height="800px"/>

</div>
<div class="col" style="order: 2">

## &nbsp;

### All part of an _ecosystem_

## &nbsp;
## &nbsp;
## &nbsp;

### Each piece you move has to integrate with the rest {.fragment}

</div>
</div>

{{% note %}}

{{% /note %}}

---

## _Interop_ is key

{{% note %}}

{{% /note %}}

---

## _Interop_ spectrum

<div class="hana-grid">
  
<div class="left">
  
- `extern C`
- (c)bindgen
- `cxx` crate
- zngur
- ...

</div>
<div class="center">
  
- Crubit

</div>
<div class="right">
  
- ???

</div>
<div class="arrow">
  <img src="arrow.svg"/>
</div>
<div class="greenfield">Greenfield</div>
<div class="brownfield">Brownfield</div>

</div>

{{% note %}}

{{% /note %}}

---

<div class="hana-grid">
  
<div class="less-tightly fragment">
  
_Less_ tightly coupled to existing C++ ecosystem:

- Strong abstraction boundaries
- Modular architecture

</div>
<div class="more-tightly fragment">
  
_More_ tightly coupled to existing C++ ecosystem

- Large API surface
- API uses large language surface area

</div>
<div class="arrow">
  <img src="arrow.svg"/>
</div>
<div class="greenfield">Greenfield</div>
<div class="brownfield">Brownfield</div>


</div>

{{% note %}}

The spectrum here is really how tightly coupled code is to existing C++ software
and infrastructure. The more this is the case, the more difficult it is to start
cutting new code over to _any_ other language, including Rust.

TODO: figure out how to sequence display here

This is really what we're talking about when we use terms like "greenfield" and
"brownfield". We're discussing how tightly coupled some new code will be to the
existing C++ code and infrastructure.

Some interesting realizations -- brownfield only applies to _new code_ really.
Because if it isn't new code, its not even brownfield, its not development
activity at all. It's just extant, legacy code.

Also means that there isn't a really binary split between green- and brownfield.
It's a spectrum, and in my experience a very large and continuous spectrum.

{{% /note %}}

---

<div class="hana-grid">

<div class="crab fragment current-visible">🦀</div>
<div class="crab fragment current-visible">🦀</div>
<div class="crab fragment current-visible">🦀</div>
<div class="crab fragment current-visible">🦀</div>
<div class="crab fragment">🦀</div>
<div class="question fragment">But will it get here?</div>

<div class="arrow">
  <img src="arrow.svg"/>
</div>
<div class="greenfield">Greenfield</div>
<div class="brownfield">Brownfield</div>


</div>

{{% note %}}

Rust is starting from the greenfield side of this spectrum. Not 100%, there is
no 100%, but towards that side. It is a mature, production quality language that
exists.

And the interop efforts are shifting its applicability right so that we can use
it in ever less greenfield and more brownfield situations.

Already, Android and other OS and low-level systems code are essentially
completely covered and work great. Now we're pushing into larger and larger, and
over more interdependent and tightly coupled systems.

But will it ever reach the most extreme brownfield end of this spectrum?

{{% /note %}}

---

## _Everywhere_ requires a _maximalist_ approach

{{% note %}}

That would require covering a really dauntingly large design space. We could try
to it with a single language, but IMO, stretching a single language across such
a large space has a serious risk of it ending up poorly addressing many parts of
the space and being burdened with especially high complexity.

Think you can see this with C++ and C before we started really pushing towards
memory safety in low-level languages. C++ tried to cover everything in the
low-level domain, but struggled in a number of places where its complexity
wasn't the right tradeoff. And C remains used and even preferred in a number of
contexts as a consequence.

{{% /note %}}

---

## Ideally we'd add memory safety directly to C++ <span class="fragment">...</span> <span class="fragment">😢</span>

{{% note %}}

Unfortunately, the committee is not moving in this direction.

Need an alternative that is almost as brownfield optimized as adding memory
safety directly to C++ would be... This sounds familiar...

{{% /note %}}

---

{{< slide auto-animate="" >}}

<div class="col-container center">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>

---

{{< slide auto-animate="" >}}

<div class="col-container center semi-faded">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>
<div class="col-container center">

## JavaScript {class="col-4 right"}

## → {class="col center"}

## TypeScript {class="col-4 left"}

</div>

---

{{< slide auto-animate="" >}}

<div class="col-container center semi-faded">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## JavaScript {class="col-4 right"}

## → {class="col center"}

## TypeScript {class="col-4 left"}

</div>
<div class="col-container center">

## Objective-C {class="col-4 right"}

## → {class="col center"}

## Swift {class="col-4 left"}

</div>

---

{{< slide auto-animate="" >}}

<div class="col-container center semi-faded">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## JavaScript {class="col-4 right"}

## → {class="col center"}

## TypeScript {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## Objective-C {class="col-4 right"}

## → {class="col center"}

## Swift {class="col-4 left"}

</div>
<div class="col-container center">

## Java {class="col-4 right"}

## → {class="col center"}

## Kotlin {class="col-4 left"}

</div>

---

{{< slide auto-animate="" >}}

<div class="col-container center semi-faded">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## JavaScript {class="col-4 right"}

## → {class="col center"}

## TypeScript {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## Objective-C {class="col-4 right"}

## → {class="col center"}

## Swift {class="col-4 left"}

</div>
<div class="col-container center semi-faded">

## Java {class="col-4 right"}

## → {class="col center"}

## Kotlin {class="col-4 left"}

</div>
<div class="col-container center">

## C++ {class="col-4 right"}

## → {class="col center"}

## **_Carbon_** {class="col-4 left fragment"}

</div>

---

## Carbon

- An incremental path to evolve and migrate off C++
- And to add memory safety to existing software
- Prioritizing the _most_ brownfield codebases

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

## Greenfield

</div>
<div class="col">

</div>
<div class="col" style="text-align: right;">

## Brownfield

</div>
</div>

# ←────→ {.arrow}

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

### Rust 🦀 ⇒

</div>
<div class="col">

</div>
<div class="col fragment" style="text-align: right;">

### ⇐ Carbon

</div>
</div>

{{% note %}}

Essentially, Carbon approaches the entire problem from the opposite end of the
spectrum.

And a key thesis is that this spectrum is really too large for some users to
cover with a single language. By bringing two languages that have these very
different priorities and designs, we can better cover the entire space.

And to repeat, my goal is to get more new code to be memory safe. Happy to pay
the cost of multiple languages if it actually allows us to achieve that outcome.
Realistically, we already have a _bunch_ of languages in the world, and I think
by-and-large they serve their different purposes.

Now, given these different goals and the totally different direction from how
Rust and Carbon are evolving, it's not too surprising that they end up
diverging. That's what I want to spend the rest of today looking at...

{{% /note %}}

---

## Let's look at how they are diverging

{{% note %}}

How are they diverging?

_Why_ are they diverging in these ways?

And what is the _cost_?

{{% /note %}}

---
