+++
weight = 20
outputs = ["Reveal"]
+++

## Hash tables also make a great case study in benchmarking

---

## Benchmarking hash tables for our compiler

- What operations are hottest for the Carbon compiler's use of the table?
  - Abseil's hash table optimizes for lookup, and especially lookup _miss_
  - The compiler is typically either a lookup-_hit_, or an _insert_
  - The Lexer is mostly _inserting_: relatively few uses of each new identifier
- What dimensions do we care about performance over?
  - Only a few key/value pairs are really hot
  - But we want the table to be general purpose
  - Also want our _benchmarks_ to be re-usable for different tables

Code: https://github.com/carbon-language/carbon-lang/blob/trunk/common/map_benchmark.cpp

{{% note %}}
{{% /note %}}

---

```cpp{}
template <typename MapT>
struct MapWrapperImpl {
  using KeyT = typename MapT::key_type;
  using ValueT = typename MapT::mapped_type;
  MapT m;

  auto `BenchInsert`(KeyT k, ValueT v) -> bool {
    auto result = m.insert({k, v});
    return `result.second`;
  }

  auto `BenchLookup`(KeyT k) -> bool {
    auto it = `m.find(k)`;
    if (it == m.end()) { return false; }
    if constexpr (std::is_same_v<ValueT, llvm::StringRef>) {
      return `it->second.size() > 0`;
    } else if constexpr (std::is_pointer_v<ValueT>) {
      return `it->second != nullptr`;
    } else {
      return `it->second != std::numeric_limits<ValueT>::max()`;
    }
  }
```

---

```cpp{}
template <typename MapT>
static void `BM_MapLookupHit(benchmark::State& state)` {
  using MapWrapperT = MapWrapper<MapT>;
  using KT = typename MapWrapperT::KeyT;
  `using VT = typename MapWrapperT::ValueT;`
  MapWrapperT `m`;
  auto [keys, lookup_keys] =
      `GetKeysAndHitKeys<KT>`(`state.range(0)`, `state.range(1)`);
  for (auto k : keys) {
    `m.BenchInsert(k, MakeValue<VT>());`
  }
  ssize_t lookup_keys_size = lookup_keys.size();

  `while` (state.KeepRunningBatch(`lookup_keys_size`)) {
    for (ssize_t i = 0; i < `lookup_keys_size`;) {
      benchmark::DoNotOptimize(`i`);

      bool result = `m.BenchLookup(lookup_keys[i]);`
      CARBON_DCHECK(`result`);
      `i` `+=` static_cast<ssize_t>(`result`);
    }
  }
}
```

{{% note %}}

This is a genuine latency benchmark. We lookup a key in the hashtable and use
the value associated with that key in the critical path of loading the next
iteration's key. We still ensure the keys are always present, and so we
generally expect the data structure branches to be well predicted. But we
vary the keys aggressively to avoid any prediction artifacts from repeatedly
examining the same key.

This latency can be very helpful for understanding a range of data structure
behaviors:

- Many users of hashtables are directly dependent on the latency of this
  operation, and this micro-benchmark will reflect the expected latency for
  them.

- Showing how latency varies across different sizes of table and different
  fractions of the table being accessed (and thus needing space in the cache).

However, it remains an ultimately synthetic and unrepresentative benchmark.
It should primarily be used to understand the relative cost of these
operations between versions of the data structure or between related data
structures.

We vary both the number of entries in the table and the number of distinct
keys used when doing lookups. As the table becomes large, the latter dictates
the fraction of the table that will be accessed and thus the working set size
of the benchmark. Querying the same small number of keys in even a large
table doesn't actually encounter any cache pressure, so only a few of these
benchmarks will show any effects of the caching subsystem.

{{% /note %}}

---

```cpp{}
template <typename MapT>
static void `BM_MapInsertSeq(benchmark::State& state)` {
  using MapWrapperT = MapWrapper<MapT>;
  using KT = typename MapWrapperT::KeyT;
  using VT = typename MapWrapperT::ValueT;
  constexpr ssize_t LookupKeysSize = `1 << 8`;
  auto [keys, lookup_keys] =
      GetKeysAndHitKeys<KT>(`state.range(0)`, LookupKeysSize);

  // ... 
```

---

```cpp{}
  // ...

  // Note that we don't force batches that use all the lookup keys because
  // there's no difference in cache usage by covering all the different lookup
  // keys.
  ssize_t i = 0;
  `for (auto _ : state)` {
    benchmark::DoNotOptimize(i);

    MapWrapperT `m`;
    for (auto `k` : keys) {
      bool inserted = `m.BenchInsert(k, MakeValue<VT>())`;
      CARBON_DCHECK(`inserted`, "Must be a successful insert!");
    }

    // Now insert a final random repeated key.
    bool inserted = `m.BenchInsert(lookup_keys[i], MakeValue2<VT>())`;
    CARBON_DCHECK(`!`inserted, "Must already be in the map!");

    // Rotate through the shuffled keys.
    i = (`i + static_cast<ssize_t>(!inserted)`) `&` (`LookupKeysSize - 1`);
  }

  // ...
```

{{% note %}}

This is an interesting, somewhat specialized benchmark that measures the cost
of inserting a sequence of key/value pairs into a table with no collisions up
to some size and then inserting a colliding key and throwing away the table.

This can give an idea of the cost of building up a map of a particular size,
but without actually using it. Or of algorithms like cycle-detection which
for some reason need an associative container.

It also covers both the insert-into-an-empty-slot code path that isn't
covered elsewhere, and the code path for growing a table to a larger size.

Because this benchmark operates on whole maps, we also compute the number of
probed keys for Carbon's set as that is both a general reflection of the
efficacy of the underlying hash function, and a direct factor that drives the
cost of these operations.

{{% /note %}}

---

## Let's look at a run of these benchmarks

{{% note %}}

Switch to live demo of the benchmark run results, specifically including
performance counters where we can see some of the measurement artifacts
discussed above.

{{% /note %}}

---

## The optimizations here could fill a whole talk...

---

## Key insights about hash tables specifically:

- SwissTable-style (as in Abseil) hash tables have different tradeoffs
- Latency matters _much_ more than quality
  - Probing is _very_ fast due to metadata and groups
- Weaker hashes are (almost always) better
- Shrink your keys and the bytes you cache
- Insertion and growth hadn't been optimized, but impact real use cases
- Hash table hashing != _any other use case for hashing_
  - Want a low-latency, "OK-ish" quality algorithm
  - Can skip some of the key bits for speed
- Benchmark how _your_ code uses hash tables
  - Use that to drive optimizations in your code to use them better

---

## Carbon's hash tables are _very_ fast now

- Significantly out-performs Abseil and other implementations
  - _For our use cases_ -- YMMV
- Many optimizations here have been applied to Abseil as well

But our goal was to highlight benchmarking techniques...
