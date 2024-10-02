find . -type f -name "*.ts" | while read tsfile; do
  base="${tsfile%.ts}"
  # Remove the corresponding .js, .d.ts, and .d.ts.map files
  rm  "${base}.js" "${base}.js.map" "${base}.d.ts" "${base}.d.ts.map"
done
