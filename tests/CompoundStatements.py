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
async def asyncFunc(arg):
	pass

async def asyncForFunc(arg):
	async for _ in range(10):
		pass

async def asyncWithFunc(arg):
	async with open('/etc/passwd', 'r') as f:
		pass