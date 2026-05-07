+++
weight = 50
outputs = ["Reveal"]
+++

# Optimizing the compiler

{{% note %}}

Okay, now that we have all these benchmarks, let's dig into some of the
optimizations we've done across the compiler, and how they work.

Just like with the benchmarks, I'll be walking through the source code on a
slide, but all of this is extracted from the actual code in Carbon's public
repository so you can open up the code directly to see these examples in the
larger, working context.

{{% /note %}}

---

## Lexer optimizations (other than a hash table)

- Tail call table dispatch for each byte
- Lexing identifiers:
  - SIMD scanning to find the identifier's extent (sometimes)
  - Targeted guessing of the number of identifiers
  - Optimized hash table insertion
- SIMD scanning of comment line prefixes
- SIMD scanning for newlines

There is a theme here: processing unstructured data typically hinges on careful
use of dispatch and SIMD.

{{% note %}}
TODO: Identify and prepare code snippets for key insights in lexer performance.
{{% /note %}}

---

```cpp{}
using DispatchFunctionT = auto(Lexer& lexer, llvm::StringRef source_text,
`                               ssize_t position) -> void`;

`using DispatchTableT = std::array<DispatchFunctionT*, 256>`;

static constexpr auto MakeDispatchTable() -> DispatchTableT {
  `DispatchTableT table = {};`
  for `(int i = 0; i < 256; ++i)` {
    `table[i] = &DispatchLexError`;
  }

  // ...
```

{{% note %}}

// Build a table of function pointers that we can use to dispatch to the
// correct lexer routine based on the first byte of source text.
//
// While it is tempting to simply use a `switch` on the first byte and
// dispatch with cases into this, in practice that doesn't produce great code.
// There seem to be two issues that are the root cause.
//
// First, there are lots of different values of bytes that dispatch to a
// fairly small set of routines, and then some byte values that dispatch
// differently for each byte. This pattern isn't one that the compiler-based
// lowering of switches works well with -- it tries to balance all the cases,
// and in doing so emits several compares and other control flow rather than a
// simple jump table.
//
// Second, with a `case`, it isn't as obvious how to create a single, uniform
// interface that is effective for *every* byte value, and thus makes for a
// single consistent table-based dispatch. By forcing these to be function
// pointers, we also coerce the code to use a strictly homogeneous structure
// that can form a single dispatch table.
//
// These two actually interact -- the second issue is part of what makes the
// non-table lowering in the first one desirable for many switches and cases.
//
// Ultimately, when table-based dispatch is such an important technique, we
// get better results by taking full control and manually creating the
// dispatch structures.
//
// The functions in this table also use tail-recursion to implement the loop
// of the lexer. This is based on the technique described more fully for any
// kind of byte-stream loop structure here:
// https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html

{{% /note %}}

---

```cpp{}
  // ...

#define CARBON_SYMBOL_TOKEN(TokenName, Spelling) \
  table[(Spelling)[0]] = &DispatchLexSymbolToken;
`#include "toolchain/lex/token_kind.def"`

#define CARBON_ONE_CHAR_SYMBOL_TOKEN(TokenName, Spelling) \
  table[(Spelling)[0]] = &DispatchLexOneCharSymbolToken;
#define CARBON_OPENING_GROUP_SYMBOL_TOKEN(TokenName, Spelling, ClosingName) \
  table[(Spelling)[0]] = &DispatchLexOpeningSymbolToken;
#define CARBON_CLOSING_GROUP_SYMBOL_TOKEN(TokenName, Spelling, OpeningName) \
  table[(Spelling)[0]] = &DispatchLexClosingSymbolToken;
`#include "toolchain/lex/token_kind.def"`

  `table['/'] = &DispatchLexCommentOrSlash`;

  // ...
```

{{% note %}}
{{% /note %}}

---

```cpp{}
  // ...

  `table['_'] = &DispatchLexKeywordOrIdentifier`;
  for (unsigned char c = 'a'; c <= 'z'; ++c) {
    `table[c] = &DispatchLexKeywordOrIdentifier`;
  }
  for (unsigned char c = 'A'; c <= 'Z'; ++c) {
    `table[c] = &DispatchLexKeywordOrIdentifier`;
  }

  for (int i = 0x80; i < 0x100; ++i) {
    `table[i] = &DispatchLexKeywordOrIdentifier`;
  }

  for (unsigned char c = '0'; c <= '9'; ++c) {
    `table[c] = &DispatchLexNumericLiteral`;
  }

  // ...
```

{{% note %}}
{{% /note %}}

---

```cpp{}
  // ...

  table['\''] = &DispatchLexStringLiteral;
  table['"'] = &DispatchLexStringLiteral;
  table['#'] = &DispatchLexHash;

  table[' '] = &DispatchLexHorizontalWhitespace;
  table['\t'] = &DispatchLexHorizontalWhitespace;
  table['\n'] = &DispatchLexVerticalWhitespace;
  `table['\r'] = &DispatchLexCR`;

  return table;
}

