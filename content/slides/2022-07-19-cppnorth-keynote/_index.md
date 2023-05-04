+++
title = "C++: What Comes Next? (2022-07-19 CppNorth Keynote)"
outputs = ["Reveal"]
+++

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# ⚗️🧪 Science experiment time! 🧪⚗️

</div>
<div class="col-container"><div class="col-4">

### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

### CppNorth 2022

</div>

{{% note %}}

-   Introduce myself, make some jokes about being excited but maybe a bit rusty
    after two years of pandemic without presenting at a conference.
    -   But follow-up with how exciting it is to be back with a live audience.
-   Mention that we'll have an extended Q&A.
-   Ask to try and hold questions until then.
-   Talk about being really excited to get a chance to speak here, important to
    give a huge thanks to the CppNorth organizers for helping make this happen.
    Want to acknowledge the mystery / etc., but downplay it as a necessity
    mentioning that wasn't sure whether everything would be ready to share today
    until pretty late.

-   So what's this talk _actually_ about? Well, let's get to the real title:

{{% /note %}}

---

<div class="r-stretch" style="display: flex; align-items: center">

# C++: What Comes Next?

</div>
<div class="col-container"><div class="col-4">

### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

### CppNorth 2022

</div>

{{% note %}}

-   Say "C++" first!

-   C++
-   What comes next?

{{% /note %}}

---

# I don't know.

{{% note %}}

-   Completely serious. I don't know the answer to this question yet.

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

## **_???_** {class="col-4 left fragment highlight"}

</div>

{{% note %}}

-   Put differently, I feel like there is a blank here, and I'm not yet sure
    what fits in that blank.

-   This is actually what I want to figure out; what I want _us_ to figure out.
-   And I don't think we're at the end of that journey. Or even close.

-   So where do we _begin_ the journey?

{{% /note %}}

---
{{< slide auto-animate="" >}}

# What are our goals for C++?

{{% note %}}

-   We of course begin with our _goals_ for C++.

{{% /note %}}

---
{{< slide auto-animate="" >}}

# What are our goals for C++?

## What problem are we trying to solve?

{{% note %}}

-   The way I like to frame this is about what problems we're trying to solve.

{{% /note %}}

---

## What kind of "saw" is this language?

{{< youtube LJh5QCV4wDg >}}

{{% note %}}

-   Titus and I dug into this question _in depth_ a few years ago.
-   Just to quickly recap my somewhat opinionated stance...

{{% /note %}}

---

## Our goals for C++

Support:

-   Performance-critical software
-   Software and language evolution
-   Code that is easy to read, understand, and write
-   Practical safety and testing mechanisms
-   Fast and scalable development
-   Modern OS platforms, hardware architectures, and environments

https://wg21.link/p2137r0

{{% note %}}

-   Performance, performance, performance, performance...
-   We need to support large scale software systems that evolve over time, and
    evolving the language they use over time as well.
-   Of course, we want code that's easy to read, understand, and write.
-   We want practical safety and testing tools to ensure the correctness of the
    software.
-   We want development to be fast and to scale to huge codebases and teams.
-   And we have to support all the modern OSes, hardware, and environments. Yep,
    that includes GPUs these days.

-   This is what we published years ago as part of WG21 as well.
-   Lots of details there, really digging into what we mean.

{{% /note %}}

---

# C++ falls short of these goals... <span class="fragment">But why?</span>

{{% note %}}

-   Despite our efforts, we see real gaps across these goals where our
    developers would significantly benefit from improvements to C++.
-   Lots of you probably have really good ideas for how C++ could do better
    against these goals.

-   The tricky thing is digging into the root cause -- _why_ is C++ having so
    much trouble?

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Accumulating **_decades_** of technical debt

{{% note %}}

-   This didn't happen for bad reasons.
-   Initially, an essential part of C++'s success was building directly on top
    of the existing C ecosystem.
    -   This means the C preprocessor, textual inclusion of C headers, etc.
    -   Which _also_ meant inheriting a lot of C's technical debt.
    -   An excellent reason, but a high cost.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Accumulating **_decades_** of technical debt

## Prioritizing backwards compatibility

{{% note %}}

-   And this means that every time we make a mistake, we can't fix it.
    -   Even when it would still be easy (a new feature) or we have tools that
        can manage the cost for developers.
-   We even distort new features to work around any existing legacy.

{{% /note %}}

---

## `co_await`, `co_yield`, `co_return`, ...

{{% note %}}

-   And that's basically how we end up here.
-   An ever growing set of "acceptably" small increments of technical debt to
    avoid a breaking change.

{{% /note %}}

---

# Backwards compatibility<br/>also prevents _fixing_ technical debt

{{% note %}}

-   Plenty of improvements to C++ can still be made while avoiding any breaking
    changes.
-   But the backwards compatibility priority makes it especially difficult to
    reduce technical debt
    -   Hyrum's law: there is almost always code depending on the things leading
        to the tech debt
    -   It's often why we ended up taking on the debt in the first place!

{{% /note %}}

---
{{< slide visibility="hidden" >}}

