+++
weight = 6
outputs = ["Reveal"]
+++

## Graduating Carbon from an experiment

{{% note %}}

* Future \- Post experiment:  
* We also expect the project as a whole to accelerate once we are into the evaluation and eventually the piloting phase.  
* Still a long road to 1.0 and a production language, but we're really excited to move from the experimental phase into evaluation.

{{% /note %}}

---

## We started Carbon as a science experiment: could we ...

- Design a language that would be able to match the interaction surface of C++?
- Implement fine-grained C++ interop on top of Clang?
- Layer a real memory safety model on afterward?
- Build a safety model that is incrementally adoptable from C++?
- Achieve the compile time improvements we hoped for?
- Automate the migration from C++ to Carbon at scale?
- Grow an open-source project that can sustain this effort?

{{% note %}}

* Past  
  * We said at the beginning that Carbon was a science experiment: we literally did not know if we could build Carbon.  
    * Could we design a language that would be able to match the interaction surface of C++?  
    * Could we implement interop on top of Clang in a workable compiler?  
    * Could we layer a real memory safety model on top, and one that was more incrementally adoptable from C++?  
    * Could we have the compile time improvements we hoped for?  
    * Could we build tools to automatically and at-scale migrate from C++ to Carbon?  
  * While we're not 100% done with these, we are relatively close to a resounding "yes" across all of these technical questions.  

{{% /note %}}

---

## We are closing in on clearly answering these questions with "yes"

{{% note %}}

* Present \- What comes next?  
  * Graduating from the experiment  
  * Soon (maybe later this year?) we expect to be reasonably confident in the technical questions that underpinned the experiment. At that point, we're not running a true science experiment any more \-- we will have a clear and reasonably concrete thing.  
  * That doesn't mean we're done though...  
  * We expect to get to where we are fully confident in the technical answers we have developed. But we will still need to evaluate this in terms of popularity, interest, and excitement.  
    * We need to hear from users whether they want to adopt this, or would rather not  
    * If not, we need to understand why, and whether that is something we can fix  

{{% /note %}}

---

## The next stage is _evaluation_

{{% note %}}

* Our next major focus is pivoting from the experimental phase to an evaluation phase. 
* Once we finish with that pivot, we expect to release an 0.1 implementation as the completion of the Carbon science experiment. We will have the core answers that were most fundamentally unknown, and will need to switch our approach to better fit customer evaluation.

{{% /note %}}

---

## Carbon 0.1 will switch the project to _evaluation_

- Working compiler and tools that users can use for _their_ experiments
  - Clang-based C++ compiler and toolchain
  - Support for existing build systems: CMake, Makefiles, Bazel
- Implementation of almost all C++ interop functionality
  - Some newer features missing, but with workarounds and on our roadmap
- Design and potentially some placeholder implementation work on memory safety

{{% note %}}

* We expect to stay in 0.1 while we finish the evaluation:  
  * Completing the implementation of the necessary functionality in the compiler and language to fully address the initial needs of users  
  * Addressing any concerns or feedback  
* We have actually started the very first of these evaluations within Google, where we are starting to sit down with TLs of teams where Carbon might be a particularly effective evolution path for them towards memory safety (and other advantages), and working to understand how it looks to them.  

{{% /note %}}

---

## We want to release 0.1 as soon as it's ready...

## <span class="fragment">Maybe early next year?</span>

{{% note %}}

- We're trying to accelerate towards sufficient implementation to make a 0.1 release reasonable for evaluation
- But we need to have enough implementaiton, design, and documentation in place that it _can_ be evaluated meaningfully.
- We'll keep looking at how we can trim down to the truly minimum viable product, but are generally aiming for early next year.

{{% /note %}}

---

## Beyond evaluation, Carbon 0.2 will target _pilots_

- Contingent on enough positive feedback during evaluation
- And requires addressing enough blockers raised by evaluators
- Target will be limited but real production deployment

{{% note %}}

Provided there is enough positive feedback to continue, we hope to then move into an 0.2 phase of _piloting_ where we are actively working with early users to deploy Carbon in the real world.

{{% /note %}}

---

## Stay with us as we move towards graduation

## Try Carbon out and help with evaluation {.fragment}

---

<div class="r-stretch" style="display: flex; flex-direction: column; justify-content: center">

# Carbon: graduating from the experiment {.title}

</div>
<div class="col-container"><div class="col-4">

#### Chandler Carruth <br/> @chandlerc1024 <br/> chandlerc@{google,gmail}.com

</div><div class="col right">

#### NDC Toronto 2026

</div></div>
<div class="right">

https://chandlerc.blog/slides/2026-ndc-toronto-carbon-update

</div>
