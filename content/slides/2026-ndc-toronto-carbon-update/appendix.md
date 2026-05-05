+++
weight = 20
outputs = ["Reveal"]
+++

---

## How does this temporal safety model differ from Rust?

```rust{}
fn main() {
  let mut x = vec![1i32, 20, 300];
  let p: &i32 = &x[0];
  x.push(4000);
  println!("{}", p;
}
```

{{% note %}}

See
[https://rust.godbolt.org/z/Gbbrnoxa5](https://rust.godbolt.org/z/Gbbrnoxa5)

{{% /note %}}

---

## How does this temporal safety model differ from Rust?

```rust
error[E0502]: cannot borrow ``x`` as mutable because it is also borrowed as immutable
 --> <source>:4:3
  |
3 |   let p: &i32 = &x[0];
  |                  - immutable borrow occurs here
4 |   x.push(4000);
  |   ^^^^^^^^^^^^ mutable borrow occurs here
5 |   println!("{}", p);
  |                  - immutable borrow later used here
```

"shared XOR mutable" borrow rule

- `x.push(4000)` requires an *exclusive* mutable borrow of `x`
  - incompatible with `p` also borrowing from `x`
- Rust requires exclusive access for _all_ writes
- Carbon explicitly marks what needs to be invalidated by a mutation
  - Getting a mutable reference to an element doesn't invalidate anything in Carbon.

{{% note %}}

See
[https://rust.godbolt.org/z/Gbbrnoxa5](https://rust.godbolt.org/z/Gbbrnoxa5)

{{% /note %}}

