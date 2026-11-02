"""Fixture: a finalizer hook's warning does not land in the code it interrupts.

Driven from FinalizerWarningDuringWalkTestCase, which needs what Python cannot
do here: queue finalizer hooks WITHOUT running them (a mark-sweep and an
ephemeron sweep, but not FinalizerEphemeron's drain), so the next safe point
runs them.

A generator expression's first suspension is such a safe point: it registers
the generator's own watch.  So in

    sorted(k for k in globals() if k.endswith('__g'))

the hooks of a dropped, never-awaited asend step and coroutine ran between the
globals() snapshot and the walk's next step.  Each RuntimeWarning was blamed on
the frame running -- this module -- and warnings created
``__warningregistry__`` in this module's globals, so the walk raised
``dictionary changed size during iteration``.  That was #1999's CI flake, in
tests/python/bare_name_mangling.py.

CPython runs those destructors where the objects die, in the code that dropped
them, so nothing here is CPython's behaviour to compare against: the fixture is
not self-running.
"""

import warnings


async def agen():
    yield 1


async def coro():
    pass


def drop_unawaited_step_and_coroutine():
    agen().asend(None)
    coro()
    return 'dropped'


marker__g = 1


def walk_recording():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            keys = sorted(k for k in globals() if k.endswith('__g'))
        except RuntimeError as e:
            keys = 'RuntimeError: %s' % e
    return [keys, sorted((w.category.__name__, str(w.message), w.filename, w.lineno) for w in caught)]


def registry_in_globals():
    return '__warningregistry__' in list(globals())


def expected_walk():
    """Both hooks warn, against <sys> line 0 -- CPython's answer when it finds
    no frame to blame -- and the walk finishes."""
    return [['marker__g'], [
        ('RuntimeWarning', "coroutine 'coro' was never awaited", '<sys>', 0),
        ('RuntimeWarning', "coroutine method 'asend' of 'agen' was never awaited", '<sys>', 0)]]
