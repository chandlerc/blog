+++
weight = 30
outputs = ["Reveal"]
+++

## Compilation benchmarking

---
{{< slide visibility="hidden" >}}

## TODO: why is this hard

{{% note %}}
{{% /note %}}

---

```cpp{}
// An enumerator used to select compilation phases to benchmark.
enum class Phase : uint8_t {
  Lex,
  Parse,
  Check,
};
```

{{% note %}}
{{% /note %}}

---

```cpp{}
// Compute an upper limit on the number of files from the target line count as a
// heuristic. The larger the number of lines in each file, the fewer files we
// can afford to use in the benchmark.
static auto ComputeFileCount(int target_lines) -> int {
#ifndef `NDEBUG`
  // Use a smaller number of files in debug builds where compiles are slower.
  return std::max(1, std::min(`8`, (1024 * 1024) / target_lines));
#else
  return std::max(8, std::min(`128`, `(1024 * 1024) / target_lines`));
#endif
}
```

{{% note %}}
{{% /note %}}

---

```cpp{}
`template <Phase P>`
static auto BM_CompileApiFileDenseDecls(benchmark::State& state) -> void {
  CompileBenchmark bench;
  int target_lines = `state.range(0);`
  int num_files = `ComputeFileCount(target_lines);`
  llvm::SmallVector<std::string> sources;
  sources.reserve(num_files);

  // ...
```

{{% note %}}
{{% /note %}}

---

