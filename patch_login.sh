#!/bin/bash
awk '
/Bespoke Geometric COPPER GIANT Emblem/ {
    print $0
    print "        <div className=\"text-center space-y-3\">"
    print "          <img src=\"/logo.webp\" alt=\"Copper Giant\" className=\"h-12 w-auto mx-auto object-contain brightness-0 invert\" />"
    skip = 1
    next
}
skip && /<div>/ {
    skip = 0
}
!skip { print $0 }
' src/components/auth/MagicLogin.tsx > src/components/auth/MagicLogin.tmp
mv src/components/auth/MagicLogin.tmp src/components/auth/MagicLogin.tsx
