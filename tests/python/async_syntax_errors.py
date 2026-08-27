"""Parse-time SyntaxErrors for misplaced async constructs.

CPython raises these from the compiler's symbol pass, not the grammar:
``yield from`` inside an async function, a valued ``return`` in an async
generator, ``await`` / ``async for`` / ``async with`` / an async
comprehension outside an async scope, ``await await x`` (await's operand
is a power expression), and a keyword as an import alias.  Grail's parser
accepted every one of them and compiled working code; the placement walk
after the parse now refuses them, with CPython's wording for the two
messages test_asyncgen regex-matches.

The scope attribution follows evaluation time, which the legal side pins
down: a generator expression is an async-permissive scope of its own (PEP
530 -- ``await`` and ``async for`` are fine there even inside a sync
def), a def's decorators and parameter defaults belong to the ENCLOSING
scope, a nested sync def resets the colour, and a bare ``return`` in an
async generator stays legal.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def raises(name, src, fragment):
    try:
        compile(src, '<test>', 'exec')
        RESULTS[name] = 'compiled'
    except SyntaxError as exc:
        RESULTS[name] = (fragment in str(exc)) or 'msg: %s' % exc


def compiles(name, src):
    try:
        compile(src, '<test>', 'exec')
        RESULTS[name] = True
    except SyntaxError as exc:
        RESULTS[name] = 'raised SyntaxError: %s' % exc


# -- the five AsyncGenSyntaxTest shapes: exact CPython wording ----------

raises('yield_from_in_async_def',
       'async def foo():\n yield from []',
       "'yield from' inside async function")

raises('yield_from_after_await',
       'async def foo():\n await abc\n yield from []',
       "'yield from' inside async function")

raises('return_value_in_async_gen',
       'async def foo():\n yield\n return 123',
       "'return' with value in async generator")

raises('return_value_dead_yield_still_makes_async_gen',
       'async def foo():\n if 0:\n  yield\n return 12',
       "'return' with value in async generator")

# -- placement refusals (wording free; CPython's checked fragments) -----

raises('await_at_module_level',
       'await abc',
       "'await' outside function")

raises('await_in_sync_def',
       'def foo():\n await abc',
       "'await' outside async function")

raises('await_in_lambda_inside_async_def',
       'async def foo():\n f = lambda: await abc',
       "'await' outside async function")

raises('await_in_nested_sync_def',
       'async def foo():\n def g():\n  await abc',
       "'await' outside async function")

raises('await_in_default_of_async_def',
       'def spam():\n async def foo(a=await abc):\n  pass',
       'await')

raises('async_for_in_sync_def',
       'def foo():\n async for i in x:\n  pass',
       'async for')

raises('async_with_in_sync_def',
       'def foo():\n async with x:\n  pass',
       'async with')

raises('async_listcomp_in_sync_def',
       'def foo(x):\n return [i async for i in x]',
       'async')

raises('await_await',
       'async def foo():\n await await fut',
       'invalid syntax')

raises('import_as_keyword',
       'import math as await',
       'invalid syntax')

# -- the legal side: what the walk must NOT touch -----------------------

compiles('bare_return_in_async_gen',
         'async def foo():\n yield\n return')

compiles('return_value_in_plain_coroutine',
         'async def foo():\n await abc\n return 123')

compiles('genexp_await_inside_sync_def',
         'def f(x):\n return (i for i in x if await w(i))')

compiles('genexp_async_for_inside_sync_def',
         'def f(x):\n return (i async for i in x)')

compiles('nested_sync_gen_resets_colour',
         'async def foo():\n yield\n def g():\n  yield from []\n  return 5')

compiles('parenthesised_await_await',
         'async def foo():\n await (await abc)')

compiles('decorator_before_async_def',
         'def d(f):\n return f\n@d\nasync def foo():\n await abc')

compiles('class_body_inside_async_def',
         'async def foo():\n class C:\n  x = 1\n await abc')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
