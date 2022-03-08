#!/usr/local/bin/python3
# https://docs.python.org/3/reference/compound_stmts.html

# if
if True: # 1
	pass 

if False: # 2
	pass
else:
	pass

# while
while True: # 3
	pass

while False: # 4
	pass
else:
	pass

# for
for _ in range(10): # 5
	pass

for _ in range(10): # 6
	pass
else:
	pass

# try
try: # 7
    print(1 / 0)
except:
    raise RuntimeError("Something bad happened")

try: # 8
	print(1 / 0)
except ZeroDivisionError:
	raise RuntimeError("Something bad happened")

try: # 9
	print(2 + 2)
except:
	raise RuntimeError("Something bad happened")
finally:
	print(3 * 2)


try: # 10
	print(2 + 2)
except ZeroDivisionError:
	pass 
except:
	raise RuntimeError("Something bad happened")
finally:
	print(3 * 2)




# with
with open('/etc/passwd', 'r') as f: # 11
    pass

with open('/etc/passwd', 'r'): # 12
    pass

# function definitions
def func(arg): # 13
	pass

@func
def decoratedFunc(arg): # 14
	pass

def defaultParameterValueFunc(arg=None): # 15
	pass

def nestedFunc(arg): # 16
	def insideFunc(insideArg):
		pass
	return insideFunc

# class definitions
class Foo: # 17
	pass

class Bar(Foo): # 18
	pass

# coroutines
async def asyncFunc(arg):		# 19
	pass

async def asyncForFunc(arg):	# 20
	async for _ in range(10):
		pass

async def asyncWithFunc(arg):	# 21
	async with open('/etc/passwd', 'r') as f:
		pass

# cpython/Lib/importlib/_bootstrap.py:219
def fun(f, *args, **kwds):		# 22
	return f(*args, **kwds)

# cpython/Lib/importlib/_bootstrap.py:321
if any(arg is not None for arg in []):	# 23
	pass
