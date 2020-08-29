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

seasons = ['Spring', 'Summer', 'Fall', 'Winter'] # 55
list(enumerate(seasons)) # 56
list(enumerate(seasons, start=1)) # 57

# TODO: eval

# TODO: exec

list(filter(lambda x:x%2, [1, 2, 3])) # 58
list(filter(lambda x:x>0, [-10, 0, 10])) # 59

float() # 60
float(3.14) # 61
float("+1.23") # 62
float("+1.23E5") # 63

# TODO: format

fs = frozenset([1, 2, 3]) # 64
3 in fs # 65
4 in fs # 66
len(fs) # 67

try: # 68
    fs.add(4)
except AttributeError:
    print("AttributeError", end=' ')

class F(): # 69
    yin = "yang"
    e = 2.71

f = F() # 70
getattr(f, "yin") # 71

try: # 72
    getattr(f, "yang")
except AttributeError:
    print("AttributeError", end=' ')

globals() # 73

hasattr(f, "yin") # 74
hasattr(f, "yang") # 75 

hash(1) # 76
hash(1.) # 77

# TODO: help

hex(12648430) # 78
hex(-16) # 79

# TODO: id (?)

# TODO: input (?)

int() # 80
int(1.5) # 81
int("3") # 82
int("0") # 83
int("777", 8) # 84
int("0o777", 8) # 85

d = {'tri': 'ceratops', 'rect': 'angle'} # 86
d['rect'] = 'ify' # 87
len(d) # 88

class Base: # 89
    pass

class Derived(Base): # 90
    pass

b = Base() # 91
d = Derived() # 92
isinstance(d, type(b)) # 93
isinstance(b, type(d)) # 94

b2 = Base() # 95
type(b) == type(b2) # 96

issubclass(Derived, Base) # 97
issubclass(Base, Derived) # 98
issubclass(type(b), type(d)) # 99

vowels = ['a', 'e', 'i', 'o', 'u'] # 100
vowels_iter = iter(vowels) # 101
next(vowels_iter) # 102
next(vowels_iter) # 103
next(vowels_iter) # 104
next(vowels_iter) # 105
next(vowels_iter) # 106
try: # 107
    next(vowels_iter)
except StopIteration:
    print("StopIteration", end=' ')

len([5, 5, 5, 5]) # 108
len({}) # 109
len({5}) # 110

list([1, 2, 3]) # 111

# TODO: locals

list(map(lambda x:x+1, [0, 1, 2])) # 112
list(map(lambda x,y:x+y, [0, 1, 2], [3, 4, 5, 6])) # 113

add = lambda x,y:x+y
add(1, 2)

class C:
    pass

dir(C()) is dir(C) # WRONG??!?
