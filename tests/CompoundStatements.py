#!/usr/local/bin/python3
# https://docs.python.org/3/reference/compound_stmts.html

# if
if True:
	pass 

if False:
	pass
else:
	pass

# while
while True:
	pass

while False:
	pass
else:
	pass

# for
for _ in range(10):
	pass

for _ in range(10):
	pass
else:
	pass

# try
try:
    print(1 / 0)
except:
    raise RuntimeError("Something bad happened")

# with
with open('/etc/passwd', 'r') as f:
    pass

with open('/etc/passwd', 'r'):
    pass

# function definitions
def func(arg):
	pass

@func
def decoratedFunc(arg):
	pass

def defaultParameterValueFunc(arg=None):
	pass

def nestedFunc(arg):
	def insideFunc(insideArg):
		pass
	return insideFunc

# class definitions
class Foo:
	pass

class Bar(Foo):
	pass

# coroutines
async def asyncFunc(arg):		# 16
	pass

async def asyncForFunc(arg):	# 17
	async for _ in range(10):
		pass

async def asyncWithFunc(arg):	# 18
	async with open('/etc/passwd', 'r') as f:
		pass

# cpython/Lib/importlib/_bootstrap.py:219
def fun(f, *args, **kwds):		# 19
	return f(*args, **kwds)

# cpython/Lib/importlib/_bootstrap.py:321
if any(arg is not None for arg in []):	# 20
	pass
