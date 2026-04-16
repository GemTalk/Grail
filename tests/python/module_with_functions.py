# Test module for Phase 5b: module-level def → real Smalltalk method.
x = 10

def add(a, b):
    return a + b

def double(n):
    return n * 2

def greet(name):
    return "hello " + name

def use_global():
    return x

def call_other(n):
    return double(n) + 1

result = add(3, 4)
doubled = double(5)
greeting = greet("world")
from_global = use_global()
composed = call_other(6)
