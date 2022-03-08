#!/usr/local/bin/python3
# https://docs.python.org/3/reference/simple_stmts.html

# assignment 
var1 = 1 # 1
var2 = var3 = 2 # 2

# attribute assignment
class Cls: # 3
    x = 3             # class variable
inst = Cls() # 4
inst.x = inst.x + 1  # 5 # writes inst.x as 4 leaving Cls.x as 3

# array assignment 
x = [0, 1] # 6
i = 0 # 7
i, x[i] = 1, 2 # 8         # i is updated, then x[i] is updated

# assert 
assert True # 9
assert False # 10
assert False, "Assert failed" # 11

# pass 
def f(arg): pass  # 12  # a function that does nothing (yet)
class C: pass  # 13     # a class with no methods (yet)

# del 
del x # 14
del x, i # 15

# return
def a(): # 16
    return

def b(): # 17
    return True

# yield
def gen(): # 18 # defines a generator function
    yield 123

async def agen(): #19 # defines an asynchronous generator function
    yield 123

# raise
raise RuntimeError # 20
raise RuntimeError("Something bad happened") # 21
raise RuntimeError("Something bad happened") from None # 22
raise RuntimeError("Something bad happened") from RuntimeError("Caused by me") # 23


# break
for _ in x: # 24
    break

# continue
for _ in x: # 25
    continue

# import
import foo      # 26           # foo imported and bound locally
from foo import attr   # 27    # foo imported and foo.attr bound as attr

# global
global g # 28

# nonlocal
nonlocal x # 29