`static constexpr DispatchTableT DispatchTable = MakeDispatchTable()`;
```

{{% note %}}
{{% /note %}}

---

```cpp{}
// A set of custom dispatch functions that preselect the symbol token to lex.
#define CARBON_DISPATCH_LEX_SYMBOL_TOKEN(LexMethod)                          \
  `static auto Dispatch##LexMethod##SymbolToken(`                              \
      Lexer& lexer, llvm::StringRef source_text, ssize_t position) -> void { \
    Lexer::LexResult result = `lexer.LexMethod##SymbolToken`(                  \
        source_text,                                                         \
        OneCharTokenKindTable[static_cast<unsigned char>(                    \
            source_text[position])],                                         \
        position);                                                           \
    CARBON_CHECK(result, "Failed to form a token!");                         \
    `[[clang::musttail]]` `return` `DispatchNext(lexer, source_text, position)`;   \
  }
CARBON_DISPATCH_LEX_SYMBOL_TOKEN(`LexOneChar`)
CARBON_DISPATCH_LEX_SYMBOL_TOKEN(`LexOpening`)
CARBON_DISPATCH_LEX_SYMBOL_TOKEN(`LexClosing`)
```

{{% note %}}
{{% /note %}}

---

```cpp{}
static auto DispatchNext(Lexer& lexer, llvm::StringRef source_text,
                         ssize_t position) -> void {
  if (LLVM_LIKELY(`position < static_cast<ssize_t>(source_text.size())`)) {
    // The common case is to tail recurse based on the next character. Note
    // that because this is a must-tail return, this cannot fail to tail-call
    // and will not grow the stack. This is in essence a loop with dynamic
    // tail dispatch to the next stage of the loop.
    `[[clang::musttail]]` `return` `DispatchTable`[static_cast<unsigned char>(
        `source_text[position]`)]`(lexer, source_text, position)`;
  }

  // ...

  // When we finish the source text, stop recursing. We also hint this so that
  // the tail-dispatch is optimized as that's essentially the loop back-edge
  // and this is the loop exit.
  `lexer.LexFileEnd(source_text, position)`;
}
```

{{% note %}}
{{% /note %}}

---

## SIMD scanning for identifier extents

- Based on [SIMD JSON techniques][simd-json] by Geoff Langdale and Daniel Lemire
  - Two 4-bit-indexed in-register look-up-tables (LUTs) for low and high nibbles
  - Each entry in the LUT has 8-bits we can use for different classifications
- LUT entry bits are:
  - bit-0 = 1 for `_`: high `0x5` and low `0xF`
  - bit-1 = 1 for `0-9`: high `0x3` and low `0x0` - `0x9`
  - bit-2 = 1 for `A-O` and `a-o`: high `0x4` or `0x6` and low `0x1` - `0xF`
  - bit-3 = 1 for `P-Z` and 'p-z': high `0x5` or `0x7` and low `0x0` - `0xA`
  - Other bits unusued
- No bits set for a byte means definitively non-ID ASCII character.

[simd-json]: https://arxiv.org/pdf/1902.08318.pdf

{{% note %}}
{{% /note %}}

---

```cpp{}
auto Lexer::LexComment(llvm::StringRef source_text, ssize_t& position) -> void {
  int32_t `comment_start` = position;
  const auto line_info = current_line_info();
  LineIndex line_index = next_line();
  `position` = buffer_.line_infos_.Get(line_index).start;

  constexpr int MaxIndent = 13;
  const int `indent` = line_info.indent;
  const ssize_t first_line_start = line_info.start;
  ssize_t `prefix_size` = indent + (is_valid_after_slashes ? 3 : 2);
  auto skip_to_next_line = [this, indent, &line_index, &position] { /*...*/ };
  if (`CARBON_USE_SIMD` && /* ... */) {
    // ...
  } else {
    while (`position` + `prefix_size` < static_cast<ssize_t>(`source_text.size()`) &&
           memcmp(`source_text.data() + first_line_start`,
                  `source_text.data() + position`, `prefix_size`) == 0) {
      `skip_to_next_line()`;
    }
  }

  `buffer_.AddComment(indent, comment_start, position)`;
  `AdvanceToLine(source_text, position, line_index)`;
}
```

{{% note %}}
  // A very common pattern is a long block of comment lines all with the same
  // indent and comment start. We skip these comment blocks in bulk both for
  // speed and to reduce redundant diagnostics if each line has the same
  // erroneous comment start like `//!`.
  //
  // When we have SIMD support this is even more important for speed, as short
  // indents can be scanned extremely quickly with SIMD and we expect these to
  // be the dominant cases.
  //
  // TODO: We should extend this to 32-byte SIMD on platforms with support.

  // Skip over this line.

    // We're guaranteed to have a line here even on a comment on the last line
    // as we ensure there is an empty line structure at the end of every file.
{{% /note %}}

