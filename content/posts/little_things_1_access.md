+++
title = "The little things #1: Access control"
date = "2023-03-26T00:24:16-07:00"
tags = ["language design", "little things", "carbon language", "access control"]
+++

> This post is part of a series looking at little details of programming
> language design, mostly in the context of Carbon. Check out the
> [series intro post](/posts/little_things_series) for context and other
> entries.

Let's talk about `public` vs. `private`! Folks who know C++ may be familiar with
these concepts, but here is a quick example:

{{< code "/code/little_things/access_example1.cpp" >}}

One of the things that has always been frustrating to me are exactly how
`public` and `private` work here. They introduce _regions_ of declarations, not
a single declaration. And the default depends on how you declare the class? 😤
This is almost certainly just a personal thing, and I have no evidence this is a
real source of confusion, but it grinds my gears. Anyways, the result is:

{{< code "/code/little_things/access_example2.cpp" >}}

A pretty common model that is much more satisfying is to put these on the
specific things that are public or private. Most languages also require that
_public_ APIs are explicitly marked, and have a default slightly broader than
C++'s "private". Java's default is "package", and C# and Swift call it
"internal". Rust just defines its "private" in a similar way. The results look
like:

{{< code "/code/little_things/AccessExample.java" >}}
{{< code "/code/little_things/AccessExample.cs" >}}
{{< code "/code/little_things/AccessExample.swift" >}}
{{< code "/code/little_things/access_example.rs" >}}

These all make lots of sense, and seem much more satisfying.

Then there is Go which uses the _case_ of the name to determine the access
level. I struggle with this one as I think the semantic difference here is far
too important to convey with such a subtle distinction. But it does at least
enforce naming convention consistency... Still, personally, this is not my
favorite design:

{{< code "/code/little_things/access_example.go" >}}

But then I saw something interesting with Kotlin:

{{< code "/code/little_things/access_example.kt" >}}

The access specifiers are still on each declaration, but now the default is
_public_ rather than private! This was a big surprise to me when I first saw it.
It seems to violate good principles of software engineering: be _explicit_ about
choosing to export a public API. Why would you want that _by default_?

But the more I thought about this choice, the more it started to make sense.
First, it still addresses the core issue of C++'s syntax by attaching the access
level to the specific name covered. No more regions and associated confusion.
But it also addresses a big problem with all of the other languages (besides
Go), where the public API becomes the most _noisy_ API to read. When I thought
about reading the code and what I really wanted to be prioritized, it's the
public API. And I want as little visual noise as possible there distracting me
from what I need to know: names, types, the API itself. By making public the
default, it makes the API that is going to be most read also the most
_readable_.

Even for private members, this continues to work well -- when reading code it is
on the _private_ members that I want a local reminder that this is an
implementation detail and not something that can just be called. These helper
methods and fields are also likely able to use shorter names, making the
horizontal space of the extra keyword less disruptive to the flow of code.

I never expected to really be won over by this, but it makes a ton of sense to
me now. It also convinced most folks on Carbon and we're now using that approach
as well:

{{< code "/code/little_things/access_example.carbon" >}}

Even `MyType` gets the same treatment, as we make things in the package public
by default as well, and mark them as private when needed. While this was a big
surprise to me at first, it has ended up as one of the little things in Carbon
that brings me a lot of joy. I think this is really _satisfying_, and
surprisingly so.
