+++
weight = 1
outputs = ["Reveal"]
+++

# Traditional compiler design

{{% note %}}

Let's start with a quick overview of fairly traditional compiler design that you
might find in a university class ...

{{% /note %}}

---

<div class="diagram-center">
<img alt="The 'Dragon Book' cover"
     src="https://m.media-amazon.com/images/I/51FWXX9KWVL.jpg"
     height="800px">
</div>

{{% note %}}

... or in my original compilers text book, the so-called "dragon book".

{{% /note %}}

---

## Lexer: text → tokens

- Handles text: characters, encodings, unicode, whitespace, comments, ...
- Generally a regular language, and implemented with finite automata
- Produces encapsulated tokens:
  - Keywords
  - Punctuation & operators
  - Identifiers
  - Custom lexed literals: numbers, strings

{{% note %}}

{{% /note %}}

---

## Parser: tokens → AST (Abstract Syntax Tree)

- Handles nesting, structure, and relationships _between_ tokens
- Generally a context-free or context-sensitive language
- Formalized with grammars and/or forms of _pushdown_ automata
  - Common grammar categories: LL, LL(k), LR, LR(k), LALR, ...
  - Loads of theory in this space
- If not using formal grammar, often implemented with a recursive descent parser

{{% note %}}

{{% /note %}}

---

## Semantic analysis: AST → _correct_ AST

- Handles name resolution, type checking, and validating the input program
- Simple languages mostly reject invalid ASTs from the parser
- More complex languages transform and expand the AST
  - Implicit operations
  - Instantiation or metaprogramming
- Most complex languages (C++) also have feedback to change the parser... 😡
- Should be the last stage to detect errors in the program

{{% note %}}

{{% /note %}}

---

## Lowering: AST → IR → ... → machine code

- IR: Intermediate Representation
- Handles modeling and optimizing the _execution_ of the program on a machine
- Often iterative, potentially with successively lower level IRs
- Eventually produces machine code that can run on the target machine
- Shouldn't fail on a valid input
- This is its own whole system below the first phase (LLVM, etc)

{{% note %}}

{{% /note %}}

---

## Historical influences on architecture

- Much of this was formalized around machines & languages from >50 years ago
- Semantic analysis and lowering were fairly straightforward
  - Simple language rules (like C, or B)
  - Minimal optimization in lowering
  - No IRs, just AST → machine code (assembly)
- Focus on lexing, parsing, and ASTs

{{% note %}}

{{% /note %}}

---

## Imagined direct model

```plaintext
---------
| Lexer |
---------


```

---

## Imagined direct model

```plaintext
---------     ----------
| Lexer | --> | Parser |
---------     ----------
        ---^--
        Tokens
```

---

## Imagined direct model

```plaintext
---------     ----------     -------------
| Lexer | --> | Parser | --> | Semantics |
---------     ----------     -------------
        ---^--        ----^-----
        Tokens        Parse Tree
```

---

## Imagined direct model

```plaintext
---------     ----------     -------------     ------------
| Lexer | --> | Parser | --> | Semantics | --> | Lowering |
---------     ----------     -------------     ------------
        ---^--        ----^-----           -^-
        Tokens        Parse Tree           AST
```

{{% note %}}

{{% /note %}}

---

## Incremental & lazy parsing design

```plaintext
                      ----------                     -------------     ------------
                      |        | -- One function  -> |           |     |          |
                      | Parser |                     | Semantics |     | Lowering |
                      |        |                     |           |     |          |
                      ----------                     -------------     ------------
```

---

## Incremental & lazy parsing design

```plaintext
                      ----------                     -------------     ------------
                      |        | -- One function  -> |           | --> |          |
                      | Parser |                     | Semantics |     | Lowering |
                      |        |                     |           |     |          |
                      ----------                     -------------     ------------
```

---

## Incremental & lazy parsing design

```plaintext
                      ----------                     -------------     ------------
                      |        | -- One function  -> |           | --> |          |
                      | Parser | -- Next function -> | Semantics | --> | Lowering |
                      |        |                     |           |     |          |
                      ----------                     -------------     ------------
```

---

## Incremental & lazy parsing design

```plaintext
                      ----------                     -------------     ------------
                      |        | -- One function  -> |           | --> |          |
                      | Parser | -- Next function -> | Semantics | --> | Lowering |
                      |        | -- Next function -> |           | --> |          |
                      ----------                     -------------     ------------
```

---

## Incremental & lazy parsing design

```plaintext
---------             ----------                     -------------     ------------
|       | <- Next --- |        | -- One function  -> |           | --> |          |
| Lexer |             | Parser | -- Next function -> | Semantics | --> | Lowering |
|       |             |        | -- Next function -> |           | --> |          |
---------             ----------                     -------------     ------------
```

