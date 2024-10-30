#! /bin/bash
cat <<EOF
void f() {
  const bool b0 = __is_const(int[0]);
EOF

for i in {1..1000000}; do
  echo "  const bool b$i = __is_const(int[$i]);"
done

cat <<EOF
}
EOF

