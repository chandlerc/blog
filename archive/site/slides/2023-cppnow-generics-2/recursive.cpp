template<typename T> auto f(T x) -> decltype(f(&x));
struct A {} a;
void g(A a) { f(a); }

