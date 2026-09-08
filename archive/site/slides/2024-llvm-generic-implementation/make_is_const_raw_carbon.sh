#! /bin/bash
cat <<EOF
fn __is_const(T: type) -> bool = "is_const";

fn F() {
  let b0: bool = __is_const([i32; 0]);
EOF

for i in {1..10000000}; do
  echo "  let b$i: bool = __is_const([i32; $i]);"
done

cat <<EOF
}
EOF

