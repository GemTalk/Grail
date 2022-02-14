#! python

print('Hello world')

if(True):
    print(0, end=' ')

if (True):
    print(1, end=' ')
else:
    print(2, end=' ')

if (False):
    print(3, end=' ')
else:
    print(4, end=' ')

if (False):
    print(5, end=' ')
elif (True):
    print(6, end=' ')
else:
    print(7, end=' ')

if (False):
    print(8, end=' ')
elif (False):
    print(9, end=' ')
else:
    print(10, end=' ')
