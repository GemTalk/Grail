#!/usr/local/bin/python3
# https://docs.python.org/3/library/stdtypes.html#typeiter
# https://docs.python.org/3/reference/datamodel.html#object.__getitem__
# https://docs.python.org/3/c-api/iterator.html

for i in (1, 2):
    print(i, end=" ")
print()
try: 
    for i, j, k in ((1, 2), (3, 4)):
        pass
except ValueError:
    print('ValueError')

for i, j in ((1, 2), (3, 4)):
    print(i, j, end=" ")
print()
