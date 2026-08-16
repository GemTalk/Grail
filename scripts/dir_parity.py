"""Measure Grail's ``dir()`` against CPython's, subject by subject.

WHY A HARNESS AND NOT A JUDGEMENT CALL: Grail derives ``dir()`` from SMALLTALK
SELECTORS (object>>__dir__ scans allSelectorsForEnvironment: 1) and then subtracts
what it recognises as internal.  Anything reachable on the chain that is not a
Python attribute leaks through, and the leaked names have no single origin --
``asFloat'' comes from PythonInstance, ``mro'' from Behavior, others from
elsewhere again.  So the size and shape of the gap cannot be reasoned out; it has
to be counted, per type, against CPython.

The output is deliberately a DIFF PER SUBJECT rather than a total.  A single
"N names wrong" number would hide the distinction that decides the design:

  * EXTRA names  -- Grail over-reports.  Cosmetic for most callers, but it feeds
    wrong candidates to traceback's "Did you mean:" suggestions.
  * MISSING names -- Grail under-reports.  This is the dangerous direction:
    ``dir()`` drives unittest's getTestCaseNames, inspect, and pydoc, so a name
    that disappears can silently stop a test from being discovered.

A replacement for __dir__ has to reach ZERO MISSING before extras matter at all.

Usage:
    python3 scripts/dir_parity.py            # CPython baseline -> stdout
    python3 scripts/dir_parity.py -o FILE    # CPython baseline -> FILE

Under Grail, load this module and call ``report_text()`` (or ``write_report``),
then diff the two files.  Keep the subject list identical on both sides -- a
subject that fails to build is reported as an ERROR line rather than skipped, so
the two reports stay aligned line for line.
"""

import sys


# --- subjects -------------------------------------------------------------
#
# Each entry is (label, thunk).  A thunk rather than a value so that a subject
# which cannot even be constructed under one implementation reports an error on
# its own line instead of taking the whole run down.


def _plain_class():
    class A:
        bluch = None
        _bluch = None

        def meth(self):
            pass

        def with_default(self, a=1):
            pass

        def with_varargs(self, *a, **kw):
            pass

    return A


def _subclass():
    class Base:
        base_attr = None

        def base_meth(self):
            pass

    class Sub(Base):
        sub_attr = None

        def sub_meth(self, a=1):
            pass

    return Sub


def _mixin_second():
    class Mixin:
        mixin_attr = None

        def mixin_meth(self, a=1):
            pass

    class Primary:
        primary_attr = None

    class C(Primary, Mixin):
        pass

    return C


def _with_properties():
    class P:
        @property
        def prop(self):
            return 1

        @staticmethod
        def stat():
            pass

        @classmethod
        def cls_meth(cls):
            pass

    return P


def _with_slots():
    class S:
        __slots__ = ('a', 'b')

    return S


def _custom_dir():
    class D:
        def __dir__(self):
            return ['zeta', 'alpha']

    return D


def _metaclass_dir():
    class M(type):
        def __dir__(cls):
            return ['fox', 'badger']

    class C(metaclass=M):
        pass

    return C


def _exception_subclass():
    class E(ValueError):
        extra = None

    return E