```cpp{}
  // ...

  // Create a collection of random source files.
  CompileHelper compile_helper;
  double total_bytes = 0.0;
  double total_tokens = 0.0;
  double total_lines = 0.0;
  for (auto _ : llvm::seq(`num_files`)) {
    `sources.push_back(bench.gen().GenApiFileDenseDecls(`
        target_lines, SourceGen::DenseDeclParams{}));
    const auto& source = sources.back();
    total_bytes += `source.size()`;
    total_tokens += `compile_helper.GetTokenizedBuffer(source).size()`;
    total_lines += `llvm::count(source, '\n')`;
  };
  `state.counters["Bytes"]` = benchmark::Counter(total_bytes / sources.size(), /* ... */);
  `state.counters["Tokens"]` = benchmark::Counter(total_tokens / sources.size(), /* ... */);
  `state.counters["Lines"]` = benchmark::Counter(total_lines / sources.size(), /* ... */);

  // Set up the sources as files for compilation.
  llvm::SmallVector<std::string> file_names = `bench.SetUpFiles(sources)`;
  CARBON_CHECK(static_cast<int>(file_names.size()) == num_files);

  // ...
```

{{% note %}}
{{% /note %}}

---

```cpp{}
  // ...

  // We benchmark in batches of files to avoid benchmarking any peculiarities of
  // a single file.
  `while (state.KeepRunningBatch(num_files))` {
    for `(ssize_t i = 0; i < num_files;)` {
      benchmark::DoNotOptimize(`i`);

      bool success = bench.driver()
                         .`RunCommand`({`"compile"`, `PhaseFlag(P)`, `file_names[i]`})
                         .success;
      CARBON_DCHECK(`success`);

      // We use the compilation success to step through the file names,
      // establishing a dependency between each lookup. This doesn't fully allow
      // us to measure latency rather than throughput, but minimizes any skew in
      // measurements from speculating the start of the next compilation.
      `i` += static_cast<ssize_t>(`success`);
    }
  }
}
```

{{% note %}}
{{% /note %}}

---

```cpp{}
// Benchmark from 256-line test cases through 256k line test cases, and for each
// phase of compilation.
BENCHMARK(BM_CompileApiFileDenseDecls<`Phase::Lex`>)
    ->RangeMultiplier(4)
    `->Range(256, static_cast<int64_t>(256 * 1024))`;
BENCHMARK(BM_CompileApiFileDenseDecls<`Phase::Parse`>)
    ->RangeMultiplier(4)
    `->Range(256, static_cast<int64_t>(256 * 1024))`;
BENCHMARK(BM_CompileApiFileDenseDecls<`Phase::Check`>)
    ->RangeMultiplier(4)
    `->Range(256, static_cast<int64_t>(256 * 1024))`;
```

{{% note %}}
{{% /note %}}

---

## Source generation

{{% note %}}

{{% /note %}}

---

```cpp{}
`class SourceGen {`
 public:
  explicit SourceGen(`Language language = Language::Carbon`);

  // Generate an API file with dense classes containing function forward
  // declarations.
  `auto GenApiFileDenseDecls(int target_lines, const DenseDeclParams& params)`
      -> `std::string`;

  auto GetShuffledIdentifiers(int number, int min_length = 1,
                              int max_length = 64, bool uniform = false)
      -> llvm::SmallVector<llvm::StringRef>;
  auto GetShuffledUniqueIdentifiers(int number, int min_length = 4,
                                    int max_length = 64, bool uniform = false)
  `    -> llvm::SmallVector<llvm::StringRef>;`

  auto GetIdentifiers(int number, int min_length = 1, int max_length = 64,
                      bool uniform = false)
      -> llvm::SmallVector<llvm::StringRef>;
  auto GetUniqueIdentifiers(int number, int min_length = 1, int max_length = 64,
                            bool uniform = false)
  `    -> llvm::SmallVector<llvm::StringRef>;`
  // ...
};
```

{{% note %}}

Provides source code generation facilities.

This class works to generate valid but random & meaningless source code in
interesting patterns for benchmarking. It is very incomplete. A high level
set of long-term goals:

- Generate interesting patterns and structures of code that have emerged as
toolchain performance bottlenecks in practice in C++ codebases.
- Generate code that includes most Carbon language features (and whatever
reasonable C++ analogs could be used for comparative purposes):
- Functions
- Classes with class functions, methods, and fields
- Interfaces
- Checked generics and templates
- Nested and unnested impls
- Nested classes
- Inline and out-of-line function and method definitions
- Imports and exports
- API files and impl files.
- Be random but deterministic. The goal is benchmarking and so while this
code should strive for not producing trivially predictable patterns, it
should also strive to be consistent and suitable for benchmarking. Wherever
possible, it should permute the order and content without randomizing the
total count, size, or complexity.

Note that the default and primary generation target is interesting Carbon
source code. We have a best-effort to alternatively generate comparable C++
constructs to the Carbon ones for comparative benchmarking, but there is no
goal to cover all the interesting C++ patterns we might want to benchmark,
and we don't aim for perfectly synthesizing C++ analogs. We can always drop
fidelity for the C++ code path if needed for simplicity.

TODO: There are numerous places where we hard code a fixed quantity. Instead,
we should build a rich but general system to easily encode a discrete
distribution that is sampled. We have a specialized version of this for
identifiers that should be generalized.

{{% /note %}}

---

```cpp
  // Parameters used to generate a file with dense declarations.
  `struct DenseDeclParams {`
    // TODO: Add more parameters to control generating top-level constructs
    // other than class definitions.

    // Parameters used when generating class definitions.
    `ClassParams class_params` = {};

    // Parameters used to guide the selection of types for use in declarations.
    `TypeUseParams type_use_params` = {};
  };
```

{{% note %}}
{{% /note %}}

---

```cpp{}
  `<5>struct FunctionDeclParams {`
    int `<6>max_params = 4`;
  };

  struct MethodDeclParams {
    int max_params = `<9>4`;
  };

  // Parameters used to generate a class in a generated file.
  `<1>struct ClassParams {`
    int `<2>public_function_decls` = 4;
    FunctionDeclParams `<3>public_function_decl_params` = {`<4>.max_params = 8`};

    int `<7>public_method_decls` = 10;
    MethodDeclParams `<8>public_method_decl_params;`

    int `<10>private_function_decls` = 2;
    FunctionDeclParams `<11>private_function_decl_params` = {.max_params = `<12>6`};

    int `<13>private_method_decls` = 8;
    MethodDeclParams `<14>private_method_decl_params` = {.max_params = `<15>6`};

    int `<16>private_field_decls` = 6;
  };
```

{{% note %}}

Currently, this uses a fixed number of each kind of declaration, with
arbitrary defaults chosen. The defaults currently skew towards large
classes with lots of nested declarations.

- TODO: Switch these to distributions based on data.
- TODO: Add support for generating definitions and parameters to control
  them.
- TODO: Add heuristic for how many functions have return types.


{{% /note %}}

---

```cpp{}
  `struct TypeUseParams {`
    struct FixedTypeWeight {
      llvm::StringRef carbon_spelling;
      llvm::StringRef cpp_spelling;
      int weight;
    };

    `llvm::SmallVector<FixedTypeWeight> fixed_type_weights` = {
        `{.carbon_spelling = "bool", .cpp_spelling = "bool", .weight = 25}`,
        `{.carbon_spelling = "i32", .cpp_spelling = "int", .weight = 20}`,
        `{.carbon_spelling = "i32*", .cpp_spelling = "int*", .weight = 5}`,
        // ...

        {.carbon_spelling = `"(bool, i64)"`,
         .cpp_spelling = `"std::pair<bool, std::int64_t>"`,
         .weight = 2},
        {.carbon_spelling = `"(i32, i64*)"`,
         .cpp_spelling = `"std::pair<int, std::int64_t*>"`,
         .weight = 3},
    };

    // The weight for using types declared in the file.
    int `declared_types_weight` = 30;
  };
```

{{% note %}}

Parameters used to select type _uses_, as opposed to definitions.

These govern what distribution of types are used for function parameters,
returns, and fields.

Mainly these provide a coarse histogram of weights to shape the
distribution of different type options, and try to fit that as closely as
possible.

The default weights in the histogram were arbitrarily selected based on
intuition about importance for benchmarking and not based on any
measurement. We arrange for them to sum to 100 so that the weights can be
view as %s of the type uses.

The specific builtin type options used in the weights were also selected
arbitrarily.

- TODO: Improve the set of builtin types and the weighting if real world code
  ends up sharply different.

- TODO: Add a heuristic to make some % of type references via pointers (or
  other compound types).

The weights in the histogram start with a sequence fixed types described
with a Carbon and C++ string, and their associated weight.

These will be randomly shuffled references, and when there are more type
references than declared, include repeated references.

{{% /note %}}

---

```cpp{}
auto SourceGen::GetIdentifiersImpl(int `number`, int `min_length`, int `max_length`,
                                   bool `uniform`,
                                   llvm::function_ref<AppendFn> append) {
  llvm::SmallVector<llvm::StringRef> idents;

  int num_lengths = max_length - min_length + 1;
  auto length_counts =
      `llvm::ArrayRef(IdentifierLengthCounts).slice(min_length - 1, num_lengths)`;
  int count_sum = `uniform` ? `num_lengths` : `Sum(length_counts)`;
  int number_rem = number % count_sum;

  for (int `length` : llvm::seq_inclusive(min_length, max_length)) {
    int scale = `uniform` ? `1` : `IdentifierLengthCounts[length - 1]`;
    int length_count = (`number / count_sum`) * `scale`;
    if (`number_rem > 0`) {
      int rem_adjustment = std::min(scale, number_rem);
      length_count += rem_adjustment;
      number_rem -= rem_adjustment;
    }
    `append(length, length_count, idents)`;
  }

  return idents;
}
```

{{% note %}}
{{% /note %}}

---

```cpp{}
static constexpr std::array<int, 64> IdentifierLengthCounts = [] {
  std::array<int, 64> `ident_length_counts`;
  // 1 characters   [3976]  ███████████████████████████████▊
  `ident_length_counts[0] = 40`;
  // 2 characters   [3724]  █████████████████████████████▊
  `ident_length_counts[1] = 40`;
  // 3 characters   [4173]  █████████████████████████████████▍
  ident_length_counts[2] = 40;
  // 4 characters   [5000]  ████████████████████████████████████████
  ident_length_counts[3] = 50;
  // 5 characters   [1568]  ████████████▌
  ident_length_counts[4] = 20;

  // ...

  // 15 characters  [ 172]  █▍
  // 16 characters  [ 278]  ██▎
  // 17 characters  [ 191]  █▌
  // 18 characters  [ 207]  █▋
  for (int i = 14; i < 18; ++i) { `ident_length_counts[i] = 2`; }
  // 19 - 63 characters are all <100 but non-zero, and we map them to 1 for
  // coverage despite slightly over weighting the tail.
  for (int i = 18; i < 64; ++i) { `ident_length_counts[i] = 1`; }
  return ident_length_counts;
}();
```

{{% note %}}

An array of the counts that should be used for each identifier length to
produce our desired distribution.

Note that the zero-based index corresponds to a 1-based length, so the count
for identifiers of length 1 is at index 0.

For non-uniform distribution, we simulate a distribution roughly based on
the observed histogram of identifier lengths, but smoothed a bit and
reduced to small counts so that we cycle through all the lengths
reasonably quickly. We want sampling of even 10% of NumTokens from this
in a round-robin form to not be skewed overly much. This still inherently
compresses the long tail as we'd rather have coverage even though it
distorts the distribution a bit.

The distribution here comes from a script that analyzes source code run
over a few directories of LLVM. The script renders a visual ascii-art
histogram along with the data for each bucket, and that output is
included in comments above each bucket size below to help visualize the
rough shape we're aiming for.



{{% /note %}}

---

```cpp{}
`auto SourceGen::GetShuffledInts(int number, int min, int max)`
    -> llvm::SmallVector<int> {
  llvm::SmallVector<int> ints;
  ints.reserve(number);

  // Evenly distribute to each value between min and max.
  `int num_values = max - min + 1`;
  for (`int i : llvm::seq_inclusive(min, max)`) {
    `int i_count = number / num_values`;
    `i_count += i < (min + (number % num_values))`;
    `ints.append(i_count, i)`;
  }
  CARBON_CHECK(static_cast<int>(ints.size()) == number);

  `std::shuffle(ints.begin(), ints.end(), rng_)`;
  return ints;
}
```

{{% note %}}

Returns a shuffled sequence of integers in the range [min, max].

The order of the returned integers is random, but each integer in the range
appears the same number of times in the result, with the number of
appearances rounded up for lower numbers and rounded down for higher numbers
in order to exactly produce `number` results.

{{% /note %}}

---

## Let's put it all together and see the result!

{{% note %}}
{{% /note %}}
