"""Assigning an exception's chaining attributes: ``__cause__``,
``__context__`` and ``__suppress_context__``.

In CPython the three are getset descriptors.  Grail stored an assignment as an
ordinary instance attribute named after the dunder, which is a DIFFERENT slot
from the one ``raise X from Y`` writes, so:

* assigning ``__cause__`` left ``__suppress_context__`` False, where CPython
  sets it -- and ``e.__cause__ = x; e.__cause__ = None`` then showed the
  implicit context CPython keeps hidden;
* nothing was validated: a number, a class or None went into any of them;
* all three could be deleted;
* the Smalltalk side (BaseException >> pythonExceptionChain) never saw an
  assigned cause -- checked from Smalltalk, see ``assigned_cause_exception``.

``raise X from Y`` was already right and is checked here only as the control.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import sys
import traceback


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def assigning_the_cause_suppresses_the_context():
    e = ValueError('v')
    before = e.__suppress_context__
    e.__cause__ = KeyError('k')
    after = (repr(e.__cause__), e.__suppress_context__)
    e.__cause__ = None
    cleared = (e.__cause__, e.__suppress_context__)
    e.__suppress_context__ = False
    e.__context__ = TypeError('t')
    context = (repr(e.__context__), e.__suppress_context__)
    return before, after, cleared, context


def every_store_route_sets_the_flag():
    def flag(store):
        e = ValueError()
        store(e, KeyError())
        return type(e.__cause__).__name__, e.__suppress_context__

    class Audited(ValueError):
        def __setattr__(self, name, value):
            super().__setattr__(name, value)

    sub = Audited()
    sub.__cause__ = KeyError()
    return (flag(lambda e, v: setattr(e, '__cause__', v)),
            flag(lambda e, v: object.__setattr__(e, '__cause__', v)),
            (type(sub.__cause__).__name__, sub.__suppress_context__))


def a_cleared_cause_keeps_the_context_hidden():
    def render(clear):
        try:
            try:
                raise KeyError('the-context')
            except KeyError:
                e = ValueError('v')
                e.__cause__ = TypeError('the-cause')
                if clear:
                    e.__cause__ = None
                raise e
        except ValueError as exc:
            text = ''.join(traceback.format_exception(exc))
            return ('direct cause' in text, 'During handling' in text,
                    'the-context' in text)
    return render(False), render(True)


def links_must_be_exception_instances():
    e = ValueError()
    cause, context = KeyError('c'), KeyError('x')
    e.__cause__ = cause
    e.__context__ = context
    out = []
    for name in ('__cause__', '__context__'):
        for bad in (5, 'text', KeyError):
            out.append(_outcome(lambda: setattr(e, name, bad)))
    return tuple(out), e.__cause__ is cause, e.__context__ is context


def suppress_context_takes_only_a_bool():
    e = ValueError()
    e.__suppress_context__ = True
    refused = tuple(_outcome(lambda: setattr(e, '__suppress_context__', v))
                    for v in (0, 1, None, 'yes'))
    return refused, e.__suppress_context__


def chaining_attributes_cannot_be_deleted():
    e = ValueError()
    e.__cause__ = KeyError()
    out = tuple(_outcome(lambda: delattr(e, n))
                for n in ('__cause__', '__context__', '__suppress_context__'))
    return out, type(e.__cause__).__name__


def assigned_links_are_not_instance_attributes():
    e = ValueError()
    e.__cause__ = KeyError()
    e.__context__ = TypeError()
    e.__suppress_context__ = False
    e.extra = 1
    return e.__dict__ == {'extra': 1}, sorted(vars(e))


def raise_from_still_chains():
    # The control: this path already set all three.
    try:
        try:
            raise KeyError('k')
        except KeyError:
            raise ValueError('v') from TypeError('t')
    except ValueError as e:
        return (type(e.__cause__).__name__, type(e.__context__).__name__,
                e.__suppress_context__)


def assigned_cause_exception():
    """For the Smalltalk test: an exception whose only cause was ASSIGNED."""
    e = ValueError('v')
    e.__cause__ = KeyError('k')
    return e


CHECKS = [
    assigning_the_cause_suppresses_the_context,
    every_store_route_sets_the_flag,
    a_cleared_cause_keeps_the_context_hidden,
    links_must_be_exception_instances,
    suppress_context_takes_only_a_bool,
    chaining_attributes_cannot_be_deleted,
    assigned_links_are_not_instance_attributes,
    raise_from_still_chains,
]

EXPECTED = {
    'assigning_the_cause_suppresses_the_context': (False, ("KeyError('k')", True), (None, True), ("TypeError('t')", False)),
    'every_store_route_sets_the_flag': (('KeyError', True), ('KeyError', True), ('KeyError', True)),
    'a_cleared_cause_keeps_the_context_hidden': ((True, False, False), (False, False, False)),
    'links_must_be_exception_instances': ((('TypeError', 'exception cause must be None or derive from BaseException'), ('TypeError', 'exception cause must be None or derive from BaseException'), ('TypeError', 'exception cause must be None or derive from BaseException'), ('TypeError', 'exception context must be None or derive from BaseException'), ('TypeError', 'exception context must be None or derive from BaseException'), ('TypeError', 'exception context must be None or derive from BaseException')), True, True),
    'suppress_context_takes_only_a_bool': ((('TypeError', 'attribute value type must be bool'), ('TypeError', 'attribute value type must be bool'), ('TypeError', 'attribute value type must be bool'), ('TypeError', 'attribute value type must be bool')), True),
    'chaining_attributes_cannot_be_deleted': ((('TypeError', '__cause__ may not be deleted'), ('TypeError', '__context__ may not be deleted'), ('TypeError', "can't delete numeric/char attribute")), 'KeyError'),
    'assigned_links_are_not_instance_attributes': (True, ['extra']),
    'raise_from_still_chains': ('TypeError', 'KeyError', True),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
