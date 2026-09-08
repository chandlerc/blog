#! /bin/bash
cat <<EOF
template<typename T> struct is_const {
  static constexpr bool value = __is_const(T);
};

void f() {
  const bool b0 = is_const<int[0]>::value;
EOF

for i in {1..1000000}; do
  echo "  const bool b$i = is_const<int[$i]>::value;"
done

cat <<EOF
}
EOF

