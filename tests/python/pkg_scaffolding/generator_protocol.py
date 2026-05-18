# Exercises the full Python generator protocol: send / throw / close.


def echo():
    """``yield`` is an expression — its value is whatever the caller
    sent via ``gen.send(value)``.  First ``next()`` advances to the
    first yield; subsequent ``send(x)`` resumes with ``x`` as the
    yield's value, which we echo back."""
    while True:
        x = yield
        if x is None:
            return 'done'
        yield ('echo', x)


def adder():
    """Accumulator: each sent value is added to a running total,
    which we yield back."""
    total = 0
    while True:
        v = yield total
        if v is None:
            return total
        total = total + v


def catches_throw():
    """Generator that catches a thrown ValueError, yields a marker,
    then continues."""
    try:
        yield 'before'
    except ValueError:
        yield 'caught'
    yield 'after'


def cleanup_marker(holder):
    """Generator that uses a finally to detect ``close()``.
    The holder is a list whose first element flips when finally fires."""
    try:
        yield 1
        yield 2
    finally:
        holder[0] = 'closed'
