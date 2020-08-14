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

# "'\\xf6'"
ascii("ö") # 10
# "'G \\xeb \\xea k s f ? r G ? e k s'"
ascii("G ë ê k s f ? r G ? e k s") # 11

bin(3) # 12
bin(-10) # 13

bool(True) # 14
bool([0]) # 15
bool(1) # 16
bool('a') # 17
bool('') # 18
bool([]) # 19
bool(0) # 20
bool() # 21

# bytearray(b'\x00\x00\x00')
bytearray(3) # 22 
# bytearray(b'\x01\x02\x03')
bytearray([1, 2, 3]) # 23
# bytearray(b'')
bytearray() # 24
# bytearray(b'a')
bytearray('a', 'utf-8') # 25

# b'\x00\x00\x00'
bytes(3) # 26
# b'\x01\x02\x03'
bytes([1, 2, 3]) # 27
# b''
bytes() # 28
# b'a'
bytes('a', 'utf-8') # 29