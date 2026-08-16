# Fixture for YieldFromTestCase.
#
# Python's ``yield from <iterable>'' DELEGATES to the inner iterable:
# it forwards each yielded item outward, and — the part that makes it
# more than a loop — forwards send() / throw() / close() inward to the
# sub-iterator, and evaluates to whatever the sub-generator returned.
#
# Grail open-coded it as ``for x in iterable: yield x'' until
# PythonGenerator >> ___yieldFrom___: replaced that with PEP 380's own
# expansion.  The loop got the item forwarding right and everything
# else wrong: a sent value resumed the DELEGATOR (the sub-generator saw
# None), a thrown exception was raised in the delegator instead of at
# the sub-generator's suspension point, close() never ran the
# sub-generator's ``finally'', and the expression's value was hardcoded
# None.  The tests below pin each of those four directions.


def _producer():
    yield 1
    yield 2
    yield 3


def yield_from_generator():
    """yield from another generator function — Grail's
    YieldFromAst emits ``@env0:do:'' on the inner PythonGenerator."""
    def wrapper():
        yield from _producer()
        yield 99
    return list(wrapper())


def yield_from_list():
    """yield from a regular sequence — exercises the same do: path
    on a Smalltalk Array."""
    def wrapper():
        yield from [10, 20, 30]
    return list(wrapper())


def yield_from_empty_generator():
    """yield from an empty generator yields nothing then continues."""
    def empty():
        if False:
            yield
    def wrapper():
        yield from empty()
        yield 'done'
    return list(wrapper())


def yield_from_nested():
    """Nested yield from — outer delegates to middle delegates to inner."""
    def inner():
        yield 'a'
        yield 'b'
    def middle():
        yield from inner()
        yield 'c'
    def outer():
        yield from middle()
        yield 'd'
    return list(outer())


def yield_from_returns_subgenerator_value():
    """``r = yield from g()'' evaluates to what g RETURNED, not None."""
    def inner():
        yield 1
        return 'returned'
    seen = []
    def outer():
        seen.append((yield from inner()))
    list(outer())
    return seen[0]


def yield_from_forwards_send():
    """send() reaches the SUB-generator, not the delegator."""
    received = []
    def sub():
        while True:
            x = yield
            received.append(x)
            if x == 'stop':
                return 'sub done'
    result = []
    def deleg():
        result.append((yield from sub()))
    g = deleg()
    next(g)
    g.send('a')
    g.send('b')
    try:
        g.send('stop')
    except StopIteration:
        pass
    return (received, result[0])


def yield_from_forwards_throw():
    """throw() is raised at the SUB-generator's suspension point; if it
    catches and yields again, that value comes back out of throw()."""
    trace = []
    def sub():
        try:
            yield 'first'
        except ValueError:
            trace.append('sub caught')
            yield 'after'
    def deleg():
        yield from sub()
    g = deleg()
    next(g)
    trace.append(g.throw(ValueError))
    return trace


def yield_from_forwards_close():
    """close() closes the SUB-generator too, running its ``finally''."""
    trace = []
    def sub():
        try:
            yield 'x'
        finally:
            trace.append('sub finally')
    def deleg():
        yield from sub()
    g = deleg()
    next(g)
    g.close()
    return trace


def yield_from_throw_returning_subgenerator():
    """A sub-generator that RETURNS in response to a thrown exception
    ends the delegation, and the delegator carries on with its value."""
    trace = []
    def sub():
        try:
            yield 1
        except ValueError:
            return 'caught and returned'
    def deleg():
        trace.append((yield from sub()))
        yield 'delegator continued'
    g = deleg()
    next(g)
    trace.append(g.throw(ValueError))
    return trace


def yield_from_send_to_non_generator():
    """A non-None send() into a delegation over a plain iterable is an
    AttributeError naming ``send'' — the sub-iterator has no send()."""
    def g():
        yield from [1, 2, 3]
    gi = g()
    next(gi)
    try:
        gi.send(42)
    except AttributeError as e:
        return str(e)
    return 'no error'


def yield_from_reentrant_is_value_error():
    """``yield from'' onto an already-running generator raises
    ValueError rather than deadlocking."""
    def g1():
        yield 'y1'
        yield from g2()
    def g2():
        yield 'y2'
        yield from gi          # gi is still running
    gi = g1()
    trace = []
    try:
        for y in gi:
            trace.append(y)
    except ValueError as e:
        trace.append(e.args[0])
    return trace


def generator_gi_running():
    """gi_running is False while suspended, True while the body runs."""
    seen = []
    def g():
        seen.append(('inside', gen.gi_running))
        yield 1
    gen = g()
    seen.append(('before', gen.gi_running))
    next(gen)
    seen.append(('after', gen.gi_running))
    return seen


def generator_return_value_delivered_once():
    """The return value rides the FIRST StopIteration only; the
    generator is exhausted afterwards."""
    def g():
        yield 1
        return 'the value'
    gi = g()
    next(gi)
    out = []
    for _ in range(2):
        try:
            next(gi)
        except StopIteration as e:
            out.append(e.value)
    return out


def close_suppresses_return_value():
    """PEP 342: close() suppresses the StopIteration, so a body that
    swallows GeneratorExit and returns leaves an exhausted generator."""
    def inner():
        try:
            yield 1
        except GeneratorExit:
            pass
        return 'returned'
    def outer():
        return (yield from inner())
    g = outer()
    next(g)
    g.close()
    try:
        next(g)
    except StopIteration as e:
        return e.value
    return 'no StopIteration'


def throw_generator_exit_propagates():
    """throw(GeneratorExit()) propagates the thrown exception even when
    the body swallows it and returns — unlike close(), which absorbs it."""
    def inner():
        try:
            yield 1
        except GeneratorExit:
            pass
        return 'returned'
    def outer():
        return (yield from inner())
    g = outer()
    next(g)
    thrown = GeneratorExit()
    try:
        g.throw(thrown)
    except GeneratorExit as e:
        return e is thrown
    return 'no GeneratorExit'


def stop_iteration_value_attribute():
    """StopIteration.value: defaults to None, follows the first
    constructor argument, and is assignable."""
    out = []
    e = StopIteration()
    out.append(e.value)
    e = StopIteration('spam')
    out.append(e.value)
    e.value = 'eggs'
    out.append(e.value)
    return out


def exception_repr_uses_repr_of_args():
    """BaseException.__repr__ renders each arg with repr()."""
    return [repr(StopIteration()),
            repr(StopIteration('spam')),
            repr(StopIteration((2,))),
            repr(StopIteration(None)),
            repr(ValueError(1, 'two'))]