---

```cpp{}
  // ...
  if (CARBON_USE_SIMD &&
      `position + 16` < static_cast<ssize_t>(source_text.size()) &&
      `indent <= MaxIndent`) {
    auto mask = `PrefixMasks[prefix_size]`;
#if __ARM_NEON
    auto prefix = vld1q_u8(reinterpret_cast<const uint8_t*>(source_text.data() +
    `                                                        first_line_start))`;
    prefix = `vandq_u8(mask, prefix)`;
    do {
      auto `next_prefix` = vld1q_u8(
          reinterpret_cast<const uint8_t*>(`source_text.data() + position`));
      next_prefix = `vandq_u8(mask, next_prefix)`;
      auto compare = `vceqq_u8(prefix, next_prefix)`;
      if (vminvq_u8(compare) == 0) {
        break;
      }

      `skip_to_next_line()`;
    } while (position + 16 < static_cast<ssize_t>(source_text.size()));
#elif __x86_64__
    // ...
```

{{% note %}}
{{% /note %}}

---

```cpp{}
    // ...
    auto mask = PrefixMasks[prefix_size];
#if __ARM_NEON
    // ...
#elif __x86_64__
    auto `prefix` = _mm_loadu_si128(reinterpret_cast<const __m128i*>(
        source_text.data() + first_line_start));
    do {
      auto `next_prefix` = _mm_loadu_si128(
          reinterpret_cast<const __m128i*>(source_text.data() + position));
      auto prefix_diff = `_mm_xor_si128(prefix, next_prefix)`;
      if (!`_mm_test_all_zeros(mask, prefix_diff)`) {
        break;
      }

      `skip_to_next_line()`;
    } while (position + 16 < static_cast<ssize_t>(source_text.size()));
#else
    // ...
```

{{% note %}}
    // Use the current line's prefix as the exemplar to compare against.
    // We don't mask here as we will mask when doing the comparison.

      // Compute the difference between the next line and our exemplar. Again,
      // we don't mask the difference because the comparison below will be
      // masked.

      // If we have any differences (non-zero bits) within the mask, we can't
      // skip the next line too.
{{% /note %}}

---

```cpp{}
auto Lexer::MakeLines(llvm::StringRef source_text) -> void {
  if (source_text.empty()) { /* ... */ return; }

  const char* const text = source_text.data();
  const ssize_t size = source_text.size();
  ssize_t start = 0;
  while (const char* nl = reinterpret_cast<const char*>(
             `memchr(&text[start], '\n', size - start))`) {
    ssize_t nl_index = nl - text;
    `buffer_.line_infos_.Add(LineInfo(start))`;
    `start = nl_index + 1`;
  }
  // The last line ends at the end of the file.
  `buffer_.line_infos_.Add(LineInfo(start))`;

  if (start != size) {
    `buffer_.line_infos_.Add(LineInfo(size))`;
  }

  line_index_ = LineIndex(0);
}
```

{{% note %}}
  // We currently use `memchr` here which typically is well optimized to use
  // SIMD or other significantly faster than byte-wise scanning. We also use
  // carefully selected variables and the `ssize_t` type for performance and
  // code size of this hot loop.
  //
  // Note that the `memchr` approach here works equally well for LF and CR+LF
  // line endings. Either way, it finds the end of the line and the start of the
  // next line. The lexer below will find the CR byte and peek to see the
  // following LF and jump to the next line correctly. However, this approach
  // does *not* support plain CR or LF+CR line endings. Nor does it support
  // vertical tab or other vertical whitespace.
  //
  // TODO: Eventually, we should extend this to have correct fallback support
  // for handling CR, LF+CR, vertical tab, and other esoteric vertical
  // whitespace as line endings. Notably, including *mixtures* of them. This
  // will likely be somewhat tricky as even detecting their absence without
  // performance overhead and without a custom scanner here rather than memchr
  // is likely to be difficult.

  // If the last line wasn't empty, the file ends with an unterminated line.
  // Add an extra blank line so that we never need to handle the special case
  // of being on the last line inside the lexer and needing to not increment
  // to the next line.

  // Now that all the infos are allocated, get a fresh pointer to the first
  // info for use while lexing.
{{% /note %}}

---

## Other optimizations

- Mostly classical things:
  - Make things inline where appropriate
  - Minimize cost from super general tools by optimizing the common cases
- Check and logging inline blocking
- Integers and storage

{{% note %}}
{{% /note %}}

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