> Why the tab in column 1? Yacc was new, Lex was brand new. I hadn't tried
> either, so I figured this would be a good excuse to learn. After getting
> myself snarled up with my first stab at Lex, I just did something simple with
> the pattern newline-tab. It worked, it stayed. And then a few weeks later I
> had a user population of about a dozen, most of them friends, and I didn't
> want to screw up my embedded base. The rest, sadly, is history.
>
> -- [Stuart Feldman](http://catb.org/~esr/writings/taoup/html/ch15s04.html)

{{% note %}}

-   One of the best known stories about a concern around backwards compatibility
    leading to technical debt is the classic case of the strange tab character
    handling of Make.
-   C++ is of course in a very different position, both with a _massive_ user
    base rather than a dozen friends, and with a more dramatic impact on
    developers' productivity.
-   This is a tradeoff. There isn't an unambiguously single good rule here.
-   For C++, I think there are clear and compelling ways to both manage the cost
    of making these changes and benefits that will outweigh those costs.

{{% /note %}}

---
{{< slide visibility="hidden" >}}

## Case study: ABI-stability vs. data structure performance

-   Carefully analyzed, concrete examples of real and costly debt
-   Presented to WG21 in [P1863](https://wg21.link/p1863) and
    [P2028](https://wg21.link/p2028).
-   Despite the cost, C++ will carry this legacy and performance overhead.

{{% note %}}

-   Titus worked to carefully present a clear and concrete case study of the
    tradeoffs the committee faces here.
-   Was able to get it to be clearly understood with the stakes well
    articulated.
-   Ultimately, C++ is continuing without a breaking change and missing out on
    performance opportunities.
-   C++ has chosen to _continue_ to prioritize backwards compatibility.
-   And there's nothing intrinsically wrong with that.
-   But it is fundamentally incompatible with deeply addressing and
    significantly reducing C++'s technical debt.

{{% /note %}}

---

# C++ evolution process makes<br/>improvements even more difficult

{{% note %}}

-   The prioritization of backwards compatibility is only part of the difficulty
    with improving C++

-   C++ is evolved as part of the standards committee.
-   This uses a multiyear waterfall committee process.
-   Access to the committee is restricted and expensive.
-   Attendance is necessary to have a voice.
-   Decisions are made by a live vote of those who happen to be in the room.

-   Many aspects of the process are largely fixed and coming from ISO far
    outside of C++ or even programming languages.
-   Those aspects tend to be oriented around ensuring that nations and companies
    are represented in discussions and decisions.
-   The priorities that informed generic ISO process are very different from a
    prioritizing an inclusive, welcoming, and effective team and community to do
    complex software design.
-   Basically, very different from what you would get prioritizing active
    contributions to a programming language and its design.
-   And the results reflect the priorities in the design. While the
    representation benefits from the structure, the community and design
    struggle.

{{% /note %}}

---

# What options are there?

{{% note %}}

-   So where do we go from here?
-   What options do we have if improving C++ is so difficult?
-   An existing language would be ideal
-   Languages are expensive, and especially factoring in the entire ecosystem

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Garbage collected languages are great...

{{% note %}}

-   Garbage collected languages are a great option.
-   Simplified programming models, reliable, safe, easy to use.
-   ... but...

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Garbage collected languages are great...

## But have performance gaps

{{% note %}}

-   They still have some form of performance gap. You have to pay for the
    simplicity and safety.
-   Where you can afford it, this gives you great options. But many users can't.
-   Even Swift's reference counting has similar challenges, at least in its
    current form. Some interesting work going on to explore ways to improve this
    though.

{{% /note %}}

---

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

## **_Rust?_** {class="col-4 left"}

</div>

{{% note %}}

-   What about Rust?
-   It doesn't really fit here, and no this isn't really a Rust talk.
-   That's not because of anything to do with Rust...

{{% /note %}}

---
{{< slide auto-animate="" >}}

## If Rust works for you today, you should use it.

{{% note %}}

-   It's a really exciting option
-   Great language, with an amazing community
-   Lots of great investment going into Rust, enabling it in more places and on
    more platforms, and we love to see that.
-   Where Rust is working well, don't get distracted by Carbon.
-   The reason Rust doesn't easily fit that diagram doesn't fit isn't really
    anything about Rust...

{{% /note %}}

---
{{< slide auto-animate="" >}}

## If Rust works for you today, you should use it.

## But moving a C++ ecosystem to Rust is _hard_.

{{% note %}}

-   The challenge is C++, and the fact that we have a _lot_ of C++ today.. This
    is a huge, and interdependent ecosystem.
-   All that C++ code is designed in ways that won't make sense in Rust -- for
    example, moving completely away from inheritance. It can require redesigning
    things from scratch.
-   Even call unsafe C++ code from safe Rust is really complicated.
-   Some of my colleagues are even working on Clang extensions right now, trying
    to address some of this, but it is early days and still very risky.

{{% /note %}}

---

# What approaches have worked in the past?

{{% note %}}

-   If we look for examples in the past of how dramatic changes have been
    introduced in a programming language without leaving the existing ecosystem
    behind, we find some interesting things...

{{% /note %}}

---
{{< slide auto-animate="" >}}

<div class="col-container center">

## C {class="col-4 right"}

## → {class="col center"}

## C++ {class="col-4 left"}

</div>

{{% note %}}

-   With C++ itself...

{{% /note %}}

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

{{% note %}}

-   With C++ itself... and later with TypeScript we can see the initial
    approaches. These languages are _supersets_ of the existing ecosystem in
    order to build on top of it.

{{% /note %}}

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

{{% note %}}

-   With Swift, there is a more advanced change -- it is a radical new syntax
    and doesn't fully incorporate the prior language.
    -   Provides strong interop, and seamless moving into Swift

{{% /note %}}

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

{{% note %}}

-   With C++ itself, and later with TypeScript we can see the initial
    approaches. These languages are _supersets_ of the existing ecosystem in
    order to build on top of it.
-   With Swift, there is a more advanced change -- it is a radical new syntax
    and doesn't fully incorporate the prior language.
    -   Provides strong interop, and seamless moving into Swift
-   But Kotlin is really my favorite example here.
    -   Totally new syntax / language / etc
    -   But seamless _bi-directional_ interop
    -   Java can call Kotlin that calls Java with reasonable ergonomics across
        each edge and no performance overhead
    -   Extremely compelling adoption path, even migration tooling...

{{% /note %}}

---

# Each of these was<br/>_designed_ for the purpose...

{{% note %}}

-   In each case here, the language was specifically designed around the needs
    of building on top of the existing language's ecosystem
-   It wasn't retrofitted, it was a day-one constraint, and in many cases had
    dramatic effects on the overall language design.

{{% /note %}}

---

# Each of these is<br/>a _successor language!_

{{% note %}}

-   I call these _successor languages_
-   And in each case, this is essential to the success of the language.

{{% /note %}}

---

## Successor languages

-   Build on an _existing_ ecosystem, without bootstrapping a new one
-   Provide bi-directional interoperability
-   Optimize the learning curve and adoption path
-   Ideally have tool-assisted migration support

{{% note %}}

-   This is a really compelling strategy, but what about C++?

{{% /note %}}

---

## Related: Herb Sutter's Bridge to NewThingia

{{< youtube BF3qw1ObUyo >}}

{{% note %}}

-   All of this may sound familiar; it isn't new really.
-   Recently, Herb talked about a lot of these concepts pretty clearly.
-   One interested difference in my opinion is the tradeoff between superset
    successors vs. interop-based successors.
    -   With a superset approach, "interop" is basically non-existent, and
        mixing languages can truly approach _perfect_. C++ and TS both follow
        this path.
    -   With an explicit interop approach like Swift and especially Kotlin uses,
        you may not get _quite_ as close to the seamlessness, but you can make
        more dramatic changes, especially in the tech debt reduction space.

{{% /note %}}

---

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

## **_???_** {class="col-4 left"}

</div>

{{% note %}}

-   Well, we don't really have a successor language for C++ today.
-   In a real sense, there isn't anything that fills this role
-   And it seems like a really exciting and different direction from the others
    available.

A group of us have been exploring what a C++ successor language would look like,
and starting to build something to fill this gap.

{{% /note %}}

---

# Carbon Language

# An experimental successor to C++

{{% note %}}

We call it Carbon.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Carbon goals as a _successor language_

-   Performance-critical software
-   Software and language evolution
-   Code that is easy to read, understand, and write
-   Practical safety and testing mechanisms
-   Fast and scalable development
-   Modern OS platforms, hardware architectures, and environments

{{% note %}}

-   Carbon's goals as a successor language follow from our goals for C++.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Carbon goals as a _successor language_

-   Performance-critical software
-   Software and
    <span class="fragment highlight" data-fragment-index="3">language
    evolution</span>
-   Code that is easy to read, understand, and write
-   Practical safety and testing mechanisms
-   Fast and scalable development
-   Modern OS platforms, hardware architectures, and environments
-   <span class="fragment highlight" data-fragment-index="1">_Interoperability</span>
    with and
    <span class="fragment highlight" data-fragment-index="2">migration</span>
    from existing C++ code_

{{% note %}}

-   But now we add the key goal of being interoperable and migratable from C++.

-   Carbon directly addresses the challenges we face with Carbon by combining
    this interop and migration focused successor strategy with an explicit goal
    of language evolution rather than backwards compatibility.

{{% /note %}}

---

# <span class="highlight">Interoperability</span>: don't inherit all of the C++ tech-debt

{{% note %}}

-   By basing our successor design around interoperability rather being a
    superset and directly incorporating existing C++, we don't inherit all of
    the C++ tech debt directly into Carbon.
-   Still have access to and integrate with the ecosystem.

{{% /note %}}

---

# <span class="highlight">Migration</span>: can provide immediate, dramatic improvements

{{% note %}}

-   We can also leverage the explicit migration step to clean up C++ tech debt
    in code prior to it becoming Carbon code.
-   Resolve all of the parsing challenges and introduce clean syntax
-   Lift your pointers into a type system that makes nullability explicit
-   Remove surprising integer promotions and add casts where actually necessary.
-   etc.

{{% /note %}}

---

# <span class="highlight">Language evolution</span>: tool-based upgrades as Carbon improves

{{% note %}}

-   The language can continue to evolve and change over time, paying down any
    new tech debt that emerges even it requires breaking changes.
-   Fundamentally, by prioritizing active but low-cost and scalable upgrades,
    Carbon's priorities aren't in tension with continued improvements and
    reduction of any added tech debt.
-   Results in a very different approach compared to prioritizing backwards
    compatibility.

{{% /note %}}

---

# Carbon - the language

{{% note %}}

-   Next up, I'd like to introduce you to some small pieces of the language to
    you, but these aren't random parts of the language. Each one of these is an
    example that helps show how we can make substantial improvements to C++
    because of this successor strategy around interop, migration, and language
    evolution.
-   Also, this isn't a complete introduction by any means. I'm skipping over
    lots of the design and just focused on interesting and fairly simple
    examples that show places where the successor strategy and letting go
    backwards compatibility is really empowering improvements in the language.
    -   I'm skipping over even more that we haven't even thought about yet!
-   So remember...
    -   We're just getting started in some ways and are still in the very early
        days
    -   While we have a lot of interesting pieces, there is still a lot left to
        do before Carbon's design is even "complete-ish"
    -   And even then, nothing is set in stone. Carbon is designed to evolve!

{{% /note %}}

---

## Introducer keywords and a simple grammar.

{{% note %}}

-   Any changes to the syntax like this are obviously breaking changes.
-   But easy for Carbon: can perfectly handle these with tools

{{% /note %}}

---

```carbon [11,13]
// This code is in the ``Geometry`` package (and root namespace).
package Geometry api;

// It imports the default library of the ``Math`` package.
import Math;

class Circle {
  var r: f32;
}

`fn` ScaleAreaAndAppend(circle: Circle, log2_scale: i32,
                      results: Vector(f32)*) {
  `var` `area``:` `f32` = Math.Pi * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results->append(area);
}
```

{{% note %}}

-   Use `fn` for functions
-   `var` for local variables, and so on.
-   Also use `name: type` which because it has a colon is much easier to parse.
-   Simpler parsing helps enable more tooling, make more tools more accurate,
    especially thing like syntax highlighting and IDEs.
-   Avoids confusing error messages, like "the most vexing parse" that doesn't
    exist in Carbon.

{{% /note %}}

---

## Function input parameters are readonly values.

{{% note %}}

-   C++ const-reference parameters are good for function inputs, except when
    they would fit into a register which is blocked.
-   Fixing it would be a disruptive breaking change.
-   Forces manually choosing one or the other, either way can be the wrong
    choice for generic code.

{{% /note %}}

---

```carbon [11]
// This code is in the ``Geometry`` package (and root namespace).
package Geometry api;

// It imports the default library of the ``Math`` package.
import Math;

class Circle {
  var r: f32;
}

fn ScaleAreaAndAppend(`circle: Circle`, `log2_scale: i32`,
                      results: Vector(f32)*) {
  var area: f32 = Math.Pi * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results->append(area);
}
```

{{% note %}}

-   Single, simple solution in Carbon. These are readonly values. A bit like
    "R-values" in C++, but baked into the language.
-   Good default, so no need to say anything in function parameter lists and we
    work to make syntax with them convenient.
-   Restrictions on use, more than `const &`, but very optimizable and work for
    most function inputs.
-   Can even have these for locals with `let`

{{% /note %}}

---

## Pointers provide indirect access & mutation.

{{% note %}}

-   Reduce complexity by avoiding complex array of references in the type system

{{% /note %}}

---

```carbon [12,21-22]
// This code is in the ``Geometry`` package (and root namespace).
package Geometry api;

// It imports the default library of the ``Math`` package.
import Math;

class Circle {
  var r: f32;
}

fn ScaleAreaAndAppend(circle: Circle, log2_scale: i32,
                      `results`: Vector(f32)`*`) {
  var area: f32 = Math.Pi * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results`->`append(area);
}
```

{{% note %}}

-   References specifically dealt w/ tech debt of matching C operators, Carbon
    doesn't have this constraint
-   Using pointers allows reliably accessing the pointer separately from the
    pointee
-   Non-null and non-indexable to avoid pervasive bug patterns. Null-ness in the
    typesystem, and types that can carry a bound when indexing.
-   Add ergonomic tools where needed due to using pointers

{{% /note %}}

---

## Use expressions to name types.

{{% note %}}

-   Particularly with generic code and metaprogramming, both types and other
    kinds of expressions need to not have conflicting or divergent grammars
-   With Carbon, we can make the backwards incompatible changes to converge them
    to the _same_ grammar
-   Bonus: no extra balanced delimiters and complex lexing or parsing rules

{{% /note %}}

---

```carbon [11-12]
// This code is in the ``Geometry`` package (and root namespace).
package Geometry api;

// It imports the default library of the ``Math`` package.
import Math;

class Circle {
  var r: f32;
}

fn ScaleAreaAndAppend(circle: `Circle`, log2_scale: `i32`,
                      results: `Vector(f32)`*) {
  var area: f32 = Math.Pi * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results->append(area);
}
```

{{% note %}}

-   Have type literal syntax just like string literal syntax
-   Parameterized types like a container use function call syntax

{{% /note %}}

---

## The package is the root namespace.

{{% note %}}

-   No _global_ top level namespace.
-   Each top level namespace is local to a package and named by the package
    name.

{{% /note %}}

---

```carbon [1-2]
// This code is in the ``Geometry`` package (and root namespace).
package `Geometry` api;

// It imports the default library of the ``Math`` package.
import Math;

class Circle {
  var r: f32;
}

fn ScaleAreaAndAppend(circle: Circle, log2_scale: i32,
                      results: Vector(f32)*) {
  var area: f32 = Math.Pi * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results->append(area);
}
```

{{% note %}}

-   Every file has to declare its package at the top.
-   This package is `Geometry`.
-   The file also states it declares an _API_ as opposed to being an
    implementation-only file. So you _can_ separate implementation details to a
    separate file but you don't have to.
-   This is the same kind of major upgrade provided by C++ modules.
-   Carbon is specifically planning for the migration step needed to get here
    though.

{{% /note %}}

---

## Import APIs through their package name.

{{% note %}}

-   We of course don't textually include things, we have a high level semantic
    import.
-   And when from another package, we import that package name, which gives us a
    clean handle into that package's namespace.

{{% /note %}}

---

```carbon [4-5,13]
// This code is in the ``Geometry`` package (and root namespace).
package Geometry api;

// It imports the default library of the ``Math`` package.
`import Math`;

class Circle {
  var r: f32;
}

fn ScaleAreaAndAppend(circle: Circle, log2_scale: i32,
                      results: Vector(f32)*) {
  var area: f32 = `Math.Pi` * c.r * c.r;

  // Compute the scale.
  let scale: i32 = 1 << log2_scale;

  // Apply the scale.
  area *= scale;

  // Append to in the provided container.
  results->append(area);
}
```

{{% note %}}

-   So here we import the default library API for the `Math` package.
-   And this just makes the name we listed visible: `Math`. Everything else is
    below that so we don't get surprising name collisions.

{{% /note %}}

---

## Members are public unless declared private.

{{% note %}}

-   Rather than a region-based access, we mark each member immediately.
-   Applies to all members of a class the same way.
-   However, we also make the default public.

{{% /note %}}

---

```carbon[2,4,7,10]
class NewsArticle {
  // All members (even variables) are default public.
  // A non-method member function -- like a static member function in C++.
  fn Make(headline: String, body_html: String) -> NewsArticle;

  // A readonly method on the object.
  fn AsHtml[me: Self]() -> String;

  // A mutating member with an inline method definition.
  fn Publish[addr me: Self*]() { me->published = DateTime.Now(); }

  // Members can be declared private, and fields use ``var`` to introduce them.
  private var headline: String;
  private var body_html: String;
  private var published: Optional(DateTime);
}

fn MakePublishAndPrint(headline: String, body_html: String) {
  var article: auto = NewsArticle.Make(headline, body_html);

  article.Publish();

  Print(article.AsHtml());
}
```

{{% note %}}

-   So we have three public members here, all functions.

{{% /note %}}

---

```carbon[12-15]
class NewsArticle {
  // All members (even variables) are default public.
  // A non-method member function -- like a static member function in C++.
  fn Make(headline: String, body_html: String) -> NewsArticle;

  // A readonly method on the object.
  fn AsHtml[me: Self]() -> String;

  // A mutating member with an inline method definition.
  fn Publish[addr me: Self*]() { me->published = DateTime.Now(); }

  // Members can be declared private, and fields use ``var`` to introduce them.
  `private` var headline: String;
  private var body_html: String;
  private var published: Optional(DateTime);
}

fn MakePublishAndPrint(headline: String, body_html: String) {
  var article: auto = NewsArticle.Make(headline, body_html);

  article.Publish();

  Print(article.AsHtml());
}
```

{{% note %}}

-   And three private variables.
-   The default here was a bit counter intuitive at first, but the public API is
    _read_ much more often than the private implementation details. Removing
    syntax clutter there makes APIs more readable. Credit to Kotlin here.
-   We also always use `class` with these rules. One consistent way to do
    things.
-   Obviously, this is a huge breaking change, but its really simple to achieve,
    explain, and we can migrate code perfectly here, so its a great example of
    improving readability with a successor language approach.

{{% /note %}}

---

## Explicit object parameter declares a method.

{{% note %}}

-   We mark functions as being methods (as opposed to non-method member
    functions or static member-functions in C++) by having an explicit object
    parameter.
-   Both gives a functional marker (rather than a keyword with little
    connection) and makes a useful feature recently added to C++ a consistent
    part of the language.
    -   Lots of motivation for this discussed when adding it to C++.
    -   Because of the successor language approach, we can fully switch to this
        as the canonical form.

{{% /note %}}

---

```carbon[3-4]
class NewsArticle {
  // All members (even variables) are default public.
  // A non-method member function -- like a static member function in C++.
  fn Make(headline: String, body_html: String) -> NewsArticle;

  // A readonly method on the object.
  fn AsHtml[me: Self]() -> String;

  // A mutating member with an inline method definition.
  fn Publish[addr me: Self*]() { me->published = DateTime.Now(); }

  // Members can be declared private, and fields use ``var`` to introduce them.
  private var headline: String;
  private var body_html: String;
  private var published: Optional(DateTime);
}

fn MakePublishAndPrint(headline: String, body_html: String) {
  var article: auto = NewsArticle.Make(headline, body_html);

  article.Publish();

  Print(article.AsHtml());
}
```

{{% note %}}

-   A non-method member function, or a static member function in C++, just looks
    like a normal function but nested.

{{% /note %}}

---

```carbon[6-7,23]
class NewsArticle {
  // All members (even variables) are default public.
  // A non-method member function -- like a static member function in C++.
  fn Make(headline: String, body_html: String) -> NewsArticle;

  // A readonly method on the object.
  fn AsHtml[`me`: `Self`]() -> String;

  // A mutating member with an inline method definition.
  fn Publish[addr me: Self*]() { me->published = DateTime.Now(); }

  // Members can be declared private, and fields use ``var`` to introduce them.
  private var headline: String;
  private var body_html: String;
  private var published: Optional(DateTime);
}

fn MakePublishAndPrint(headline: String, body_html: String) {
  var article: auto = NewsArticle.Make(headline, body_html);

  article.Publish();

  Print(`article.AsHtml()`);
}
```

{{% note %}}

-   It's when we add a `me` parameter in the implicit `[...]` brackets that this
    becomes a method.
-   Can also see the object parameter _type_ being useful here and combining
    with another feature -- we support _readonly_ object parameters, and their a
    reasonable default and can use more efficient calling conventions.

{{% /note %}}

---

```carbon[9-10,21]
class NewsArticle {
  // All members (even variables) are default public.
  // A non-method member function -- like a static member function in C++.
  fn Make(headline: String, body_html: String) -> NewsArticle;

  // A readonly method on the object.
  fn AsHtml[me: Self]() -> String;

  // A mutating member with an inline method definition.
  fn Publish[`<2>addr` me: `<1>Self*`]() { me->published = DateTime.Now(); }

  // Members can be declared private, and fields use ``var`` to introduce them.
  private var headline: String;
  private var body_html: String;
  private var published: Optional(DateTime);
}

fn MakePublishAndPrint(headline: String, body_html: String) {
  var article: auto = NewsArticle.Make(headline, body_html);

  `article.Publish()`;

  Print(article.AsHtml());
}
```

{{% note %}}

-   And when we want mutation, we use a pointer to make that explicit. But here
    is a place where we need some ergonomic help with the `addr` keyword. This
    automatically takes the address of the object itself allowing simple method
    call syntax in both the readonly case and the mutating case. The mutating
    one just takes the address of `article`.

{{% /note %}}

---

## Single inheritance; classes are final by default.

{{% note %}}

-   We're explicitly narrowing inheritance to a simple, very principled model of
    _single_ inheritance.
-   Experience with inheritance makes final a much better default so that type
    authors know they are allowing derivation.

{{% /note %}}

---

```carbon [1-2,8-9,21-22]
// Abstract base class cannot be instantiated, may have abstract methods.
`abstract class` UIWidget {
  // Abstract methods have no implementation.
  abstract fn Draw[me: Self](s: Screen);
  abstract fn Click[addr me: Self*](x: i32, y: i32);
}

// Final is the default, ``base class`` allows extension and instantiation.
`base class` Button extends UIWidget {
  // Implementing the abstract methods from the base class.
  impl fn Draw[me: Self](s: Screen) { ... }
  impl fn Click[addr me: Self*](x: i32, y: i32);

  // Adding a new virtual function not present in the base.
  virtual fn MoveTo[addr me: Self*](x: i32, y: i32);
}

fn Button.Click[addr me: Self*](x: i32, y: i32) { ... }
fn Button.MoveTo[addr me: Self*](x: i32, y: i32) { ... }

// The default final can still extend a base class.
`class ImageButton` `extends Button` {
  ...
}
```

{{% note %}}

-   Start by directly supporting abstract base classes.
-   No need to synthesize an abstract method, can mark the type.
-   Use the keyword `abstract` before `class`.
-   You declare a `base class` to allow instantiation _and_ further inheritance.
-   Simple keywords to achieve this, good readability.
-   And the default is just a final class.

{{% /note %}}

---

```carbon [4-5,11-12,15]
// Abstract base class cannot be instantiated, may have abstract methods.
abstract class UIWidget {
  // Abstract methods have no implementation.
  `abstract` fn Draw[me: Self](s: Screen);
  abstract fn Click[addr me: Self*](x: i32, y: i32);
}

// Final is the default, ``base class`` allows extension and instantiation.
base class Button extends UIWidget {
  // Implementing the abstract methods from the base class.
  `impl` fn Draw[me: Self](s: Screen) { ... }
  impl fn Click[addr me: Self*](x: i32, y: i32);

  // Adding a new virtual function not present in the base.
  `virtual` fn MoveTo[addr me: Self*](x: i32, y: i32);
}

fn Button.Click[addr me: Self*](x: i32, y: i32) { ... }
fn Button.MoveTo[addr me: Self*](x: i32, y: i32) { ... }

// The default final can still extend a base class.
class ImageButton extends Button {
  ...
}
```

{{% note %}}

-   We clean up the method keywords for inheritance as well
-   `abstract` is a direct keyword, also makes it virtual
-   `impl` in the consistent position implements some virtual method
-   `virtual` adds a new non-abstract virtual function.
-   Pretty boring changes, but nice cleanups based on experience with these
    features that we can easily migrate code across.

What about multiple inheritance? We still need ways to represent the underlying
design patterns. Looking at more principled tools like mixins for multiple
implementation inheritance, etc.

{{% /note %}}

---

## Powerful, definition-checked generics.

{{% note %}}

-   C++ today uses templates to provide generic programming, which lets you do
    (static) polymorphism in a nice low-coupling way even with multiple distinct
    interfaces.
    -   But this has some huge pitfalls
    -   Duck typed, late binding prevents type checking template definitions,
        makes good error messages very hard, and allows accidental use of
        templates when not intended
    -   Even constrained templates only partially address this
    -   Still can't use them to easily build a _dynamic_ system with type
        erasure. Instead requires significant effort and boilerplate in C++
        today.
-   Carbon adds a definition-checked generics system.
-   Extremely similar to Rust's generics or C++0x concepts.
-   Directly addresses these issues with a template system.
-   Getting this kind of powerful language construct is exceptionally hard
    within the constraints of C++ and backwards compatibility. So many attempts
    over the years.
-   But we know how to build these systems, and with the successor approach, we
    can lay that strong foundation, and then focus on _interoperating_ and
    _migrating_ rather than the compatibility challenges.
-   Important to remember throughout this not just the contrast between this
    system and templates, but how challenging it would be to incrementally move
    templates into a model like this.
-   The key is that Carbon's successor strategy enables a fresh foundation, and
    then building migration paths rather than requiring compatibility.

{{% /note %}}

---

```carbon [1-4]
// A generic interface definition to allow type checking generic code.
interface Summary {
  `fn Summarize[me: Self]() -> String`;
}

// A generic function. We type check the body against the interface. When
// called, all we check is that ``T`` implements the interface ``Summary``.
fn PrintSummary[T:! Summary](x: T) {
  Console.Print(x.Summarize());
}
```

{{% note %}}

-   First we need to define an interface that generic code can use as a
    constraint and type check against.
-   This is similar to an abstract base class when using inheritance, or a
    concept.
-   It provides an API that the type must implement, and the signatures of that
    API are what we can use (and check) within a generic context that uses this
    as a constraint.

{{% /note %}}

---

```carbon [6-10]
// A generic interface definition to allow type checking generic code.
interface Summary {
  fn Summarize[me: Self]() -> String;
}

// A generic function. We type check the body against the interface. When
// called, all we check is that ``T`` implements the interface ``Summary``.
fn PrintSummary[`T:!` `Summary`](x: T) {
  Console.Print(x.Summarize());
}
```

{{% note %}}

-   Generic functions can use the interface definition to be type checked.
-   We mark generic parameters with `:!` to make them available in types and
    other compile-time contexts.

{{% /note %}}

---

```carbon [6-10]
// A generic interface definition to allow type checking generic code.
interface Summary {
  fn Summarize[me: Self]() -> String;
}

// A generic function. We type check the body against the interface. When
// called, all we check is that ``T`` implements the interface ``Summary``.
fn PrintSummary`[T:! Summary]`(`x`: `T`) {
  Console.Print(`x.Summarize()`);
}
```

{{% note %}}

-   Also put them in the special `[...]` sequence to make them _deduced_.
-   The normal parameter `x` here then uses that `T` type. This is where it is
    deduced from.
-   And the code here is type checked via the interface definition.

{{% /note %}}

---

## Types explicitly implement interfaces.

{{% note %}}

-   The duck-typing approach of templates can result in unintended "generic"
    usage of types that happen to have an API with an overlapping name.

{{% /note %}}

---

```carbon [10-24]
// A generic interface definition to allow type checking generic code.
interface Summary {
  fn Summarize[me: Self]() -> String;
}

// A generic function. We type check the body against the interface. When
// called, all we check is that ``T`` implements the interface ``Summary``.
fn PrintSummary[T:! Summary](x: T) { ... }

class NewsArticle {
  ...
  // Internal ``impl`` of an interface both satisfies the generic usage _and_
  // contributes to the overall type interface.
  `impl as Summary` {
    `fn Summarize[me: Self]() -> String { ... }`
  }
}

fn SummarizeNews(`n: NewsArticle`) -> String {
  // Can use with a generic function due to ``impl``.
  `PrintSummary(n)`;
  // Can also directly call the method because ``impl`` is internal.
  return `n.Summarize()`;
}
```

{{% note %}}

-   With Carbon we can prevent that and provide a more robust tool with explicit
    implementation.
-   An internal implementation like this contributes to the API of the type.

{{% /note %}}

---

## Interfaces provide API extension points.

{{% note %}}

-   Rather than ADL and overloading to build extension points into an API, we
    use interfaces and implementations.
-   Easy case in implementing an interface for your type
-   Also need to implement your interfaces for other types

{{% /note %}}

---

```carbon [1-2,13-22]
// Import a library from another package with a ``Tweet`` class.
`import OtherPackage`;

// A generic interface definition to allow type checking generic code.
interface Summary {
  fn Summarize[me: Self]() -> String;
}

// A generic function. We type check the body against the interface. When
// called, all we check is that ``T`` implements the interface ``Summary``.
fn PrintSummary[T:! Summary](x: T) { ... }

// An external impl allows use with generics, but doesn't impact
// direct type API - otherwise this might be ambiguous or collide.
`external impl` `OtherPackage.Tweet` as Summary {
  fn Summarize[me: Self]() -> String { ... }
}

// Use our external impl with our interface and someone else's type.
fn SummarizeTweet(`t: Tweet`) {
  `PrintSummary(t)`;
}
```

{{% note %}}

-   Use external impls for this.
-   Doesn't change the type API (we can't, it might not be our type)
-   Can use external impls even for your types when this is desirable.
-   But any impl has to go with either its type or interface
    -   Bounded, known places to look for implementations
    -   No ODR-style undiagnosable errors.
    -   Again, this is something we can design based on our experience with C++
        and knowing we can lay clean foundations that code is going to migrate
        to.

{{% /note %}}

---

## So much more I can't cover here...

{{% note %}}

-   I didn't even cover everything in the slides
-   And there is a lot more here
-   Plus huge areas we've not even started designing like concurrency
-   But one thing we really have to cover, is...

{{% /note %}}

---

# What about C++ interop?

{{% note %}}

-   It's kinda the whole point.

{{% /note %}}

---

<div class="col-container">
<div class="col">
<div class="fragment">

```carbon []
// Carbon file: ``geometry.carbon``
package Geometry api;
import Math;

// Import a C++ header as a library.
// Turns it into a Clang header module.
import `Cpp` library `"circle.h"`;

fn PrintArea(circles: Slice(`Cpp.Circle`)) {
  var area: f32 = 0;
  for (`c: Cpp.Circle` in circles) {
    area += Math.Pi * `c.r` * c.r;
  }
  Print("Total area: {0}", area);
}
```

</div>
</div>
<div class="col">

```cpp []
// C++ header: ``circle.h``
struct Circle {
    float r;
};
```

<div class="fragment">

```cpp []
// C++ source file.
#include <vector>
#include "circle.h"

// Include Carbon code as-if it were
// a header. Under the hood, Clang
// imports a module wrapping Carbon.
`#include "geometry.carbon.h"`

auto main(int argc, char** argv) -> int {
  std::vector<Circle> circles =
      {{1.0}, {2.0}};

  // Carbon's ``Slice`` supports implicit
  // construction from ``std::vector``.
  `Geometry`::`PrintArea`(`circles`);
  return 0;
}
```

</div>

</div>
</div>

{{% note %}}

-   But maybe the most significant part of the language, let's look at how C++
    interop works
-   First thing is that we can directly import a C++ header the way we would a
    Carbon library.
    -   Internally, we expect to use Clang to parse the header into a
        header-module that we can then semantically import into Carbon
-   It pulls the names into a special `Cpp` package
-   And it knows that some names are parameterized and how to translate those
    into Carbon-style syntax
-   Which lets us instantiate a C++ template from Carbon code. And this is the
    real C++ template here, with a Carbon type parameter.
-   And once we've defined our Carbon API, we can access that even in C++ code
-   We include a header, completely synthetic when using our bundled C++
    compiler based on Clang, or generated code for working with other compilers
-   This gives us C++-style names for the Carbon entities
-   And now we can call the Carbon function
-   Here you can see that it really is the C++ template as we're able to pass in
    a parameter from C++ using a C++ `const &` and it shows up as a readonly
    value in Carbon.
-   This also shows that we map the critical primitive vocabulary types like
    integers seamlessly, we expect similar seamless mappings for things like
    `string_view` and `span` and friends. Containers we expect to not perfectly
    map but to use generics and access as the C++ names so that Carbon can
    develop containers with better API ergonomics and performance without losing
    access to C++ ones. Abstractions like `span` are key in API boundaries for
    this reason.

-   Even more complex things like inheritance are designed so that they pass
    through cleanly
-   We can have single inheritance type hierarchies that move seamless into
    Carbon and out of Carbon
-   This is the level of interop we want to achieve throughout -- get the core
    constructs to be completely seamless, and have good ergonomic tools to even
    work with the edge cases so that the interop can be fine grained and low
    overhead both for the generated code and the humans.

Ok, I hope all of this has piqued your curiosity, gotten you a bit excited, but
also maybe makes you wonder -- how are we going to finish this? How will all of
it work and function?

{{% /note %}}

---

# Interoperability, migration... <span class="fragment">_and process!_</span>

{{% note %}}

-   We've talked a lot about how being a successor language through
    interoperability and migration allow us to dramatically shift away from some
    of the technical debt in C++ and make really exciting improvements.
-   Even improvements that make it easier to sustain this going forward.
-   But there was a third challenge that we raised and haven't really addressed:
    the _process_ for evolving the language itself.

{{% /note %}}

---

# Carbon - the project

{{% note %}}

-   So let's talk a bit about the project and process itself.

{{% /note %}}

---
{{< slide auto-animate="" >}}

# Community and culture

> Culture eats strategy for breakfast, technology for lunch, and products for
> dinner, and soon thereafter everything else too.
>
> --
> [Peter Drucker](https://techcrunch.com/2014/04/12/culture-eats-strategy-for-breakfast/)

{{% note %}}

-   Carbon's number one _project_ goal is focused on community and culture.
-   The reason is simple, and captured entertainingly by Peter Drucker in this
    quote: culture eats strategy for breakfast.
-   At the end of the day, the project is only as strong as its community, and
    that community is _defined_ in many ways through its culture.
-   Programming languages generally have struggled to produce and sustain a
    really friendly, welcoming, inclusive, and kind culture, especially in
    surrounding the language design itself.
-   We're committed to overcoming this. We want to be...

{{% /note %}}

---
{{< slide auto-animate="" >}}

# Community and culture

-   Inclusive and welcoming, with a comprehensive code of conduct
-   Friendly and approachable community
-   Open process for governance and changes
-   Decisions with clear rationale, especially when a difficult tradeoff

{{% note %}}

-   We want to keep an inclusive and welcoming culture, especially as we work to
    grow the project across many different axes of diversity.
    -   Code of conduct, but also doing the work throughout the different
        project spaces.
-   In some ways, even more important is that we want to be friendly and
    approachable and invite more and more folks, especially all of you, into the
    language design itself, fixing its problems, and making it better.
    -   Find ways to enable people to collaborate and contribute and get
        involved
    -   Encourage folks and help them out rather than pushing them away
-   Make sure how we operate is open and transparent
-   Make decisions with a clear and stated rationale, especially tough ones
    where some folks won't like the outcome and we have to make a real tradeoff.

Important:

-   These community efforts aren't afterthoughts or volunteer efforts.
-   Making the community excellent is a primary part of contributing to the
    project.
-   This is funded work, including working with a professional community expert
    from the C++ community.

{{% /note %}}

---

# Batteries-included tools & ecosystem

{{% note %}}

-   Another project goal is to set ourselves up to build a rich and complete
    ecosystem
-   It of course will start with the existing C++ ecosystem
-   But Carbon specific components that are needed should always be in-scope
    -   A real design document for the entire language
    -   A formal specification
    -   User guides and documentation
    -   Reference implementation for inspecting and understanding the language
    -   A production quality implementation that people can use out of the box
    -   Developer tooling, migration tooling, tooling to assist language
        upgrades ....

The list goes on, and ...

{{% /note %}}

---

# Yes, including a package manager <span class="fragment">(eventually)</span>

{{% note %}}

-   ... yes, it will include a package manager
-   Eventually
-   To be clear, this is just about setting up our scope. We're _very_ far away
    from this.

{{% /note %}}

---
{{< slide auto-animate="" >}}

# Modern open-source development model

{{% note %}}

-   Carbon is designed around an open-source software approach to development.
-   We include _all_ of our development in this model, including the design
    work.
-   The specific model is heavily based on LLVM

{{% /note %}}

---
{{< slide auto-animate="" >}}

# Modern open-source development model

### LLVM license, CLA, GitHub, Discord, Google Docs/Meet, ...

{{% note %}}

-   Uses the LLVM license that is based on Apache2.
-   We also use a CLA. Currently, it's Google's but we plan to create and use an
    independent foundation in the future. Basically following the same process
    Kubernetes went through.
-   GitHub's ecosystem makes it our choice for most of our development
    infrastructure
    -   hosting, review, issues, discussion, etc
    -   Tools aren't always the best, but we think the familiarity and
        approachability are more important because of how they help make the
        community more friendly and accessible.
-   Discord for real-time chat
-   Also try to pragmatically use other tools that let us be more productive
    -   Lots of real-time collaboration in Google Docs before things move to
        GitHub
    -   Google Meet for video calls (mostly because it doesn't require an
        install). But also some folks use Zoom or other if it works better.

{{% /note %}}

---

# Evolution process:<br/>GitHub pull requests (PRs)

{{% note %}}

-   How do we evolve the language and project within this open source model?
-   Through GitHub pull requests
-   That's it, nothing more required
-   Design, specification, documentation, implementation, all use this.

-   Even significant language designs are developed in PRs, we directly add the
    relevant proposal document to it and reviewer it there.
    -   (maybe skip) The proposal help capture what problem is being solved, and
        all of the context, background, motivation, and rationale behind the
        change.

Who reviews and approves these? That gets into project governance.

{{% /note %}}

---

# Governance:</br>three person group of leads

{{% note %}}

TODO: maybe add them to the slide?

-   The leads are a three person group
-   Responsible for the entire project
-   Like BDFL, except scaled up, not dictators, and not for life... we'll try to
    be benevolent though. ;]
-   Not scaled too much -- can still rapidly make decisions
-   2/3 rule both helps resolve contentious issues and handle vacations
-   Eventually, we want to have a healthy bench of folks who can easily serve,
    and rotate through fixed terms. Also limit how many from any one
    organization. But the project will need to grow a bit first.
-   Similar to making decisions, need to ultimately approve proposals. However,
    other committers will often handle most if not all of the actual review,
    this is just to make sure that consensus was actually reached on these
    significant changes, they've had sufficient visibility, etc.

-   Eventually, we have plans to scale this up of course long term.

{{% /note %}}

---

# Where is Carbon today?

{{% note %}}

-   So let's look at where Carbon is today

{{% /note %}}

---

<div class="center gh-avatar-container">

<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/CelineausBerlin"/><div>Céline Dedaj</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/DarshalShetty"/><div>Darshal Shetty</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/KateGregory"/><div>Kate Gregory</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/SlaterLatiao"/><div>Zenong</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/austern"/><div>Matt Austern</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/camio"/><div>David Sankel</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/chandlerc"/><div>Chandler Carruth</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/dhollman"/><div>Daisy Hollman</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/fowles"/><div>Matt Kulukundis</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/geoffromer"/><div>Geoffrey Romer</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/gribozavr"/><div>Dmitri Gribenko</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/hanickadot"/><div>Hana Dusíková</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/jonmeow"/><div>Jon Ross-Perkins</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/josh11b"/><div>Josh Levenberg</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/jsiek"/><div>Jeremy Siek</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/mattgodbolt"/><div>Matt Godbolt</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/pk19604014"/><div>Pavel Kobyakov</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/tkoeppe"/><div>Thomas Köppe</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/wolffg"/><div>Wolff Dobson</div></div>
<div class="gh-avatar"><img src="https://avatars.githubusercontent.com/zygoloid"/><div>Richard Smith</div></div>

</div>

{{% note %}}

-   We have about 20 individuals actively contributing over the past year
-   These include significant effort driven by several organizations [list them]

{{% /note %}}

---

## Current focus and roadmap

-   Going public -- Hello CppNorth!
-   Completing the core language design
-   Developing a demo implementation of core design

{{% note %}}

-   Our current focus and roadmap for 2022 is pretty simple
-   Number one was to make Carbon public so that we could begin engaging with
    all of you, and start to get much broader feedback on our ideas and help
    making them a reality.
-   We also want to complete a working core language design. Basically the
    design part of the MVP of Carbon. This is still a ridiculously complex
    language MVP because for us, C++ interop is an essential part of the MVP,
    which means we are front-loading generics, templates, inheritance, and
    operator overloading in Carbon's design on top of C++ interop itself.
-   But we are also developing a demo implementation. This isn't a real compiler
    or toolchain, it is a detailed interpreter for the _abstract_ semantics of
    the language itself.
-   It lets you dig into the exact semantics of a tiny program snippet and
    exactly how the language interprets it.
-   We even call it...

{{% /note %}}

---

# Carbon Explorer

{{% note %}}

-   The "Carbon Explorer", with the blessing of Matt Godbolt. =] It really feels
    like the compiler-explorer mental model, but applied to the _semantics_
    instead of the _generated code_
-   But enough talking about it, let's just take a look

Hello world:

```
package Example api;

fn Main() -> i32 {
  var s: auto = "Hello world!\n";
  Print(s);
  return 0;
}
```

Highly simplified version of earlier example. Intentionally doesn't compile
until you change `let` to `var`

```
package Example api;

class NewsArticle {
  fn Make() -> Self {
    return {.published = false};
  }

  fn AsHtml[me: Self]() -> String {
    return """html
      <h1>Title</h1>
      Body
      """;
  }

  fn Publish[addr me: Self*]() {
    (*me).published = true;
  }

  var published: Bool;
}

fn Main() -> i32 {
  let article: auto = NewsArticle.Make();
  Print(article.AsHtml());
  article.Publish();
  return 0;
}
```

-   Doing that on the command line is a little annoying.
-   What would be way better is to have it _in the compiler explorer_
-   _Hop over to compiler explorer and work through using carbon explorer there_

Generics:

```
package Example api;

interface Summary {
  fn Summarize[me: Self]() -> String;
}

fn PrintSummary[T:! Summary](x: T) {
  Print(x.Summarize());
}
class NewsArticle {
  // ...
  impl as Summary {
    fn Summarize[me: Self]() -> String {
      return "News Headline! Read All About It!\n";
    }
  }
}

class Tweet {
  var text: String;
}
external impl Tweet as Summary {
  fn Summarize[me: Self]() -> String { return me.text; }
}

fn Main() -> i32 {
  var news: NewsArticle = {};
  var tweet: Tweet = {.text = "A #CppNorth Science Experiment!\n"};
  PrintSummary(news);
  PrintSummary(tweet);
  return 0;
}
```

-   _Try to crash it or get it wedged some how_:
    `fn F() -> Type { var v: F() = {}; }`
-   And, as you can see, it really is still early days. =D Anyways, ...

{{% /note %}}

---

# So, what comes next for C++?

{{% note %}}

-   I still don't know, and honestly I'm not even sure there is just one
    answer...
-   I think its pretty likely that there are different answers that are each a
    _part_ of what comes next.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Probably C++?

{{% note %}}

-   C++ is probably part of what comes next. A lot of users will genuinely need
    the backwards compatibility. And plenty of other reasons.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Probably C++?

## Also some of the garbage collected languages?

{{% note %}}

-   Some of the nice GC-ed languages are also probably part of what's next.
-   For use cases where the performance cost is reasonable, they're great
    options.

{{% /note %}}

---
{{< slide auto-animate="" >}}

## Probably C++?

## Also some of the garbage collected languages?

## Also probably Rust?

{{% note %}}

-   Rust is also almost certainly _part_ of what of what comes next...
-   This is the reality. I think there are a lot of different parts to what will
    come next for C++.

So the right question is...

{{% /note %}}

---

## Is _Carbon_ a part of what comes next for C++?

{{% note %}}

-   And I really don't know. I don't think any of us know yet.
-   A successor language approach is really exciting. I think it has a huge
    potential to accelerate parts of the C++ ecosystem where none of the other
    options I mentioned are going to be viable.
-   But at the end of the day, I really don't know. I don't think any of us know
    yet.
-   In fact, I'm never going to be able to figure this out myself. Even all the
    folks who have been working on Carbon can't figure this out.
-   We're going to need you all and the rest of the C++ community to help us.
    -   To help us build and shape Carbon.
    -   To try it out, to evaluate it.
    -   To complain about problems and help us fix them.
    -   Only eventually, and only with your help along the way, will we be able
        to figure out whether Carbon is part of the answer here.
-   That's why we're here, and why we're presenting this to you all today.

{{% /note %}}

---

<div class="r-stretch" style="display: flex; align-items: center">

# Let's _together_ find out if Carbon <br/> is a part of what comes next for C++.

</div>

### https://github.com/carbon-language/carbon-lang {.fragment}

{{% note %}}

-   Thanks.

-   And now, let's start down that road the same way this talk started: with
    questions.
-   But this time with _your_ questions. And not just with _my_ answers, but I'd
    like to bring up our two other Carbon leads Kate Gregory and Richard Smith.
    We're going to form a little panel for the rest of this talk to try to
    really dig into your questions. And we also have several folks who're
    working on Carbon in the audience who can hop up on stage as needed to dive
    into any specific areas or details.

{{% /note %}}

---

# Carbon Language

### https://github.com/carbon-language/carbon-lang

### https://discord.gg/ZjVdShJDAs

{{% note %}}

-   Background slide with resources while we do the Q&A panel

-   TODO: Remove form link for keynote proper.

{{% /note %}}

---

---

## Backup Slides

---

## Example with generics, templates, and complex implicit conversions and operator overloading.

---

```carbon [|1-7|9-13|17-24|42|47|28|29|30-37|32|44-47|41-42|25-48]
// Turn off definition checking and work in the C++ template model by adding the
// ``template`` keyword. You can even use an ``if`` condition instead of SFINAE.
class SaturatingInt(template N:! i32) if N >= 0 and N <= 256 {
  ...
  var value: Carbon.Int(N);
  ...
}

// ``ImplicitAs(U)`` is a generic interface that extends ``As(U)``.
interface ImplicitAs(Dest:! Type) {
  extends As(Dest);
  // Inherited from As(Dest):
  // fn Convert[me: Self]() -> Dest;
}


// Implicit conversions are modeled as an ``impl T as ImplicitAs(U)`` to convert
// from T to U implicitly. We want to enable implicit conversions from normal
// Carbon integers of any size to the corresponding saturating integer type.
impl forall [template N:! i32] Carbon.Int(N) as ImplicitAs(SaturatingInt(N)) {
  fn Convert[me: Self]() -> SaturatingInt(N) {
    return {.value = me};
  }
}

// Using ``like`` here gives any type that can implicitly convert
// to ``Carbon.Int(N)`` using some ``ImplicitAs``.
impl forall [template N:! i32] SaturatingInt(N)
    as AddWith(like Carbon.Int(N)) {
  fn Op[me: Self](other: Carbon.Int(N)) -> Result {
    var (result, overflow): (Carbon.Int(N), bool) =
        __builtin_add_overflow(me.value, other);
    if (not overflow) {
      return {.value = result};
    }
    return {.value = if me.value < 0 then Carbon.Int(N).Min else Carbon.Int(N).Max };
  }
}

fn DoAdd(lhs: SaturatingInt(64), rhs: i32) -> SaturatingInt(64) {
  // The binary expression here is silently rewritten:
  return lhs + rhs;

  // Into something like this, which works because ``i32`` is ``Carbon.Int(32)``
  // which implicitly converts to ``Carbon.Int(64)``, and we have an ``AddWith``
  // implementation for that on ``SaturatingInt(64)``.
  return lhs.(AddWith(typeof(rhs)).Op)(rhs);
}
```

{{% note %}}

-   First, we define a generic class that uses a _template_ parameter.
    -   That's right, a template. You can get the C++-style templates back when
        needed with the `template` keyword. But it's narrow and focused: you get
        exactly as much templating as you need, and no more.
    -   Here, we just need the bit-width itself to be a template so that we can
        heavily specialize on exact bit widths.
-   With this template parameter, you can write `if` conditions directly on the
    declaration to limit where it is used, as essentially a nicer form of
    SFINAE.

-   We also need another bit of Carbon infrastructure. Just like we use an
    interface to control the behavior of _explicit_ conversions, we also use one
    to control _implicit_ conversions.

    -   This is defined as an `ImplicitAs` interface, and because explicit
        conversions should be a superset of implicit, it _extends_ the `As`
        interface.
    -   The exciting thing is this lets you easily extend implicit conversions.

-   Now we can enable implicit conversions for all normal integers to our new
    saturating integer type with a generic implementation of `ImplicitAs`.

-   Now let's tackle a really challenging part of this, overloading binary `+`
    with implicit conversions.
-   This expression gets desugared into something like this qualified call to a
    _parameterized_ interface method `AddWith`.
-   But `typeof(rhs)` here is `i32` or `Carbon.Int(32)`, and we're looking for
    an impl for `SaturatingInt(64)`. So let's look at the generic impl we
    defined for this.
-   It's generic over the bit width of the saturating int, good.
-   And provides a special `AddWith(like ...)` syntax. The `like` here expands
    this `impl` to cover anything implicitly converting to the type operand of
    `like`. You could do this yourself with generic impls but it is a _lot_ of
    code, so we provide a utility already here.
-   Last but not least, we also document that the result will be the same as the
    self type. The self type here is the `impl`'s self type so
    `SaturatingInt(N)`. This lets us control the type checking of the result of
    these expressions even in a generic context.
-   The operation itself is defined without `like` or any implicit conversions.
    It has a fixed size now, and this is even a template size.
-   Which allows us to use potentially low-level implementations that call
    directly into the backend like this analog to a Clang intrinsic for overload
    safe addition.
-   Now that we have that definition, we can understand how the rewrite works.
    The `AddWith` is resolved to the definition above because we can implicitly
    convert an `i32` to an `i64`. And that gives us an `Op` function signature
    expecting an `i64` so the implicit conversion happens before we call the
    `Op` here.

-   Basically, all of this machinery lets you use a single extension point in
    Carbon: implementing an interface.
-   For operators specifically we try to provide a really powerful extensions
    mechanism that lets us very precisely control all aspects of implicit
    conversion. But we also try to provide utilities to make the easy and common
    cases reasonably easy. Even this example we expect to be typically handled
    more simply by re-using utilities. But it shows the power and expressivity
    available.
-   And because we define all of this from the beginning in terms of interfaces,
    every piece of this just directly translates to generics without any more
    work.

{{% /note %}}

---

# Test <span class="fragment highlight">Test</span>

---

```cpp
// C++ source file.
#include <vector>
#include "circle.h"

// Include Carbon code as-if it were
// a header. Under the hood, Clang
// imports a module wrapping Carbon.
`#include "geometry.carbon.h"`

auto main(int argc, char** argv) -> int {
  std::vector<Circle> circles =
      {{1.0}, {2.0}};

  // Carbon's ``Slice`` supports implicit
  // construction from ``std::vector``.
  `Geometry`::`PrintArea`(`circles`);
  return 0;
}
```
