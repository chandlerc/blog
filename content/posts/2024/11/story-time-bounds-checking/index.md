+++
title = "Story-time: C++, bounds checking, performance, and compilers"
date = "2024-11-16"
tags = ["C++", "safety", "memory safety", "bounds checking", "LLVM", "optimization", "compilers"]
+++

Recently, several of my colleagues at Google shared the story of how we are
retrofitting spatial safety onto our monolithic C++ codebase:
https://security.googleblog.com/2024/11/retrofitting-spatial-safety-to-hundreds.html

I wanted to have a bit of story-time about some of the strange ways that all
this came to be, at least as I remember things. There are some really
interesting developments that led us here, and some important lessons to learn
from that history.

Do note that this is just my retrospective memory. It's entirely possible I'm
misremembering some of it (let me know if so!). It's also limited to my
perspective, and others may have seen very different aspects of things (please
share!).

## Overhead of bounds checking: I was _wrong_

I was a deep skeptic about this area for many years due to deep concerns about
the performance impact of bounds checking. A number of historical reports by
others of the costs coupled with some fairly casual experimentation on my own
instilled a pretty strong belief that bounds checks couldn't realistically be
made cheap enough to enable by default. However, so far they are looking _very_
affordable. From the above post, 0.3% for bounds checks in all the standard
library types!

Just to emphasize: **I was (very) wrong.**

Sadly, I wasn't alone in this belief. A _lot_ of us were very wrong. I think
this broadly held collective "belief" in the cost of bounds checking discouraged
lots of folks from doing two things that needed to happen:

- Implement high quality dynamic safety checks suited to production usage in
  libc++ and the rest of the C++ abstraction ecosystem (other standard
  libraries, libraries like Abseil, etc.).
- Teach LLVM (and likely other optimizing compilers for C++) how to eliminate
  and optimize these kinds of checks more effectively.

### The path to a hardened implementation

Fortunately, several efforts ended up overcoming this industry back pressure. I
suspect this looked different in different parts of the industry, but at least
what I observed was the slowly building awareness of the security risk posed by
the absence of these checks. Initially, it was focused on the most attacked
software -- things like Chrome, OS kernels, drivers, etc. But at least there, it
eventually became clear both to me and many others that we _had_ to start
developing really high quality checks that could stay on in production binaries.

I saw MSVC very early on shipping several interesting checks in their compiler
like this (and maybe elsewhere, my visibility into the Windows ecosystem is
limited). And eventually things started moving in libc++ as well. I would say
all the folks at Apple driving the [LLVM RFC for safe buffers in C++][rfc] did
an amazing job here of getting the LLVM ecosystem, both Clang and libc++, to
have solid tools in this space at last. Huge props to all of their work to
develop this even in the face of back pressure, and to the security teams
everywhere who helped build the case for it and motivate the work.

[rfc]: https://discourse.llvm.org/t/rfc-c-buffer-hardening/65734

### Making LLVM better at optimized hardening

I think one tricky part of getting our optimizing compilers to do a better job
has been quietly happening for a long time, and in a way that seems obvious in
retrospect but that I never really recognized. LLVM started getting more widely
used by non-C/C++ languages. It turns out that all of these languages are memory
safe (wonder why!) and need bounds checks and other dynamic safety checks.

Over time, several teams working on these other languages started contributing
more and more to LLVM itself, resulting in a steady and systematic series of
improvements. The group I first noticed driving this were the Azul folks working
on a highly-optimized Java implementation using LLVM, but I suspect several
others have helped from Rust, Swift, and likely even other areas.

We also started to see UBSan get more widely deployed, and encounter performance
problems with its checks. I remember John Regehr looking at many of these and
pushing to improve LLVM's optimizations and code generation, as well as
developers all over the LLVM and Clang community. Slowly but steadily, LLVM
started to do an excellent job at eliminating these kinds of checks, and even
more importantly optimizing them and moving them out of the hottest critical
paths of the code.

Lastly, but far from least, profile-guided optimization (PGO) has become
increasingly pervasive and is even used on massive C++ codebases. LLVM was
especially late to the PGO game, but the folks systematically building out
optimization infrastructure to leverage it have done an amazing job. It is hard
to overstate how important high quality PGO is for isolating the hot paths of
the code from the overhead of safety checks, and unlocking all the other
optimization techniques LLVM was growing around them to minimize their cost.
Even in cases where it is hard to get a precise or meaningful profile, the
safety checks themselves can be directly annotated and leverage any PGO support
within the optimizer. Without PGO infrastructure, I do not think the overhead of
these checks would be tolerable for most performance sensitive workloads.

Both aspects of LLVM were improving somewhat independently for many years, and I
think we didn't really notice when a tipping point was reached. At that point,
they combined to radically reduce the practical costs of these kinds of checks
and make them affordable by default and pervasively. This level of availability
changes the security game, as we no longer have to make painful tradeoffs of
performance _or_ security, we can have both.

## Why did LLVM struggle to optimize safety?

Looking back at this progression, one of the most odd things is just how bad
LLVM and GCC of old (at least as I recall) were at optimizing these kinds of
constructs. Why was that? These compilers were both _extremely_ impressive in
what they could optimize.

Well, they were both designed around optimizing C and C++ code. And guess what
doesn't have any bounds checks or other safety checks in it? ... Yep, C and C++
code.

