#include <vector>
#include <map>
#include <optional>
#include <iostream>
#include <cassert>

enum Op {
  NotLambda, // ![]{}, aka 'false', the basis of all our numbers

  Unary_Paren,
  Unary_Minus,
  Unary_Compl,
  Unary_Last = Unary_Compl,

  Binary_Times,
  Binary_Divide,
  Binary_Modulo,
  Binary_Plus,
  Binary_Minus,
  Binary_Shl,
  Binary_Shr,
  Binary_Bitand,
  Binary_Xor,
  Binary_Bitor,
  Binary_Last = Binary_Bitor
};

const char *symbol(Op op) {
  switch (op) {
  case NotLambda: return "![]{}";
  case Unary_Paren: return "()";
  case Unary_Minus: return "-";
  case Unary_Compl: return "~";
  case Binary_Times: return "*";
  case Binary_Divide: return "/";
  case Binary_Modulo: return "%";
  case Binary_Plus: return "+";
  case Binary_Minus: return "-";
  case Binary_Shl: return "<<";
  case Binary_Shr: return ">>";
  case Binary_Bitand: return "&";
  case Binary_Xor: return "^";
  case Binary_Bitor: return "|";
  }
}

int precedence(Op op) {
  if (op <= Unary_Last) return 7;
  if (op <= Binary_Modulo) return 6;
  if (op <= Binary_Minus) return 5;
  if (op <= Binary_Shr) return 4;
  if (op == Binary_Bitand) return 3;
  if (op == Binary_Xor) return 2;
  return 1;
}

int length(Op op) {
  if (op == NotLambda) return 5;
  if (op == Unary_Paren || op == Binary_Shl || op == Binary_Shr) return 2;
  return 1;
}

int operands(Op op) {
  if (op == NotLambda) return 0;
  if (op <= Unary_Last) return 1;
  return 2;
}

struct Expr {
  Op op : 4;
  unsigned length : 12;
  unsigned a;
  unsigned b;
  int value;
};

int length(Op op, Expr lhs, Expr rhs) {
  int ops = operands(op);
  int len = length(op);
  if (ops >= 1) len += lhs.length;
  if (ops >= 2) len += rhs.length;
  return len;
}

std::optional<int> eval(Op op, Expr lhs) {
  if (op != Unary_Paren && precedence(lhs.op) < precedence(op))
    return std::nullopt;
  switch (op) {
  case Unary_Paren:
    return lhs.value;
  case Unary_Minus:
    if (lhs.value == INT_MIN)
      return std::nullopt;
    return -lhs.value;
  case Unary_Compl:
    return ~lhs.value;
  default:
    assert(false);
  }
}

std::optional<int> eval(Op op, Expr lhs, Expr rhs) {
  if (precedence(lhs.op) < precedence(op))
    return std::nullopt;
  if (precedence(rhs.op) <= precedence(op))
    return std::nullopt;
  int v;
  switch (op) {
  case Binary_Times:
    if (__builtin_smul_overflow(lhs.value, rhs.value, &v))
      return std::nullopt;
    return v;
  case Binary_Divide:
    if (!rhs.value || (lhs.value == INT_MIN && rhs.value == -1))
      return std::nullopt;
   return lhs.value / rhs.value;
  case Binary_Modulo:
    if (!rhs.value || (lhs.value == INT_MIN && rhs.value == -1))
      return std::nullopt;
   return lhs.value % rhs.value;
  case Binary_Plus:
    if (__builtin_sadd_overflow(lhs.value, rhs.value, &v))
      return std::nullopt;
    return v;
  case Binary_Minus:
    if (__builtin_ssub_overflow(lhs.value, rhs.value, &v))
      return std::nullopt;
    return v;
  case Binary_Shl:
    if (0 <= rhs.value && rhs.value < 32 && lhs.value >= 0 &&
        ((unsigned)lhs.value << rhs.value) >> rhs.value == lhs.value)
      return lhs.value << rhs.value;
    return std::nullopt;
  case Binary_Shr:
    if (0 <= rhs.value && rhs.value < 32 && lhs.value >= 0)
      return lhs.value >> rhs.value;
    return std::nullopt;
  case Binary_Bitand:
    return lhs.value & rhs.value;
  case Binary_Xor:
    return lhs.value ^ rhs.value;
  case Binary_Bitor:
    return lhs.value | rhs.value;
  default:
    assert(false);
  }
}

