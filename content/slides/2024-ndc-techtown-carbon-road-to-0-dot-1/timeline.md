+++
weight = 4
outputs = ["Reveal"]
+++

# Timeline for reaching 0.1

{{% note %}}

{{% /note %}}

---

## _Stretch_ goal of finishing 0.1 next year

- Will be approaching throughout next year
- Toolchain, language, and interop will expand steadily
- Working packaging of C++ toolchain probably one of the first parts
- Getting all the way to shipping 0.1 seems unlikely
  - A *lot* of interop and interop-dependencies to go
- More contributors will help of course! =]

{{% note %}}

The big take-away is that at some point next year, there might be enough
features for *you* to try this out, even if we're not far enough to really have
hit 0.1.

{{% /note %}}

---

## But 0.1 won't include the automation

- The migration vision is just that: our long-term vision
- Good tooling and automation will be another (huge) effort past 0.1
- But can *evaluate* by doing these steps more manually
- May have some very rudimentary tooling to help with mechanical aspects

---

## Ok, but why is this taking so long???

---

## Things have not always been smooth sailing...

- Designing a generics system to support C++'s use cases was _hard_
  - Needs to support advanced features: specialization, templates, ...
  - Don't want to repeat ODR-problems or other NDR or unsound issues
- Building a working governance and evolution process is _hard_
  - Took multiple iterations to get onto a good track

Also...

---

# Starting a new language right before a global pandemic was... <span class="fragment">suboptimal.</span>

## Anyways... 🤡 {.fragment}

---

## We're building Carbon for the _long term_

- Investing in getting the foundations of Carbon _right_
  - We've seen deferring this cause problems in C++ and Clang
  - Never end up refitting our foundations
  - Too many interdependencies between foundations & design
- Carbon prioritizes _foundational improvements_ & _sustainability_ over speed
  - Trying to recapture speed wherever we can through incrementality

---

## Investments in foundations are paying off...

---

## Let's look at a fun one: the toolchain
