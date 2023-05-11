+++
weight = 90
outputs = ["Reveal"]
+++

# Swift

{{% note %}}

- Swift will be our first example of a language with checked generics.

{{% /note %}}

---

## Swift example: defining a protocol

```swift{1-4}
protocol RNGProtocol {
  `associatedtype Result`
  `mutating func random() -> Result`
}

class BaseRNGClass { ... }

class FancyRNG: BaseRNGClass, RNGProtocol {
  func random() -> Double { ... }
}

func GenericFunction<T: RNGProtocol>(_ r: inout T) -> T.Result {
  return r.random()
}
```

{{% note %}}

- Swift interfaces are called "protocols"
- `<`click`>` `Result` is declared as an associated type
- `<`click`>` Notice how the method declaration in the protocol looks the same
  as in the class. This is common in checked generics.

{{% /note %}}

---

<!-- TODO: Move somewhere more central. -->
<script>
window.addEventListener('load', (loadEvent) => {
  var setIndexes = function() {
    Array.from(document.getElementsByClassName('code-with-fragment-indexes')).forEach(function(codeDiv) {
      indexes = JSON.parse('['+codeDiv.getAttribute('data-fragment-indexes')+']');
      codeDiv.childNodes.forEach(function(outer) {
        outer.childNodes.forEach(function(item) {
          if (item.hasAttribute('data-fragment-index'))
            item.setAttribute('data-fragment-index', indexes.shift());
        });
      });
    });
  };
  if (Reveal.isReady())
    setIndexes();
  else
    Reveal.on('slidechanged', event => { setIndexes() });
});
</script>

## Swift example: a type conforming to a protocol

<div class="code-with-fragment-indexes" data-fragment-indexes="0,1,2,3">

```swift{8-10|1,8-10|6,8-10|3,8-10|2-3,8-10}
protocol `<0>RNGProtocol` {
  associatedtype Result
  mutating func `<2>random`() -> `<3>Result`
}

class `<1>BaseRNGClass` { ... }

class FancyRNG: `<1>BaseRNGClass`, `<0>RNGProtocol` {
  func `<2>random`() -> `<3>Double` { ... }
}

func GenericFunction<T: RNGProtocol>(_ r: inout T) -> T.Result {
  return r.random()
}
```

</div>

{{% note %}}

- Protocols are nominal
- `<`click`>` Protocols listed together with `<`click`>` the base class
- Though this is a
  [regret of Swift designer Jordan Rose](https://belkadan.com/blog/2021/08/Swift-Regret-Protocol-Syntax/?tag=swift-regrets)
  - Would have preferred something more to distinguish these
- `<`click`>` defines `random` member of `RNGProtocol`
- Implementation of a protocol is not separated from the implementation of the
  rest of the type
- As part of typechecking that `FancyRNG` conforms to the `RNGProtocol`
  interface
  - `<`click`>` the compiler infers that the `Result` type has to be `Double`

{{% /note %}}

---

## Swift example: a generic function

```swift{12-14}
protocol RNGProtocol {
  associatedtype Result
  mutating func random() -> Result
}

class BaseRNGClass { ... }

class FancyRNG: BaseRNGClass, RNGProtocol {
  func random() -> Double { ... }
}

func GenericFunction<`T`: `RNGProtocol`>(_ r: inout T) -> `T.Result` {
  return r.random()
}
```

{{% note %}}

- `<click>` The type parameter and `<click>` the constraint on it are listed in
  angle brackets
  - This constraint is used to fully type check the function definition, without
    knowing the value of `T` from a call.
- `<click>` The return type is an associated type

{{% /note %}}

---

## Some things Swift does not (yet) do

- Checked generic variadics are a work in progress
- No specialization
- No parameterization of protocols
- No overlapping conformances
- No non-type generic parameters

{{% note %}}

- (read slide)
- These absenses are intentional, and reflect a focus on usability over
  expressiveness in Swift's checked generic system

{{% /note %}}
