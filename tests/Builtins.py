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

callable(True) # 30
callable(0) # 31
callable(int) # 32
callable(callable) # 33

chr(32) # 34
chr(97) # 35

class C: # 36
    def f(cls):
        return 3

class D: # 37
    @classmethod
    def g(cls):
        return 4

try: # 38
    C.f()
except TypeError:
    print("TypeError", end=' ')

D.g() # 39

# TODO: compile

complex() # 40
complex(1) # 41
complex(2, 3) # 42
complex(5j, 7j) # 43

class E: # 44
    def __init__(self):
        self.n = 44

e = E() # 45
delattr(e, 'n') # 46

try: # 47
    e.n
except AttributeError:
    print("AttributeError", end=' ')

dict(one=1, two=2, three=3) # 48
{'one': 1, 'two': 2, 'three': 3} # 49
dict({'three': 3, 'one': 1, 'two': 2}) # 50

# TODO: dir

divmod(5, 5) # 51
divmod(5, 3) # 52
divmod(1.5, 1) # 53
divmod(-1.5, -1) # 54