+++
weight = 80
outputs = ["Reveal"]
+++

# Safety annotations erased

## 6th safety ingredient

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

C++ interop:

- Don't want to make assumptions about C++ code that we can't verify that would introduce UB
- Can't use values from safety analysis to instantiate a generic if some callers are not doing that safety analysis, or are doing it in a separate compilation

- More generally, important to us that unsafe code can't violate assumptions to introduce UB in safe code, even if that means giving up some optimizations, for example about aliasing
  

{{% /note %}}