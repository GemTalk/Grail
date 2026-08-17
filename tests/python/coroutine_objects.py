# Calling an ``async def`` answers a COROUTINE; it does not run the body.
#
# Grail used to compile ``async def'' as a plain ``def'', so a call ran the body
# to completion and answered its value.  ``await'' was the identity.  That was
# enough to IMPORT jinja2 / asgiref / flask, whose async paths sit behind
# ``is_async'' guards, but it meant no coroutine object existed -- and anything
# that drives one (``coro.send(None)'') got the value, or None, instead.
#
# There is still NO EVENT LOOP, and this does not add one.  What it adds is the
# OBJECT PROTOCOL: a call answers something with send / throw / close /
# __await__, and ``await'' drives it inline.  Nothing suspends, so a coroutine
# here always runs straight through -- which is exactly how CPython behaves for
# a coroutine that never awaits anything blocking.
#
# The body being lazy is the part that changes observable behaviour: calling an
# async function and discarding the result now runs NONE of it, where before it
# ran ALL of it.  That is Python's behaviour, and it is why frameworks warn
# about a never-awaited coroutine.
#
# test_with FailureTestCase (the .send(None) cases).

r = {}


async def value():
    return 'v'


async def raises():
    raise ValueError('inside')


_ran = []


async def records():
    _ran.append('ran')
    return 'done'


async def awaits():
    return await value()


class C:
    async def m(self):
        return 'method'


# --- a call answers a coroutine and does NOT run the body ----------------------

_c = value()
r['has_coroutine_protocol'] = repr(
    [hasattr(_c, n) for n in ('send', 'throw', 'close', '__await__')])

records()                       # called, never driven
r['body_does_not_run_until_driven'] = repr(_ran)

# --- driving it runs the body and reports the return value ---------------------

try:
    value().send(None)
    r['send_reports_return_value'] = 'no StopIteration'
except StopIteration as _e:
    r['send_reports_return_value'] = repr(_e.value)

# --- an exception inside the body propagates out of the send --------------------

try:
    raises().send(None)
    r['exception_propagates'] = 'no error'
except ValueError as _e:
    r['exception_propagates'] = repr(str(_e))

# --- await drives it inline ------------------------------------------------------

try:
    awaits().send(None)
    r['await_yields_the_value'] = 'no StopIteration'
except StopIteration as _e:
    r['await_yields_the_value'] = repr(_e.value)

# --- async methods on a class are coroutines too ---------------------------------

r['async_method_is_a_coroutine'] = repr(hasattr(C().m(), 'send'))

# --- close() on an undriven coroutine is quiet -----------------------------------

_u = value()
_u.close()
r['close_is_quiet'] = 'ok'


# --- KNOWN GAP, recorded rather than endorsed -------------------------------------
# Grail names the class after its Smalltalk class, exactly as it already does for
# generators (type(gen).__name__ is 'PythonGenerator', not 'generator'), so this
# is consistent with what is there rather than new.  CPython says 'coroutine'.
r['coroutine_type_name_is_a_known_gap'] = repr(type(value()).__name__)


EXPECTED = {
    'async_method_is_a_coroutine': 'True',
    'await_yields_the_value': "'v'",
    'body_does_not_run_until_driven': '[]',
    'close_is_quiet': 'ok',
    'exception_propagates': "'inside'",
    'has_coroutine_protocol': '[True, True, True, True]',
    'send_reports_return_value': "'v'",
}

GRAIL_ONLY = {
    'coroutine_type_name_is_a_known_gap': "'PythonCoroutine'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-34s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-34s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
