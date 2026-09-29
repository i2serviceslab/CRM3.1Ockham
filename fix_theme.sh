#!/bin/bash
# Reemplazar todos los cyan-* por orange-* en el código
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -e 's/cyan-950/orange-950/g' \
-e 's/cyan-900/orange-900/g' \
-e 's/cyan-800/orange-800/g' \
-e 's/cyan-700/orange-700/g' \
-e 's/cyan-600/orange-600/g' \
-e 's/cyan-500/orange-500/g' \
-e 's/cyan-400/orange-400/g' \
-e 's/cyan-300/orange-300/g' \
-e 's/cyan-200/orange-200/g' \
-e 's/cyan-100/orange-100/g' \
-e 's/cyan-50/orange-50/g'

# Quitar bordes tan redondeados para un look más "industrial/brutalista"
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -e 's/rounded-\[36px\]/rounded-sm/g' \
-e 's/rounded-3xl/rounded-sm/g' \
-e 's/rounded-2xl/rounded-sm/g' \
-e 's/rounded-xl/rounded-sm/g' \
-e 's/rounded-lg/rounded-sm/g'

# No reemplazo rounded-full ciegamente porque arruina avatares y radios, pero sí rounded-md a rounded-sm
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' -e 's/rounded-md/rounded-sm/g'

echo "Done"
