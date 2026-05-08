+++
weight = 80
outputs = ["Reveal"]
+++

## Bonus benchmarking slides!

---

```cpp{}
template <typename MapT>
static void `BM_MapContainsHit(benchmark::State& state)` {
  using MapWrapperT = MapWrapper<MapT>;
  using KT = typename MapWrapperT::KeyT;
  using VT = typename MapWrapperT::ValueT;
  MapWrapperT m;
  auto [keys, lookup_keys] =
      GetKeysAndHitKeys<KT>(state.range(0), state.range(1));
  for (auto k : keys) {
    m.BenchInsert(k, MakeValue<VT>());
  }
  ssize_t lookup_keys_size = lookup_keys.size();

  while (state.KeepRunningBatch(lookup_keys_size)) {
    for (ssize_t i = 0; i < lookup_keys_size;) {
      benchmark::DoNotOptimize(i);

      bool result = `m.BenchContains(lookup_keys[i])`;
      CARBON_DCHECK(result);
      i += static_cast<ssize_t>(`result`);
    }
  }
}
```

{{% note %}}

Benchmark the minimal latency of checking if a key is contained within a map,
when it *is* definitely in that map. Because this is only really measuring
the *minimal* latency, it is more similar to a throughput benchmark.

While this is structured to observe the latency of testing for presence of a
key, it is important to understand the reality of what this measures. Because
the boolean result testing for whether a key is in a map is fundamentally
provided not by accessing some data, but by branching on data to a control
flow path which sets the boolean to `true` or `false`, the result can be
speculatively provided based on predicting the conditional branch without
waiting for the results of the comparison to become available. And because
this is a small operation and we arrange for all the candidate keys to be
present, that branch *should* be predicted extremely well. The result is that
this measures the un-speculated latency of testing for presence which should
be small or zero. Which is why this is ultimately more similar to a
throughput benchmark.

Because of these measurement oddities, the specific measurements here may not
be very interesting for predicting real-world performance in any way, but
they are useful for comparing how 'cheap' the operation is across changes to
the data structure or between similar data structures with similar
properties.

{{% /note %}}

---

## Bonus optimization slides!

---

```cpp{}
// Checks the given condition, and if it's false, prints a stack, streams the
// error message, then exits. This should be used for unexpected errors, such as
// a bug in the application.
//
// For example:
//   `CARBON_CHECK(is_valid, "Data is not valid!")`;
#define CARBON_CHECK(`condition`, `...`)         \
  (`Carbon::Internal::CheckCondition(true && (condition))`) \
  ? (void)`0` : CARBON_INTERNAL_CHECK(`condition` `__VA_OPT__(, ) __VA_ARGS__`)

// Implementation details:

#define CARBON_INTERNAL_CHECK(condition, ...)      \
  `CARBON_INTERNAL_CHECK_IMPL`##`__VA_OPT__`(`_FORMAT`)( \
      `"CHECK", __FILE__, __LINE__`, `#condition` `__VA_OPT__(, ) __VA_ARGS__`)

#define CARBON_INTERNAL_CHECK_IMPL(`kind`, `file`, `line`, `condition_str`) \
  (Carbon::Internal::`CheckFail<kind, file, line, condition_str, "">()`)

#define CARBON_INTERNAL_CHECK_IMPL_FORMAT(kind, file, line, condition_str,   \
                                          `format_str`, ...)                   \
  (Carbon::Internal::`CheckFail<kind, file, line, condition_str, format_str>(` \
      `__VA_ARGS__`))
```

{{% note %}}

// Implements check messages without any formatted values.
//
// Passes each of the provided components of the message to the template
// parameters of the check failure printing function above, including an empty
// string for the format string. Because there are multiple template arguments,
// the entire call is wrapped in parentheses.

// Implements check messages with a format string and potentially formatted
// values.
//
// Each of the main components is passed as a template arguments, and then any
// formatted values are passed as arguments. Because there are multiple template
// arguments, the entire call is wrapped in parentheses.

// Implements the failure of a check.
//
// Collects all the metadata about the failure to be printed, such as source
// location and stringified condition, and passes those, any format string and
// formatted arguments to the correct implementation macro above.

{{% /note %}}

---

```cpp{}
template <TemplateString Kind, TemplateString File, int Line,
`          TemplateString ConditionStr, TemplateString FormatStr, typename... Ts>`
`[[noreturn, gnu::cold, clang::noinline]]`
auto CheckFail(`Ts&&... values`) -> void {
  `if constexpr (llvm::StringRef(FormatStr).empty())` {
    // Skip the format string rendering if empty. Note that we don't skip it
    // even if there are no values as we want to have consistent handling of
    // ``{}``s in the format string. This case is about when there is no message
    // at all, just the condition.
    `CheckFailImpl(Kind.c_str(), File.c_str(), Line, ConditionStr.c_str(), "")`;
  } else {
    CheckFailImpl(Kind.c_str(), File.c_str(), Line, ConditionStr.c_str(),
                  `llvm::formatv(FormatStr.c_str()`,
                                `ConvertFormatValue(std::forward<Ts>(values))...`)
                      `.str()`);
  }
}
```

{{% note %}}
// Prints a check failure, including rendering any user-provided message using
// a format string.
//
// Most of the parameters are passed as compile-time template strings to avoid
// runtime cost of parameter setup in optimized builds. Each of these are passed
// along to the underlying implementation to include in the final printed
// message.
//
// Any user-provided format string and values are directly passed to
// `llvm::formatv` which handles all of the formatting of output.
{{% /note %}}

---

## Integers and storage

- Carbon interns everything into `ValueStore`s, including integer literals
- The interned handle isn't a pointer but a 32-bit (or smaller) index
  - Tokens embed values, and so lexed values only have 23-bits
- But this is excessively wasteful for ~most integer literals in code
  - They often are smaller than the index itself
  - Accessing requires an indirection into the store
- Solution: embed small integers into a sub-range of the indices

```cpp{}
  // Each bit is either ``T`` for part of the token or ``P`` as part
  // of the available payload that we use for the ID:
  //
  //                           0bTTTT'TTTT'TPPP'PPPP'PPPP'PPPP'PPPP'PPPP
  static_assert(MaxValue    == 0b0000'0000'0011'1111'1111'1111'1111'1111);
  static_assert(ZeroIndexId == 0b1111'1111'1110'0000'0000'0000'0000'0000);
  static_assert(MinValue    == 0b1111'1111'1110'0000'0000'0000'0000'0001);
  static_assert(NoneId      == 0b1000'0000'0000'0000'0000'0000'0000'0000);
```

{{% note %}}

We take advantage of the fact that tokens only have _positive_ integer payloads
-- negation is two tokens. And then we split the token bit-space 3/4 for
embedded values and 1/4 for values outside that range. This is still nearly as
many tokens as we support in the lexer at all.

And non-lexed tokens keep counting downward and so get many more bits.

{{% /note %}}