SUBJECTS = [
    # Built-in types: the classes themselves and an instance of each.  These are
    # Smalltalk-written in Grail (no ___classBodyOrder___), so they are the half
    # of the corpus an additive rewrite cannot enumerate directly.
    ('type:object', lambda: object),
    ('inst:object', lambda: object()),
    ('type:int', lambda: int),
    ('inst:int', lambda: 42),
    ('type:float', lambda: float),
    ('inst:float', lambda: 1.5),
    ('type:bool', lambda: bool),
    ('type:str', lambda: str),
    ('inst:str', lambda: 'abc'),
    ('type:bytes', lambda: bytes),
    ('inst:bytes', lambda: b'abc'),
    ('type:list', lambda: list),
    ('inst:list', lambda: [1]),
    ('type:tuple', lambda: tuple),
    ('inst:tuple', lambda: (1,)),
    ('type:dict', lambda: dict),
    ('inst:dict', lambda: {'k': 1}),
    ('type:set', lambda: set),
    ('inst:set', lambda: {1}),
    ('type:frozenset', lambda: frozenset),
    ('type:type', lambda: type),
    ('type:BaseException', lambda: BaseException),
    ('type:Exception', lambda: Exception),
    ('type:ValueError', lambda: ValueError),
    ('inst:ValueError', lambda: ValueError('x')),
    ('type:StopIteration', lambda: StopIteration),

    # Python-defined classes: the half that DOES carry ___classBodyOrder___.
    ('type:plain', _plain_class),
    ('inst:plain', lambda: _plain_class()()),
    ('type:subclass', _subclass),
    ('inst:subclass', lambda: _subclass()()),
    ('type:mixin_second', _mixin_second),
    ('inst:mixin_second', lambda: _mixin_second()()),
    ('type:properties', _with_properties),
    ('inst:properties', lambda: _with_properties()()),
    ('type:slots', _with_slots),
    ('inst:slots', lambda: _with_slots()()),
    ('type:exception_subclass', _exception_subclass),

    # __dir__ overrides: an instance override is honoured today, a metaclass
    # override is not -- that gap is one of test_traceback's failures.
    ('inst:custom_dir', lambda: _custom_dir()()),
    ('type:metaclass_dir', _metaclass_dir),

    # Functions, methods and modules -- inspect and pydoc lean on these.
    ('func:plain', lambda: _plain_class().meth),
    ('bound_method', lambda: _plain_class()().meth),
    ('module:sys', lambda: sys),
]


def _names_for(thunk):
    """Answer (names, error).  CPython's dir() SORTS, and sorting a custom
    __dir__ that mixes types raises TypeError -- that is real behaviour worth
    recording, not something to paper over."""
    try:
        obj = thunk()
    except Exception as exc:
        return None, 'BUILD-ERROR %s: %s' % (type(exc).__name__, exc)
    try:
        return sorted(dir(obj)), None
    except Exception as exc:
        return None, 'DIR-ERROR %s: %s' % (type(exc).__name__, exc)


def report_text():
    """One block per subject: a header line, then one name per line. Stable
    ordering so the two implementations' reports diff line-for-line."""
    out = []
    for label, thunk in SUBJECTS:
        names, error = _names_for(thunk)
        if error is not None:
            out.append('## %s ERROR %s' % (label, error))
            continue
        out.append('## %s %d' % (label, len(names)))
        for n in names:
            out.append('%s\t%s' % (label, n))
    return '\n'.join(out) + '\n'


def write_report(path):
    with open(path, 'w') as f:
        f.write(report_text())
    return path


# --- classifying what is MISSING -----------------------------------------
#
# A name in CPython's dir() but not in Grail's is one of two completely
# different problems, and counting them together is useless:
#
#   REPORTING  -- getattr finds it, dir() just fails to list it.  A pure
#                 __dir__ defect: the attribute is there and works.
#   ABSENT     -- getattr does not find it either.  dir() is being HONEST;
#                 the gap is a missing feature elsewhere in Grail, and no
#                 rewrite of __dir__ can conjure it.
#
# Only the REPORTING pile is this project's work. Measured rather than sorted by
# eye, because the two look identical in a diff -- ``dir(str)`` is missing
# ``capitalize`` and ``float`` is missing ``__radd__``, and only the first is a
# dir() bug.


def _load_baseline(path):
    subjects = {}
    for line in open(path):
        line = line.rstrip('\n')
        if '\t' in line:
            label, name = line.split('\t', 1)
            subjects.setdefault(label, set()).add(name)
    return subjects


def classify_text(baseline_path):
    """Run under GRAIL, against the CPython report, to split every missing name
    into REPORTING vs ABSENT."""
    baseline = _load_baseline(baseline_path)
    out = []
    for label, thunk in SUBJECTS:
        expected = baseline.get(label)
        if not expected:
            continue
        try:
            obj = thunk()
            actual = set(dir(obj))
        except Exception as exc:
            out.append('## %s SKIP %s' % (label, type(exc).__name__))
            continue
        for name in sorted(expected - actual):
            try:
                reachable = hasattr(obj, name)
            except Exception:
                reachable = False
            out.append('%s\t%s\t%s' % (
                'REPORTING' if reachable else 'ABSENT', label, name))
    return '\n'.join(out) + '\n'


def write_classification(baseline_path, out_path):
    with open(out_path, 'w') as f:
        f.write(classify_text(baseline_path))
    return out_path


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == '-o':
        print(write_report(args[1]))
    else:
        sys.stdout.write(report_text())
