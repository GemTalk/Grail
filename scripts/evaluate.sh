#!/bin/bash

source .setenv

topaz -lq <<EOF
login
level 0
iferr 1 stk
iferr 2 exit 1
run
$1
%
logout
exit 0
EOF
