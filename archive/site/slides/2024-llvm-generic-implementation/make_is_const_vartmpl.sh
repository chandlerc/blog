#! /bin/bash
cat <<EOF
template<typename T>
constexpr bool is_const = __is_const(T);

void f() {
  const bool b0 = is_const<int[0]>;
EOF

for i in {1..1000000}; do
  echo "  const bool b$i = is_const<int[$i]>;"
done

cat <<EOF
}
EOF

