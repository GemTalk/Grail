#!/usr/local/bin/python3
# https://docs.python.org/3.7/library/functions.html

abs(-1)     # 1

print('hello', 'world', sep=',')     # 2

import noSuchModule     # 3

def _load_module_shim(self, fullname):          # 4
    pass
load_module = classmethod(_load_module_shim)    # 5

all([True, True, False]) # 6
all([True, True, True]) # 7

any([False, False, True]) # 8
any([False, False, False]) # 9