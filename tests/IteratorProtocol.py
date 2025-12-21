#!/usr/local/bin/python3
# Test Python iterator protocol
# https://docs.python.org/3/library/stdtypes.html#iterator-types
# https://docs.python.org/3/glossary.html#term-iterator

print("=== Testing Iterator Protocol ===")

# Test 1: iter() creates distinct iterator types
print("\n--- Test 1: Iterator Types ---")
lst = [1, 2, 3]
tpl = (1, 2, 3)
s = "abc"
r = range(3)

lst_iter = iter(lst)
tpl_iter = iter(tpl)
str_iter = iter(s)
rng_iter = iter(r)

print("list iterator type:", type(lst_iter).__name__)
print("tuple iterator type:", type(tpl_iter).__name__)
print("str iterator type:", type(str_iter).__name__)
print("range iterator type:", type(rng_iter).__name__)

# Test 2: Iterators have __iter__ and __next__
print("\n--- Test 2: Iterator Methods ---")
print("list_iterator has __iter__:", hasattr(lst_iter, '__iter__'))
print("list_iterator has __next__:", hasattr(lst_iter, '__next__'))
print("list_iterator.__iter__() returns self:", lst_iter.__iter__() is lst_iter)

# Test 3: Collections are iterable but not iterators
print("\n--- Test 3: Collections vs Iterators ---")
print("list has __iter__:", hasattr(lst, '__iter__'))
print("list has __next__:", hasattr(lst, '__next__'))

# Test 4: Basic iteration with next()
print("\n--- Test 4: Basic Iteration ---")
it = iter([10, 20, 30])
print("next():", next(it))
print("next():", next(it))
print("next():", next(it))
try:
    next(it)
    print("ERROR: Should have raised StopIteration")
except StopIteration:
    print("StopIteration raised correctly")

# Test 5: Multiple independent iterators
print("\n--- Test 5: Independent Iterators ---")
lst = [1, 2, 3]
it1 = iter(lst)
it2 = iter(lst)
print("First from it1:", next(it1))
print("First from it2:", next(it2))
print("Second from it1:", next(it1))
print("it1 and it2 are different:", it1 is not it2)

# Test 6: Tuple iterator
print("\n--- Test 6: Tuple Iterator ---")
tpl = (10, 20, 30)
it = iter(tpl)
print("Tuple iteration:", next(it), next(it), next(it))
try:
    next(it)
except StopIteration:
    print("StopIteration raised")

# Test 7: String iterator
print("\n--- Test 7: String Iterator ---")
s = "hello"
it = iter(s)
print("String iteration:", next(it), next(it), next(it), next(it), next(it))
try:
    next(it)
except StopIteration:
    print("StopIteration raised")

# Test 8: Range iterator
print("\n--- Test 8: Range Iterator ---")
r = range(5, 8)
it = iter(r)
print("Range iteration:", next(it), next(it), next(it))
try:
    next(it)
except StopIteration:
    print("StopIteration raised")

# Test 9: for loop uses iterator protocol
print("\n--- Test 9: For Loop ---")
print("List:", end=" ")
for x in [1, 2, 3]:
    print(x, end=" ")
print()

print("Tuple:", end=" ")
for x in (4, 5, 6):
    print(x, end=" ")
print()

print("String:", end=" ")
for c in "abc":
    print(c, end=" ")
print()

print("Range:", end=" ")
for i in range(3):
    print(i, end=" ")
print()

# Test 10: Iterator exhaustion
print("\n--- Test 10: Iterator Exhaustion ---")
it = iter([1, 2])
print("First pass:", list([next(it), next(it)]))
try:
    next(it)
    print("ERROR: Should be exhausted")
except StopIteration:
    print("Iterator exhausted")
try:
    next(it)
    print("ERROR: Should still be exhausted")
except StopIteration:
    print("Still exhausted")

print("\n=== All Iterator Protocol Tests Complete ===")