void print(const std::vector<Expr> &exprs, unsigned id) {
  Expr e = exprs[id];

  if (e.op == Unary_Paren) {
    std::cout << "("; print(exprs, e.a); std::cout << ")";
    return;
  }

  if (e.op > Unary_Last)
    print(exprs, e.a);
  std::cout << symbol(e.op);
  if (e.op > Unary_Last)
    print(exprs, e.b);
  else if (e.op > Unary_Paren)
    print(exprs, e.a);
}

void search(int min, int max) {
  std::vector<Expr> exprs;
  exprs.push_back({NotLambda, 5, 0, 0, 0}); // false

  struct Best { unsigned id : 29; unsigned prec : 3; };
  std::map<uint32_t, Best> best;

  int remaining = max - min + 1;
  int first_missing_pos = 0, first_missing_neg = 0;

  auto Add = [&](Op op, int len, unsigned lhs, unsigned rhs, int val) {
    auto &b = best[(uint32_t)val];
    if (precedence(op) > b.prec) {
      exprs.push_back({op, (unsigned)len, lhs, rhs, val});
      if (!b.id) {
        b.id = exprs.size() - 1;
        if (min <= val && val <= max)
          --remaining;
      }
      b.prec = precedence(op);
    }
    if (val == first_missing_pos) {
      while (best.contains(++first_missing_pos)) {}
    }
    if (val == first_missing_neg) {
      while (best.contains(--first_missing_neg)) {}
    }
  };

  std::vector<unsigned> first_of_length;
  first_of_length.resize(6);
  for (int length = 6; remaining; ++length) {
    std::cout << "considering length " << length << ", " << exprs.size()
              << " exprs so far, covering (" << first_missing_neg << ", "
              << first_missing_pos << ")" << std::endl;

    assert(first_of_length.size() == length);
    first_of_length.push_back(exprs.size());

    for (unsigned opv = Unary_Paren; opv <= Unary_Last; ++opv) {
      Op op = (Op)opv;
      int lhs_len = length - ::length(op);
      for (unsigned lhs = first_of_length[lhs_len],
                    lhs_max = first_of_length[lhs_len + 1];
           lhs != lhs_max; ++lhs) {
        // FIXME: Track if this relies on UB.
        Expr lhse = exprs[lhs];
        //std::cout << symbol(op) << " "; print(exprs, lhs); std::cout << " expected to have length " << length << " (" << lhs_len << " lhs for lhs id " << lhs << " plus " << ::length(op) << " for " << symbol(op) << ")" << std::endl;
        assert(length == ::length(op, lhse, {}));
        if (auto v = eval(op, lhse))
          Add(op, length, lhs, 0, *v);
      }
    }
    for (unsigned opv = Binary_Times; opv <= Binary_Last; ++opv) {
      Op op = (Op)opv;
      for (int lhs_len = 5, max_lhs_len = length - ::length(op) - 5;
           lhs_len < max_lhs_len; ++lhs_len) {
        int rhs_len = length - lhs_len - ::length(op);
        for (unsigned lhs = first_of_length[lhs_len],
                      lhs_max = first_of_length[lhs_len + 1];
             lhs != lhs_max; ++lhs) {
          for (unsigned rhs = first_of_length[rhs_len],
                        rhs_max = first_of_length[rhs_len + 1];
               rhs != rhs_max; ++rhs) {
            // FIXME: Track if this relies on UB.
            Expr lhse = exprs[lhs];
            Expr rhse = exprs[rhs];
            //std::cout << symbol(op) << " "; print(exprs, lhs); std::cout << " expected to have length " << length << " (" << lhs_len << " lhs for lhs id " << lhs << " plus " << ::length(op) << " for " << symbol(op) << ")" << std::endl;
            assert(length == ::length(op, lhse, rhse));
            if (auto v = eval(op, lhse, rhse))
              Add(op, length, lhs, rhs, *v);
          }
        }
      }
    }
  }

  for (int x = min; x <= max; ++x) {
    //std::cout << "best for " << x << " is ";
    std::cout << "  ";
    if (unsigned id = best[(uint32_t)x].id)
      print(exprs, id);
    else
      std::cout << "(none)";
    std::cout << "\n";
  }
}

int main(int argc, char **argv) {
  if (argc > 2)
    search(atoi(argv[1]), atoi(argv[2]));
}
