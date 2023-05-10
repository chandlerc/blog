+++
weight = 6
outputs = ["Reveal"]
+++

## Data-oriented parsing!

{{% note %}}

{{% /note %}}

---

## Challenge: how to represent a _tree_

- Linearize the tree into an array based on expected iteration
  - Makes the common _traversal_ a linear walk
  - Makes the hot edges between nodes be adjacency, breaking dependency chain
  - Postorder traversal ends up being the most useful
- Force 1:1 correspondence to tokens
  - Simpler allocation
  - A single edge to a token is always sufficient, no ranges, etc.
- Leverage introducers to ensure the traversal "brackets" constructs
- Result ends up being essentially a stack machine for _observing_ the parsed structure

{{% note %}}

{{% /note %}}

---

```carbon
var x: i32 = y + 1;
// TokenizedBuffer:
//     --------
// 1)  | var  |
//     --------
// 2)  | x    |
//     --------
// 3)  | :    |
//     --------
// 4)  | i32  |
//     --------
// 5)  | =    |
//     --------
// 6)  | y    |
//     --------
// 7)  | +    |
//     --------
// 8)  | 1    |
//     --------
// 9)  | ;    |
//     --------
```

{{% note %}}

{{% /note %}}

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:
//     --------
// 1)  | var  |
//     --------
// 2)  | x    |
//     --------
// 3)  | :    |
//     --------
// 4)  | i32  |
//     --------
// 5)  | =    |
//     --------
// 6)  | y    |
//     --------
// 7)  | +    |                                 ( y )     ( 1 )
//     --------                                    \__   __/
// 8)  | 1    |                                      ( + )
//     --------
// 9)  | ;    |
//     --------
                     var    x    :    i32    =    y    +    1    ;
```

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:
//     --------
// 1)  | var  |
//     --------
// 2)  | x    |
//     --------
// 3)  | :    |
//     --------
// 4)  | i32  |
//     --------
// 5)  | =    |
//     --------
// 6)  | y    |
//     --------
// 7)  | +    |           ( x )     ( i32 )     ( y )     ( 1 )
//     --------              \__   __/             \__   __/
// 8)  | 1    |                ( : )                 ( + )
//     --------
// 9)  | ;    |
//     --------
                     var    x    :    i32    =    y    +    1    ;
```

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:
//     --------
// 1)  | var  |
//     --------
// 2)  | x    |
//     --------
// 3)  | :    |
//     --------
// 4)  | i32  |
//     --------
// 5)  | =    |
//     --------
// 6)  | y    |
//     --------
// 7)  | +    |           ( x )     ( i32 )     ( y )     ( 1 )
//     --------              \__   __/             \__   __/
// 8)  | 1    |    ( var )     ( : )       ( = )     ( + )
//     --------        \__________\___________\_________\______
// 9)  | ;    |                                                ( ; )
//     --------
                     var    x    :    i32    =    y    +    1    ;
```

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:
//     --------
// 1)  | var  |
//     --------
// 2)  | x    |
//     --------
// 3)  | :    |
//     --------
// 4)  | i32  |
//     --------
// 5)  | =    |
//     --------
// 6)  | y    |
//     --------
// 7)  | +    |           ( `<2>x` )     ( `<3>i32` )     ( `<6>y` )     ( `<7>1` )
//     --------              \__   __/             \__   __/
// 8)  | 1    |    ( `<1>var` )     ( `<4>:` )       ( `<5>=` )     ( `<8>+` )
//     --------        \__________\___________\_________\______
// 9)  | ;    |                                                ( `<9>;` )
//     --------
                     var    x    :    i32    =    y    +    1    ;
```

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:
//     --------
// 1)  | var  |    ( var )
//     --------       |
// 2)  | x    |       |   ( x )
//     --------       |     |
// 3)  | :    |       |     |       ( i32 )
//     --------       |      \__   __/
// 4)  | i32  |       |        ( : )
//     --------       |          |
// 5)  | =    |       |          |         ( = )
//     --------       |          |           |
// 6)  | y    |       |          |           |  ( y )
//     --------       |          |           |    |
// 7)  | +    |       |          |           |    |       ( 1 )
//     --------       |          |           |     \__   __/
// 8)  | 1    |       |          |           |       ( + )
//     --------        \__________\___________\_________\______
// 9)  | ;    |                                                ( ; )
//     --------
                     var    x    :    i32    =    y    +    1    ;
```

---

```carbon
                     var    x    :    i32    =    y    +    1    ;
// TokenizedBuffer:                                                   ParseTree:
//     --------                                                        --------
// 1)  | var  |    ( `<1>var` )                                             | `<1>var`  |
//     --------       |                                                --------
// 2)  | x    |       |   ( `<2>x` )                                        | `<2>x`    |
//     --------       |     |                                          --------
// 3)  | :    |       |     |       ( `<3>i32` )                            | `<3>i32`  |
//     --------       |      \__   __/                                 --------
// 4)  | i32  |       |        ( `<4>:` )                                   | `<4>:`    |
//     --------       |          |                                     --------
// 5)  | =    |       |          |         ( `<5>=` )                       | `<5>=`    |
//     --------       |          |           |                         --------
// 6)  | y    |       |          |           |  ( `<6>y` )                  | `<6>y`    |
//     --------       |          |           |    |                    --------
// 7)  | +    |       |          |           |    |       ( `<7>1` )        | `<7>1`    |
//     --------       |          |           |     \__   __/           --------
// 8)  | 1    |       |          |           |       ( `<8>+` )             | `<8>+`    |
//     --------        \__________\___________\_________\______        --------
// 9)  | ;    |                                                ( `<9>;` )   | `<9>;`    |
//     --------                                                        --------
                     var    x    :    i32    =    y    +    1    ;
```

{{% note %}}

{{% /note %}}

---

## Parse tree implementation: a guided tour, live!

{{% note %}}

{{% /note %}}

---

## How does the parser build the tree?

- Technically a recursive descent parser
- Faces a classic problem -- deep recursion exhausting the call stack
  - C++ and Clang have this problem as well
  - Has led to a number of "exciting" tricks to work around it
  - Especially problematic for library usage of the compiler
- Carbon creates a dedicated stack data structure for its parser
  - Turns the parse into a "normal" state machine without recursive calls

{{% note %}}

{{% /note %}}

---

## Parser implementation: more live tour!

{{% note %}}

{{% /note %}}
