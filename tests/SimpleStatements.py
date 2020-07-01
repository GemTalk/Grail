#!/usr/local/bin/python3
# https://docs.python.org/3/reference/simple_stmts.html

# assignment 
var1 = 1
var2 = var3 = 2

# attribute assignment
class Cls:
    x = 3             # class variable
inst = Cls()
inst.x = inst.x + 1   # writes inst.x as 4 leaving Cls.x as 3

# array assignment 
x = [0, 1]
i = 0
i, x[i] = 1, 2         # i is updated, then x[i] is updated

# assert 
assert True
assert False

# pass 
def f(arg): pass    # a function that does nothing (yet)
class C: pass       # a class with no methods (yet)

# del 
del x
del x, i

# return
def a():
    return

def b():
    return True

# yield
def gen():  # defines a generator function
    yield 123

async def agen(): # defines an asynchronous generator function
    yield 123

# raise
raise RuntimeError("Something bad happened")
raise RuntimeError("Something bad happened") from None

# break
for _ in x:
    break

# continue
for _ in x:
    continue

# import
import foo                 # foo imported and bound locally
from foo import attr       # foo imported and foo.attr bound as attr

# global
global g

# nonlocal
nonlocal x