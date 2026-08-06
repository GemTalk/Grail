#!/bin/bash -e

topaz -lq << EOF
set user SystemUser pass swordfish
login
send CharacterCollection enableUnicodeComparisonMode
commit
logout
exit 
EOF