---

## Incremental & lazy parsing design

```plaintext
---------             ----------                     -------------     ------------
|       | <- Next --- |        | -- One function  -> |           | --> |          |
| Lexer |             | Parser | -- Next function -> | Semantics | --> | Lowering |
|       | -- Token -> |        | -- Next function -> |           | --> |          |
---------             ----------                     -------------     ------------
```

---

## Designed around "locality" and _streaming_ compilation

- All of this came from an idea of locality _in the parsed code_
  - One token, one AST node at a time
- Enables streaming compilation
- Rooted in the needs of machines where the source code was often larger than
  the machine memory

{{% note %}}

{{% /note %}}

---

## ASTs further exacerbate the cache impact due to pervasive pointers for edges

{{% note %}}

ASTs in the traditional model exacerbate these problems. They tend to be sparse,
pointer-based tree data structures. This is an especially expensive data
structure to operate on.

The common operations are to semantically check each node, which typically
involves looking at the children. And we do this recursively bottom up in many
parsers.

Then we do a depth-first traversal of the tree during lowering.

The result is basically doing multiple traversals of each pointer edge in the
tree, which is about as cache-hostile and poorly locality optimized as it gets.

{{% /note %}}

---

## And real world ASTs are ... massive

<div class="col-container">
<div class="col">

```cpp
#include <vector>

int test_sum(std::vector<int> data) { 
  int result = 0;
  for (const auto& element : data) {
    result += element;
  }
  return result;
}
```

</div>
<div class="col fragment">

