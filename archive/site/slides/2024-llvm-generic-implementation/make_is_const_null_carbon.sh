#! /bin/bash
cat <<EOF
fn F() {
  let b0: bool = false;
EOF

for i in {1..1000000}; do
  echo "  let b$i: bool = false;"
done

cat <<EOF
}
EOF

