#!/bin/bash
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -e 's/orange-950/red-950/g' \
-e 's/orange-900/red-900/g' \
-e 's/orange-800/red-800/g' \
-e 's/orange-700/red-700/g' \
-e 's/orange-600/red-600/g' \
-e 's/orange-500/red-500/g' \
-e 's/orange-400/red-400/g' \
-e 's/orange-300/red-300/g' \
-e 's/orange-200/red-200/g' \
-e 's/orange-100/red-100/g' \
-e 's/orange-50/red-50/g' \
-e 's/#D97736/#FF002C/g'

echo "Done"
