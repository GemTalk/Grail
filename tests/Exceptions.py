#!/usr/local/bin/python3

# AssertionError
# Raised when an assert statement fails.
try: 
	assert False
except AssertionError:
	print("AssertionError", end=' ')

# AttributeError
# Raised when an attribute reference or assignment fails. 
try:
	class Class:
		def __init__(self):
			pass
	obj = Class()
	obj.random
except AttributeError:
	print("AttributeError", end=' ')
	
# EOFError
# Raised when the input() function hits an end-of-file condition (EOF) 
# without reading any data.
# TODO

# ImportError
# Raised when the import statement has troubles trying to load a module.
# Also raised when the “from list” in from ... import has a name that cannot be found.
# TODO

# ModuleNotFoundError
# A subclass of ImportError which is raised by import when a module could not be located. 
# It is also raised when None is found in sys.modules.
# TODO

# IndexError
# Raised when a sequence subscript is out of range.
try:
	l = [1, 2, 3]
	l[4]
except IndexError:
	print("IndexError", end=' ')

# KeyError
# Raised when a mapping (dictionary) key is not found in the set of existing keys.
try:
	d = {1:1}
	d[2]
except KeyError:
	print("KeyError", end=' ')

# MemoryError
# TODO

# NameError
# When a name is not found at all, a NameError exception is raised.
try:
    print(undefined)
except NameError:
    print("NameError", end=' ')

# NotImplementedError
# In user defined base classes, abstract methods should 
# raise this exception when they require derived classes 
# to override the method, or while the class is being developed 
# to indicate that the real implementation still needs to be added.
try:
	class Class:
		def __init__(self):
			pass
		def abstract(self):
			raise NotImplementedError("subclass responsibility")
	obj = Class()
	obj.abstract()
except NotImplementedError:
	print("NotImplementedError", end=' ')
# SMALLTALK TODO: NotImplementedError: subclass responsibility

# OSError
# TODO

# RecursionError
# It is raised when the interpreter detects that the 
# maximum recursion depth (see sys.getrecursionlimit()) is exceeded.
try:
	def rec():
		rec()
	rec()
except RecursionError:
	print("RecursionError", end=' ')

# ReferenceError
# TODO

# SyntaxError
# Raised when the parser encounters a syntax error.
# try:
# 	d = {:}
# except SyntaxError:
# 	print("SyntaxError", end=' ')
# SMALLTALK TODO: SyntaxError: invalid syntax

# IndentationError
# TODO

# TabError
# TODO

# SystemError
# TODO

# TypeError
# Raised when an operation or function is applied to 
# an object of inappropriate type.
try:
	abs([])
except TypeError:
	print("TypeError", end=' ')

# UnboundLocalError
# If the current scope is a function scope, 
# and the name refers to a local variable 
# that has not yet been bound to a value 
# at the point where the name is used, 
# an UnboundLocalError exception is raised.
try:
	def ule():
		print(x)
		x = 1
	ule()
except UnboundLocalError:
    print("UnboundLocalError", end=' ')
# SMALLTALK TODO: UnboundLocalError: local variable 'x' referenced before assignment

# UnicodeError
# Raised when a Unicode-related encoding or decoding error occurs.
# TODO

# UnicodeEncodeError
# TODO

# UnicodeDecodeError
# TODO

# UnicodeTranslateError
# TODO

# ValueError
# Raised when an operation or function receives an argument 
# that has the right type but an inappropriate value, 
# and the situation is not described by a 
# more precise exception such as IndexError.
try:
	int("string")
except ValueError:
	print("ValueError", end=' ')
# SMALLTALK TODO: ValueError: invalid literal for int() with base 10: 'string'

# ZeroDivisionError
# Raised when the second argument of a division or modulo operation is zero.
try:
	1 / 0
except ZeroDivisionError:
	print("ZeroDivisionError", end=' ')
try:
	1 % 0
except ZeroDivisionError:
	print("ZeroDivisionError", end=' ')
