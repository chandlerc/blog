#! /bin/bash
cat <<EOF
fn __is_const(T: type) -> bool = "is_const";

fn IsConst(T:! type) -> bool {
  return __is_const(T);
};

fn F() {
  let b0: bool = IsConst([i32; 0]);
EOF

for i in {1..1000000}; do
  echo "  let b$i: bool = IsConst([i32; $i]);"
done

cat <<EOF
}
EOF

