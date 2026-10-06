"""Workflows for the park-shapes phase of tests/scripts/run_durable_test.sh.

Each parks (durable.sleep(0)) inside a different Python construct and then
computes from locals updated after the resume.  GemStone gives a block made
before the capture a stale home context after the resume (Kermit 52132),
so some shapes resumed WRONG, silently; durable now refuses those it can
recognise (durable._resume_hazard), including every park inside a try.  EXPECTED is what
CPython computes with sleep() a no-op.  Grail-only: not a tests/python
fixture."""
import durable


class _Ctx:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        self.log.append('in')
        return self

    def __exit__(self, *exc):
        self.log.append('out')
        return False


def straight(n):
    total = 0
    durable.sleep(0)
    total += 1
    durable.sleep(0)
    total += 2
    return total


def for_loop(n):
    total = 0
    for i in range(n):
        durable.sleep(0)
        total += i + 1
    return total


def while_loop(n):
    total, i = 0, 0
    while i < n:
        durable.sleep(0)
        i += 1
        total += i
    return total


def for_else_break_continue(n):
    total = 0
    for i in range(n + 2):
        if i == 0:
            continue
        durable.sleep(0)
        total += i
        if i == n:
            break
    else:
        total = -1
    return total


def try_in_loop(n):
    total = 0
    for i in range(n):
        try:
            durable.sleep(0)
            total += i + 1
        except ValueError:
            total = -1
    return total


def loop_in_try(n):
    total = 0
    try:
        for i in range(n):
            durable.sleep(0)
            total += i + 1
    except ValueError:
        total = -1
    return total


def try_finally(n):
    total = 0
    try:
        durable.sleep(0)
        total += 1
    finally:
        total += 10
    return total


def raise_after_park(n):
    total = 0
    try:
        for i in range(n):
            durable.sleep(0)
            total += i + 1
            if i == n - 1:
                raise ValueError(total)
    except ValueError as e:
        total = e.args[0] * 100
    return total


def with_block(n):
    log = []
    total = 0
    with _Ctx(log):
        durable.sleep(0)
        total += 1
    return (total, log)


def with_in_loop(n):
    log = []
    total = 0
    for i in range(n):
        with _Ctx(log):
            durable.sleep(0)
            total += i + 1
    return (total, len(log))


def closure_nonlocal(n):
    total = 0

    def bump(k):
        nonlocal total
        durable.sleep(0)
        total += k

    for i in range(n):
        bump(i + 1)
    return total


def closure_reads_outer(n):
    base = 100

    def add(k):
        durable.sleep(0)
        return base + k

    total = 0
    for i in range(n):
        total += add(i)
    return total


def comprehension(n):
    def parked(i):
        durable.sleep(0)
        return i + 1
    return sum([parked(i) for i in range(n)])


def generator_expression_consumer(n):
    total = 0
    for v in [i + 1 for i in range(n)]:
        durable.sleep(0)
        total += v
    return total


def lambda_call(n):
    f = lambda k: (durable.sleep(0), k + 1)[1]
    total = 0
    for i in range(n):
        total += f(i)
    return total


def nested_loops(n):
    total = 0
    for i in range(n):
        for j in range(2):
            durable.sleep(0)
            total += (i + 1) * (j + 1)
    return total


def conditional_expression(n):
    total = 0
    for i in range(n):
        total += (durable.sleep(0) or i + 1) if i % 2 == 0 else i + 1
    return total


def boolean_short_circuit(n):
    total = 0
    for i in range(n):
        ok = i >= 0 and (durable.sleep(0) is None)
        total += (i + 1) if ok else 0
    return total


def recursion(n):
    if n == 0:
        return 0
    durable.sleep(0)
    return n + recursion(n - 1)


def walrus_in_loop(n):
    total = 0
    i = 0
    while (i := i + 1) <= n:
        durable.sleep(0)
        total += i
    return total


def match_statement(n):
    total = 0
    for i in range(n):
        match i:
            case 0:
                durable.sleep(0)
                total += 1
            case _:
                durable.sleep(0)
                total += i + 1
    return total


SHAPES = [straight, for_loop, while_loop, for_else_break_continue, try_in_loop,
          loop_in_try, try_finally, raise_after_park, with_block, with_in_loop,
          closure_nonlocal, closure_reads_outer, comprehension,
          generator_expression_consumer, lambda_call, nested_loops,
          conditional_expression, boolean_short_circuit, recursion,
          walrus_in_loop, match_statement]


EXPECTED = {
    'straight': 3,
    'for_loop': 6,
    'while_loop': 6,
    'for_else_break_continue': 6,
    'try_in_loop': 6,
    'loop_in_try': 6,
    'try_finally': 11,
    'raise_after_park': 600,
    'with_block': (1, ['in', 'out']),
    'with_in_loop': (6, 6),
    'closure_nonlocal': 6,
    'closure_reads_outer': 303,
    'comprehension': 6,
    'generator_expression_consumer': 6,
    'lambda_call': 6,
    'nested_loops': 18,
    'conditional_expression': 6,
    'boolean_short_circuit': 6,
    'recursion': 6,
    'walrus_in_loop': 6,
    'match_statement': 6,
}
