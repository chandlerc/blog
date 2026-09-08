#! /bin/bash
cat <<EOF
void f() {
  const bool b0 = false;
EOF

for i in {1..1000000}; do
  echo "  const bool b$i = false;"
done

cat <<EOF
}
EOF

