+++
weight = 3
outputs = ["Reveal"]
+++

<div class="col-container" style="flex: auto; flex-flow: row wrap">
<div class="col">

```carbon{}
import Core library "io";








class VendingMachine {
  fn Create(price: i32) -> Self {
    return {.price = price, .count = 0};
  }
  fn DispenseItem(ref self) -> i32 {
    ++self.count;
    return self.price;
  }
  fn PrintProfit(self) {
    Core.Print(self.price * self.count);

  }
  private var price: i32;
  private var count: i32;
}
```

</div>
<div class="col fragment">

```carbon{}


// ... continuing from the left side ...


// ... this space ...


// ... intentionally left blank ...









fn Run() {
  var machine: VendingMachine;
  let item: i32 = machine.DispensItem();
  Core.Print(item);
  machine.PrintProfit();
}
```

</div>
</div>

{{% note %}}

{{% /note %}}

