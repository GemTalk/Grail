#!/usr/local/bin/python3

# access global variable in global scope
x = 5
print(x, end=' ') # 5

# access global variable in local scope
def foo():
    print(x, end=' ')
    x = 2
    return x

y = foo() # 5

# create local variable in local scope
def bar():
    x = 6
    print(x, end=' ')
    return x

z = bar() # 6
print(x, end=' ') # 5

# modify global variable in local scope 
# def rum():
#     global x
#     x = x + 2
#     print(x, end=' ')
#     return x

# w = rum() # 7
# print(x, end=' ') # 7

# # nonlocal
# def outer():
#     var = "local"

#     def inner():
#         nonlocal var
#         var = "nonlocal"

#     print(var, end=' ') # local
#     inner()
#     print(var, end=' ') # nonlocal
#     return var

# v = outer()

# def fa():
#     x = 0
#     def fSet(y):
#         nonlocal x
#         x = y
#     def fGet():
#         return x
#     return (fSet, fGet)

# set1, get1 = fa()
# set2, get2 = fa()
# set1(3)
# set2(4)
# print(get1(), get2(), end=' ')