And before folks think this is because of the C and C++ _programmers_, not at
all. This is about abstractions. The language level abstractions of arrays did
nothing, and that set the tone even in C code. In C++ code, we have containers
and now views and all kinds of abstractions for this. All of these abstractions
_allow_ safety checks, but only through "undefined behavior", and essentially
none provided safety in their optimized configurations. The inevitable result
was C and C++ software that systematically and pervasively did not have safety
checks.

That software is what our optimizing compilers were designed around, and so they
were designed around optimizing _without_ safety checks. They were designed
around the unsafe abstractions and coding patterns of these languages. Yet we
evaluated the cost of safety checks by adding them to the language without any
work to make up for the years or even _decades_ of optimization infrastructure
that never had to deal with them. The fact that the performance was poor, in
retrospect, isn't surprising at all to me. This is one of the big lessons I take
away from all of this.

## Where do we go from here?

For me at least, watching how this has played out has some clear short-term
implications as well as some longer term ones.

### Tactical and short-term steps

First, I don't think we're done with getting these checks implemented. We need
many more people from across the industry to get involved in building and
maintaining the high-quality production spatial safety checks. There are a lot
more libraries that need them, more coverage needed within libraries as they
grow, and language constructs that need the compiler's help to get them. We also
need to improve and maintain these implementations as they come with very real
complexity and costs. And we need users everywhere to switch their defaults and
enable these checks. Not just for some code, but for all their code and without
opt-outs. We need to help them use visible `unsafe`-marked APIs in the isolated
hot spots rather than disabling the entire configuration. The reluctance and
skepticism that the initial implementation efforts faced isn't going to be
sustainable. The experts and maintainers of the infrastructure supporting the C
and C++ ecosystem need to actively champion these efforts.

Second, we're far from done with optimizing and improving the code generation
for these kinds of checks. Programming languages are moving towards memory
safety, and that inherently comes with pervasive dynamic safety checks, bounds
checks especially. Our optimizing compilers aren't going to have the luxury of
only prioritizing unsafe C and C++ code, instead their new normal is going to be
handling these checks everywhere. They need to invest and _continue_ to invest
in making that normal successful.

Combined, and with a _lot_ of work, **I think we have a real chance at making
spatial memory safety achievable by default, even in C and C++**, and even in
the most performance constrained environments.

### Strategic and long term

The biggest take away for me at the strategic level is to much more deeply
question assumptions around performance of different idioms, patterns of code,
or abstraction techniques. Isolated performance issues are much easier to
evaluate empirically and get compelling data in one direction or another. This
makes it easier to answer a question of "can we effectively teach the optimizer
to handle this particular construct that we are sometimes seeing?" without being
anchored on historical biases. However, when it's not a specific construct and
instead some pervasive pattern or idiom, our attempts to benchmark and evaluate
them are going to overwhelmingly skew towards confirmation bias. Our optimizers
will have deep, but not immutable, assumptions that bias any superficial
experiments we run.

We need to recognize this, and look more at whether the resulting pattern could
be well and systematically optimized, even though current tools do not. We need
to take more theoretical models, or plan for the significant investment required
to correct some of the accumulated gaps in our infrastructure prior to making
measurements. Probably both.

And we all, yes, including you, dear reader, need to take a serious look at our
assumptions and our skepticism. Are you discouraging experiments that might
change our prior assumptions? Is your negativity based on historical data
reflecting things that remain fundamentally true, or might there have been
changes that motivate re-examining them?

None of this is to say we shouldn't apply what we have learned and try to
prioritize approaches and designs most likely to succeed based on that. We just
also need to work hard to spot where this rises to the point of systematically
holding back progress or re-evaluation. When we spot that, we need to be
intentional and directly push for efforts to do that re-evaluation and get fresh
experimental data.

### What about temporal safety?

With that in mind, it is important to consider whether this changes how we
should expect temporal safety to work in C and C++ -- should it throw into
question the widely held belief that this cannot be automatically provided at a
tolerable cost? Have our measurements been biased by hitting some systematically
ignored but fundamentally solvable problem in our compilers and optimizers?

So far when doing that re-examination, I'm not seeing enough indications. The
costs largely seem much more fundamental and inescapable in the way that they
must be represented when using a fundamentally unsafe language like C or C++ --
the kinds of interactions guarded against are often non-local and involve
indirections through memory and data structures.

The closest place I see here that might have changed is in reference counting. I
think there is some compelling evidence that for smaller systems (phones,
laptops, things attached to batteries), the cost in cache traffic and
potentially synchronization overhead is marginal at best. Swift I think has
shown strong evidence that with some investment in optimization infrastructure
and careful implementation, reference counting can be extremely efficient on
these processors. However, so far I still see evidence that those costs scale
poorly to large server processors with 100s of cores and huge, complex cache
hierarchies. We also, in large part thanks to Swift, are getting more realistic
numbers here with infrastructure that is aware of the overhead. Still, an area
worth keeping an eye on going forward I think.

Essentially, here too I want to temper our skepticism as an industry. We should
avoid letting it rise to the point that even attempting to solve temporal memory
safety seems like a fool's errand. We don't want to discourage work on the
_problem_, simply because this avenue of solving it remains doubtful. Even
though we may never find something sufficient to make C and C++ automatically
memory safe, we may find ways to make our memory safe languages more ergonomic
and user-friendly. We may find better ways to interoperate between unsafe and
safe code in the temporal space. Fundamentally, software _must_ shift to memory
safe languages, even for high-performance code. Making that transition happen
faster and with less disruption needs all the help we can give it.
