+++
title = "The little things, part 1 of many..."
date = 2023-02-09T01:06:01-08:00
draft = true
+++

Working on a programming language is one of the most challenging and open ended
design spaces that I have ever tried to operate in, both for existing and a
brand new language. There are very few bounds or constraints on the solution
space to help guide and direct your thinking. Everything is ambiguous and open
ended with endless possibilities. It may sound great until you need to make
progress. Then... not so much.

But one thing I've always liked is paying attention to the little details of the
language. Here, it can be a bit less open ended. And a language is one of the
places where paying attention to tiny details can pay off over time. It can help
the language feel _right_ or _satisfying_ in a way that makes it a joy to read.

While I'm sure we have a lot of these still to work on in Carbon, it's an area
that I like to pay attention to when we can and try to polish everything while
change is easy and we can get these little improvements at low cost.

I'll keep a series of posts to mention these in no particular order and share
both how we got to a particular example and why it is so satisfying. These won't
be super complex or deep in many cases because, after all, these are just little
things. But I hope you enjoy. And first up...

## Visibility or access levels

First up, let's talk about `public` vs. `private`. Folks who know C++ may be
familiar with these concepts, but here is a quick example:

{{< code "/code/little_things/access_example1.cpp" >}}

One of the things that has always been frustrating to me are exactly how
`public` and `private` work here. They introduce _regions_ of declarations, not
a single declaration. And the default depends on how you declare the class?

{{< code "/code/little_things/access_example2.cpp" >}}

A pretty common model that is much more satisfying is to put these on the
specific thing that is public or private. Most languages also make private the
default:

{{< code "/code/little_things/AccessExample.java" >}}
{{< code "/code/little_things/AccessExample.cs" >}}
{{< code "/code/little_things/access_example.rs" >}}

These all make lots of sense, and seem much more satisfying. But these aren't
the only models. Swift has a minor tweak by providing a new level of "internal"
that's in-between private and public, and hopefully a better default:

{{< code "/code/little_things/AccessExample.swift" >}}

Then there is Go which uses the _case_ of the name to determine the visibility.
I struggle with this one as I think the semantic difference here is far too
important to convey with such a subtle distinction. But it does at least enforce
naming convention consistency? Ultimately, this is not my favorite design at
all:

{{< code "/code/little_things/access_example.go" >}}

But then I saw something interesting with Kotlin:

{{< code "/code/little_things/access_example.kt" >}}

The visibility specifiers are still on each declaration, but now the default is
_public_ rather than private! This was a big surprise to me when I first saw it.
It seems to violate good principles of software engineering: be _explicit_ about
choosing to export a public API. Why would want that _by default_?

But the more I thought about this choice, the more it started to make sense.
First, it still addresses the core issue of C++'s syntax by attaching the
visibility to the specific name covered. No more regions and associated
confusion. But it also addresses a big problem with all of the other languages
(besides Go), where the public API becomes the most _noisy_ API to read. When I
thought about reading the code and what I really wanted to be prioritized, it's
the public API. And I want as little visual noise as possible there distracting
me from what I need to know: names, types, the API itself. By making public the
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
by default as well, and mark them as private. While this was a big surprise to
me at first, it has ended up as one of the little things in Carbon that brings
me lots of joy. I think this is really _right_, and surprisingly so.
