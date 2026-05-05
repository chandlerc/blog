+++
weight = 4
outputs = ["Reveal"]
+++

## C++ interop

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Cpp library "<iostream>";








class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    (Cpp.std.cout << "Profit: ")
        << (self.price * self.count);
  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col">

```carbon{}


// ... continuing from the left side ...


// ... this space ...


// ... intentionally left blank ...









fn Run() {
  var machine: VendingMachine;
  let price: i32 = machine.DispensItem();
  Core.Print(price);
  machine.PrintProfit();
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Cpp library "<iostream>";

inline Cpp #'''
template <typename ...Ts>
auto Print(Ts... args) -> void {
  (std::cout << ... << args) << "\n";
}
'''#;

class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    Cpp.Print("Profit: ",
              self.price * self.count);
  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col">

```carbon{}


// ... continuing from the left side ...


// ... this space ...


// ... intentionally left blank ...









fn Run() {
  var machine: VendingMachine;
  let price: i32 = machine.DispensItem();
  Core.Print(price);
  machine.PrintProfit();
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Cpp library "<iostream>";

inline Cpp #'''
template <typename ...Ts>
auto Print(Ts... args) -> void {
  (std::cout << ... << args) << "\n";
}
'''#;

class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    Cpp.Print("Profit: ",
              self.price * self.count);
  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col">

```carbon{}


// ... continuing from the left side ...


// ... this space ...


// ... intentionally left blank ...









fn Run() {
  var machine: VendingMachine;
  let price: i32 = machine.DispensItem();
  Cpp.Print("Price: ", price);
  machine.PrintProfit();
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Cpp library "<iostream>";

inline Cpp #'''
template <typename ...Ts>
auto Print(Ts... args) -> void {
  (std::cout << ... << args) << "\n";
}
'''#;

base class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    Cpp.Print("Profit: ",
              self.price * self.count);
  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col">

```carbon{}


// ... continuing from the left side ...


// ... this space ...


// ... intentionally left blank ...









fn Run() {
  var machine: VendingMachine;
  let price: i32 = machine.DispensItem();
  Cpp.Print("Price: ", price);
  machine.PrintProfit();
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

---

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Cpp library "<iostream>";

inline Cpp #'''
template <typename ...Ts>
auto Print(Ts... args) -> void {
  (std::cout << ... << args) << "\n";
}
'''#;

base class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    Cpp.Print("Profit: ",
              self.price * self.count);
  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col">

```carbon{}
inline Cpp '''

struct Snack { int price; };

class SnackMachine
    : public Carbon::VendingMachine {
  using Base = Carbon::VendingMachine;

 public:
  SnackMachine()
      : Base(Base::Create(5)) {}

  Snack Vend() {
    return {DispenseItem()};
  }
};
''';

fn Run() {
  var machine: Cpp.SnackMachine;
  let snack: Cpp.Snack = machine.Vend();
  Cpp.Print("Price: ", snack.price);
  machine.PrintProfit();
}
```

</div>
</div>

---

# Even better, [live]!

[live]: https://carbon.compiler-explorer.com/z/EsqbfKK5d

---

## ... and we're back!

{{% note %}}

Ok, so to sum up....

{{% /note %}}
