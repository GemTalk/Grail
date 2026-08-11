"""Fixtures for tracebacks that cross a generator boundary (§9.9 item 6).

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

A Grail generator body runs in its own forked GsProcess, so the stack captured
when it raises holds the body and the fork plumbing and nothing of the consumer.
The consumer's half is captured separately, when PythonGenerator re-signals the
exception on the consumer's process, and the two are spliced.  Before that, such a
raise produced only the catch-site frame.

Line numbers here are load-bearing: the expectations name them explicitly.  Run
this file under CPython (``python3 tests/python/generator_frames.py'') to print the
chains it actually produces -- that is where the literals below come from, and
re-running it is how to re-derive them after an edit.  Deliberately NO trailing
comments on the raising / calling lines.
"""

import traceback


def _chain(exc):
    return [(f.name, f.lineno) for f in traceback.extract_tb(exc.__traceback__)]


def gen():
    yield 1
    raise ValueError('from generator')


def inner_gen():
    yield 1
    raise ValueError('deep in inner')


def outer_gen():
    yield from inner_gen()


def simple_gen():
    yield 1
    yield 2


def catching_gen():
    try:
        raise ValueError('caught inside')
    except ValueError:
        yield 'recovered'


def consume_for():
    try:
        for _ in gen():
            pass
    except ValueError as e:
        return e
    return None


def consume_next():
    g = gen()
    try:
        next(g)
        next(g)
    except ValueError as e:
        return e
    return None


def consume_inner():
    for _ in gen():
        pass


def nested_consumer():
    try:
        consume_inner()
    except ValueError as e:
        return e
    return None


def consume_delegated():
    try:
        for _ in outer_gen():
            pass
    except ValueError as e:
        return e
    return None


def throw_into():
    g = simple_gen()
    next(g)
    try:
        g.throw(KeyError('injected'))
    except KeyError as e:
        return e
    return None


EXPECTED_FOR = [('consume_for', 54), ('gen', 28)]
EXPECTED_NEXT = [('consume_next', 65), ('gen', 28)]
EXPECTED_NESTED = [('nested_consumer', 78), ('consume_inner', 72), ('gen', 28)]
EXPECTED_DELEGATED = [('consume_delegated', 86), ('outer_gen', 37),
                      ('inner_gen', 33)]
EXPECTED_THROWN = [('throw_into', 97), ('simple_gen', 41)]


def the_generators_own_frame_is_reported():
    """The whole point of item 6: the raise inside the generator body appears,
    below the consumer's frame."""
    return _chain(consume_for()) == EXPECTED_FOR


def the_consumers_frame_is_reported_too():
    """Stated separately because it is the half that was lost: the consumer's
    frames live in a DIFFERENT GsProcess from the generator's."""
    chain = _chain(consume_for())
    return chain[0] == ('consume_for', 54) and len(chain) == 2


def advancing_with_next_gives_the_same_chain():
    """The splice is in the resume path, not in the ``for'' statement."""
    return _chain(consume_next()) == EXPECTED_NEXT


def every_consumer_frame_appears():
    """Not just the catching one: an intermediate function between the catcher
    and the generator gets a frame, as it does for any other exception."""
    return _chain(nested_consumer()) == EXPECTED_NESTED


def yield_from_reports_both_generators():
    """Delegation nests forked processes, so BOTH generator bodies contribute a
    frame -- the inner one innermost."""
    return _chain(consume_delegated()) == EXPECTED_DELEGATED


def throw_reports_the_generators_frame():
    """gen.throw() injects at the suspended yield, and CPython attributes the
    frame to the generator at that yield."""
    return _chain(throw_into()) == EXPECTED_THROWN


def an_exception_caught_inside_the_generator_is_invisible():
    """Only an ESCAPING exception is spliced: one the body handles itself must
    leave no trace, and the generator must keep working."""
    return list(catching_gen()) == ['recovered']


def pep479_still_converts_stopiteration():
    """A StopIteration escaping the body becomes RuntimeError, whose traceback is
    the consumer's alone -- CPython does not attribute it to the generator, and
    the conversion happens on the consumer's process."""
    def stopiter_gen():
        yield 1
        raise StopIteration('bad')

    try:
        for _ in stopiter_gen():
            pass
    except RuntimeError as e:
        names = [name for name, _ in _chain(e)]
        return ('generator raised StopIteration' in str(e)
                and 'stopiter_gen' not in names)
    return False


def the_rendered_traceback_names_both():
    """End to end."""
    text = ''.join(traceback.format_exception(consume_for()))
    return ('in consume_for' in text
            and 'in gen' in text
            and text.index('in consume_for') < text.index('in gen')
            and text.rstrip().endswith('ValueError: from generator'))


if __name__ == '__main__':
    for label, fn, expected in (
            ('for', consume_for, EXPECTED_FOR),
            ('next', consume_next, EXPECTED_NEXT),
            ('nested', nested_consumer, EXPECTED_NESTED),
            ('delegated', consume_delegated, EXPECTED_DELEGATED),
            ('thrown', throw_into, EXPECTED_THROWN)):
        actual = _chain(fn())
        print('%-12s %s %s' % (label, 'OK ' if actual == expected else 'DIFF',
                               actual))
