"""Fixtures for Grail's 255-attribute ceiling.

Driven by PythonTests>>AttributeCeilingTestCase.

Grail stores Python attributes as GemStone DYNAMIC INSTVARS, which cap at 255
per object.  So every Python object -- class, instance or module -- holds at
most 255 attributes.  CPython has no such limit, which is why the checks below
are marked GRAIL-SPECIFIC and assert what Grail DOES.

The point of this file is not the limit, which cannot be lifted without moving
attribute storage off dynamic instVars (section 9.41).  It is that hitting the
limit is now SURVIVABLE.  It used to signal a Smalltalk ImproperOperation, which
never passes through the env-1 mapping that makes Smalltalk errors catchable
from Python: ``except Exception'' did not see it, Python code could neither
defend against the limit nor detect it, and a probe written in Python simply
died.  This file could not have existed before that changed -- a fixture that
crossed the line would have taken the whole SUnit run down with it.

MemoryError is the choice because CPython has no equivalent to raise.  Any
exception here is non-conformant; the alternative was an uncatchable one.

Run this file under CPython (``python3 tests/python/attribute_ceiling.py'') to
see what it produces -- every check is expected to DISAGREE there, because
CPython simply keeps going past 255.
"""


def _fill(obj, n, prefix='a'):
    """Set n attributes, answering how many succeeded before MemoryError."""
    for i in range(n):
        try:
            setattr(obj, '%s_%d' % (prefix, i), None)
        except MemoryError:
            return i
    return n


class _Inst:
    pass


class _Survivor:
    keeper = 'kept'


def an_instance_holds_255_attributes():
    """GRAIL-SPECIFIC (CPython has no limit)."""
    return _fill(_Inst(), 400) == 255


def a_class_holds_no_more_than_255_attributes():
    """GRAIL-SPECIFIC.  The ceiling is per OBJECT, and a class is an object.

    Bounded rather than exact, unlike the instance check: a class object
    already holds dynamic instVars of its own (its docstring and the class-body
    machinery), so the number of FREE slots is fewer than 255 and is not stable
    enough to assert.  Pinning 255 exactly passed standalone and failed in the
    full suite, which is the tell that the number was incidental.

    The class is defined HERE rather than at module level, and that is not a
    style choice.  A Grail class object PERSISTS across sessions, so a
    module-level class filled by one run is still full for the next: the check
    passed standalone and then failed in the sharded suite because the second
    run found no free slots at all.  A fresh class per call is the only
    idempotent form."""
    class Fresh:
        pass

    n = _fill(Fresh, 400)
    return 0 < n <= 255


def crossing_the_ceiling_raises_memoryerror():
    """GRAIL-SPECIFIC, and the check that matters.

    Not that the limit exists -- that it is a PYTHON exception.  The Smalltalk
    ImproperOperation it used to signal was invisible to ``except''."""
    obj = _Survivor()
    _fill(obj, 300)
    try:
        setattr(obj, 'one_too_many', None)
    except MemoryError:
        return True
    except Exception:
        return False
    return False


def the_object_survives_the_failure():
    """GRAIL-SPECIFIC.  A failed store must not corrupt what is already there:
    the attributes set before the ceiling, and the class body's own, still
    read back."""
    obj = _Survivor()
    filled = _fill(obj, 300)
    return (filled == 255
            and obj.keeper == 'kept'
            and getattr(obj, 'a_0') is None)


def the_ceiling_is_per_object_not_global():
    """GRAIL-SPECIFIC.  A second object gets its own 255, so hitting the limit
    once does not poison the image."""
    first = _fill(_Inst(), 300)
    second = _fill(_Inst(), 300)
    return first == 255 and second == 255


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    grail_only = [
        an_instance_holds_255_attributes,
        a_class_holds_no_more_than_255_attributes,
        crossing_the_ceiling_raises_memoryerror,
        the_object_survives_the_failure,
        the_ceiling_is_per_object_not_global,
    ]
    # Every check asserts a Grail LIMITATION, so CPython is expected to
    # disagree with all of them.  XFAIL is that expected disagreement and is
    # not a failure;  XPASS would mean CPython had grown a 255-attribute
    # ceiling, which would be the surprising outcome.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