<pre style="font-size: 0.4em">
FunctionDecl 0x120d95460 <<stdin>:4:1, line:10:1> line:4:5 test_sum 'int (std::vector<int>)'
|-ParmVarDecl 0x120d95368 <col:14, col:31> col:31 used data 'std::vector<int>':'std::vector<int>' destroyed
`-CompoundStmt 0x120dd5d50 <col:37, line:10:1>
  |-DeclStmt 0x120dcde28 <line:5:3, col:17>
  | `-VarDecl 0x120dcdda0 <col:3, col:16> col:7 used result 'int' cinit
  |   `-IntegerLiteral 0x120dcde08 <col:16> 'int' 0
  |-CXXForRangeStmt 0x120dd5c08 <line:6:3, line:8:3>
  | |-<<<NULL>>>
  | |-DeclStmt 0x120dce1d0 <line:6:30>
  | | `-VarDecl 0x120dcdf98 <col:30> col:30 implicit used __range1 'std::vector<int> &' cinit
  | |   `-DeclRefExpr 0x120dcde40 <col:30> 'std::vector<int>':'std::vector<int>' lvalue ParmVar 0x120d95368 'data' 'std::vector<int>':'std::vector<int>'
  | |-DeclStmt 0x120dd2f90 <col:28>
  | | `-VarDecl 0x120dce268 <col:28> col:28 implicit used __begin1 'iterator':'std::__wrap_iter<int *>' cinit
  | |   `-CXXMemberCallExpr 0x120dce408 <col:28> 'iterator':'std::__wrap_iter<int *>'
  | |     `-MemberExpr 0x120dce3d8 <col:28> '<bound member function type>' .begin 0x120db6c60
  | |       `-DeclRefExpr 0x120dce1e8 <col:28> 'std::vector<int>':'std::vector<int>' lvalue Var 0x120dcdf98 '__range1' 'std::vector<int> &'
  | |-DeclStmt 0x120dd2fa8 <col:28>
  | | `-VarDecl 0x120dce310 <col:28> col:28 implicit used __end1 'iterator':'std::__wrap_iter<int *>' cinit
  | |   `-CXXMemberCallExpr 0x120dd2eb0 <col:28> 'iterator':'std::__wrap_iter<int *>'
  | |     `-MemberExpr 0x120dd2e80 <col:28> '<bound member function type>' .end 0x120db6fd0
  | |       `-DeclRefExpr 0x120dce208 <col:28> 'std::vector<int>':'std::vector<int>' lvalue Var 0x120dcdf98 '__range1' 'std::vector<int> &'
  | |-CXXOperatorCallExpr 0x120dd56c0 <col:28> 'bool' '!=' adl
  | | |-ImplicitCastExpr 0x120dd56a8 <col:28> 'bool (*)(const __wrap_iter<int *> &, const __wrap_iter<int *> &) noexcept' <FunctionToPointerDecay>
  | | | `-DeclRefExpr 0x120dd40f8 <col:28> 'bool (const __wrap_iter<int *> &, const __wrap_iter<int *> &) noexcept' lvalue Function 0x120dd3460 'operator!=' 'bool (const __wrap_iter<int *> &, const __wrap_iter<int *> &) noexcept'
  | | |-ImplicitCastExpr 0x120dd40c8 <col:28> 'const __wrap_iter<int *>':'const std::__wrap_iter<int *>' lvalue <NoOp>
  | | | `-DeclRefExpr 0x120dd2fc0 <col:28> 'iterator':'std::__wrap_iter<int *>' lvalue Var 0x120dce268 '__begin1' 'iterator':'std::__wrap_iter<int *>'
  | | `-ImplicitCastExpr 0x120dd40e0 <col:28> 'const __wrap_iter<int *>':'const std::__wrap_iter<int *>' lvalue <NoOp>
  | |   `-DeclRefExpr 0x120dd2fe0 <col:28> 'iterator':'std::__wrap_iter<int *>' lvalue Var 0x120dce310 '__end1' 'iterator':'std::__wrap_iter<int *>'
  | |-CXXOperatorCallExpr 0x120dd5860 <col:28> '__wrap_iter<int *>':'std::__wrap_iter<int *>' lvalue '++'
  | | |-ImplicitCastExpr 0x120dd5848 <col:28> '__wrap_iter<int *> &(*)() noexcept' <FunctionToPointerDecay>
  | | | `-DeclRefExpr 0x120dd5718 <col:28> '__wrap_iter<int *> &() noexcept' lvalue CXXMethod 0x120dd0528 'operator++' '__wrap_iter<int *> &() noexcept'
  | | `-DeclRefExpr 0x120dd56f8 <col:28> 'iterator':'std::__wrap_iter<int *>' lvalue Var 0x120dce268 '__begin1' 'iterator':'std::__wrap_iter<int *>'
  | |-DeclStmt 0x120dcdf38 <col:8, col:34>
  | | `-VarDecl 0x120dcded0 <col:8, col:28> col:20 used element 'int const &' cinit
  | |   `-ImplicitCastExpr 0x120dd5b98 <col:28> 'int const':'const int' lvalue <NoOp>
  | |     `-CXXOperatorCallExpr 0x120dd5a20 <col:28> 'int':'int' lvalue '*'
  | |       |-ImplicitCastExpr 0x120dd5a08 <col:28> 'reference (*)() const noexcept' <FunctionToPointerDecay>
  | |       | `-DeclRefExpr 0x120dd58f0 <col:28> 'reference () const noexcept' lvalue CXXMethod 0x120dd0070 'operator*' 'reference () const noexcept'
  | |       `-ImplicitCastExpr 0x120dd58d8 <col:28> 'const std::__wrap_iter<int *>' lvalue <NoOp>
  | |         `-DeclRefExpr 0x120dd58b8 <col:28> 'iterator':'std::__wrap_iter<int *>' lvalue Var 0x120dce268 '__begin1' 'iterator':'std::__wrap_iter<int *>'
  | `-CompoundStmt 0x120dd5cf0 <col:36, line:8:3>
  |   `-CompoundAssignOperator 0x120dd5cc0 <line:7:5, col:15> 'int' lvalue '+=' ComputeLHSTy='int' ComputeResultTy='int'
  |     |-DeclRefExpr 0x120dd5c68 <col:5> 'int' lvalue Var 0x120dcdda0 'result' 'int'
  |     `-ImplicitCastExpr 0x120dd5ca8 <col:15> 'int':'int' <LValueToRValue>
  |       `-DeclRefExpr 0x120dd5c88 <col:15> 'int const':'const int' lvalue Var 0x120dcded0 'element' 'int const &'
  `-ReturnStmt 0x120dd5d40 <line:9:3, col:10>
    `-ImplicitCastExpr 0x120dd5d28 <col:10> 'int' <LValueToRValue>
      `-DeclRefExpr 0x120dd5d08 <col:10> 'int' lvalue Var 0x120dcdda0 'result' 'int'
</pre>

</div>
</div>

{{% note %}}

For example, how many AST nodes do you think this tiny function requires? Not
`std::vector` or anything from the header, _JUST_ this function.

It's 8 lines long, probably more than 8 AST nodes.

22 words here, and some of those seem a bit redundant, like `{` and `}` are
separate.

So maybe 20?

Nope, 48 AST nodes. 48.

So, yeah, ASTs are not especially cache friendly.

{{% /note %}}

---

# Do we need a better approach? {.r-fit-text}

{{% note %}}

Ok, so this isn't really the most efficient approach. But it is _really_ natural
to model everything this way.

So that somewhat raises the question -- do we actually need a better model?

{{% /note %}}
