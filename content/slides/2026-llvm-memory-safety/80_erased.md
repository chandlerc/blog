+++
weight = 80
outputs = ["Reveal"]
+++

# Safety annotations erased

## 6th safety ingredient

{{% note %}}

The last safety ingredient I'm going to talk about today is erasing.

{{% /note %}}

---

## Safety information erased between checking and lowering

- Types and functions with place parameters are checked generically
- Different place arguments result in the same instantiation
- Allows separate compilation and C++ interop

```carbon{}
// Generated code doesn't depend on ``^A``
class HasPtr(^A of i32);
```

{{% note %}}

- Places do not trigger separate instantiations of functions and types.
- Instead, functions and types are checked generically once.
- The safety information that comes from the safety annotations in Carbon source code and the analysis performed in the compiler's checking pass is all erased before the lowering and code generation passes.
- This is important to allow C++ interop:
  - We don't want to make assumptions about C++ code that we can't verify that would introduce undefined behavior
  - And we can't use values from safety analysis to instantiate if some callers are not
    doing that safety analysis, or are doing it in a separate compilation
- More generally, it is very important to us that unsafe code can't violate assumptions to introduce undefined behavior in safe code, even if that means giving up some optimizations, for example about aliasing.

{{% /note %}}