"""A method reached through a SECOND base keeps all of its metadata.

Driven by PythonTests>>MixinMethodMetadataTestCase.  Each check answers True
when the behaviour matches CPython, so a failure names the specific rule.

Grail merges multiple inheritance by RECOMPILING the secondary bases' methods
onto the subclass -- Smalltalk is single-inheritance, so the subclass's superclass
is only its PRIMARY base and the rest have to be copied down.  But a method's
Python metadata does not live in the method: ClassDefAst compiles it into five
class-side tables built from ONE class body --

    ___methodCodeTable___         __code__
    ___methodDocTable___          __doc__
    ___methodSignatureTable___    inspect.signature
    ___methodReceiverTable___     the `self'/`cls' the signature table drops
    ___methodAnnotationsTable___  __annotations__ / __annotate__

-- so a copied method's metadata stays behind in the BASE's table, which a walk
up the subclass's superclass chain cannot reach.

What that cost, for `class Multi(unittest.TestCase, Mixin)':

    Multi.meth.__code__    -> AttributeError: 'method' object has no attribute
    Multi.meth.__doc__     -> None
    Multi().meth.__code__  -> the right PyCode

The last line is the tell, and it is why the class-side reads are checked here
BESIDE the instance-side ones: BoundMethod already consulted the MRO (it was
taught to for test_gettext, where 13 tests reported `'method' object has no
attribute __code__'), so reading the very same method through an INSTANCE was
right while reading it through the CLASS was wrong.  A fix that repaired one and
broke the other would pass a check that only looked at one of them.

`__code__' raising rather than answering None is not a mercy either:
``hasattr(x, '__code__')'' is how inspect and functools.wraps decide whether
something is a function at all, so the failure propagates into anything that
wraps a mixin's method.

Run this file under CPython (``python3 tests/python/mixin_method_metadata.py'')
to see what it produces -- that is where the expectations come from.  Every check
here is parity; none document a Grail limit.
"""

import inspect
import unittest


class Mixin:
    marker = 5                         # a plain, non-method class attribute

    def plain(self, a, b='x'):
        """plain docstring"""
        return (a, b)

    def annotated(self, a: int, b: str = 'x') -> bool:
        """annotated docstring"""
        return True

    @classmethod
    def cm(cls) -> int:
        """cm docstring"""
        return 1

    @staticmethod
    def sm(z=2):
        """sm docstring"""
        return z


class Single(Mixin):
    """Single inheritance: `plain' is INHERITED through the Smalltalk chain
    rather than copied, so this is the control -- it worked throughout, and a
    fix that moved to the MRO must not disturb it."""


class Multi(unittest.TestCase, Mixin):
    """The mixin is the SECOND base, so its methods are merged by copy.  This is
    the shape CPython's own test suite uses (``class TestTracebackFormat(
    unittest.TestCase, TracebackFormatMixin)'')."""


def _multi():
    """A Multi instance.  unittest.TestCase.__init__ wants the name of a test
    method that exists, hence `plain' rather than something invented."""
    return Multi('plain')


def a_copied_method_has_a_code_object():
    return Multi.plain.__code__.co_name == 'plain'


def a_copied_method_s_code_names_its_file():
    return Multi.plain.__code__.co_filename == __file__


def a_copied_method_s_code_knows_its_line():
    """The line of the ``def'' in the MIXIN, which is where it was written."""
    return (Multi.plain.__code__.co_firstlineno
            == Mixin.plain.__code__.co_firstlineno)


def a_copied_method_keeps_its_docstring():
    return Multi.plain.__doc__ == 'plain docstring'


def a_copied_method_keeps_its_signature():
    return str(inspect.signature(Multi.plain)) == "(self, a, b='x')"


def a_copied_method_keeps_its_annotations():
    return sorted(Multi.annotated.__annotations__) == ['a', 'b', 'return']


def a_copied_classmethod_keeps_its_metadata():
    """A @classmethod compiles onto the METACLASS, so it reaches the tables by a
    different route than an instance method and is checked separately."""
    return (Multi.cm.__doc__ == 'cm docstring'
            and sorted(Multi.cm.__annotations__) == ['return'])


def a_copied_staticmethod_keeps_its_metadata():
    """A @staticmethod has NO receiver entry, so its signature exercises the
    ``nil from the receiver table'' path rather than the found one."""
    return (Multi.sm.__doc__ == 'sm docstring'
            and str(inspect.signature(Multi.sm)) == '(z=2)')


def the_class_and_the_instance_agree():
    """The two routes to one method's metadata must answer the same thing.

    This is the check that would have caught the defect: the instance side was
    right all along, so anything comparing only against itself looked fine."""
    inst = _multi()
    return (Multi.plain.__code__.co_name == inst.plain.__code__.co_name
            and Multi.plain.__doc__ == inst.plain.__doc__
            and Multi.plain.__code__.co_filename
            == inst.plain.__code__.co_filename)


def single_inheritance_still_works():
    """The control: `Single' reaches `plain' by ordinary inheritance."""
    return (Single.plain.__code__.co_name == 'plain'
            and Single.plain.__doc__ == 'plain docstring'
            and str(inspect.signature(Single.plain)) == "(self, a, b='x')")


def the_mixin_itself_still_works():
    return (Mixin.plain.__code__.co_name == 'plain'
            and Mixin.plain.__doc__ == 'plain docstring')


def hasattr_code_is_true_for_a_copied_method():
    """The reason a raising __code__ is worse than a wrong one: this predicate is
    how inspect and functools.wraps decide whether something is a function."""
    return hasattr(Multi.plain, '__code__') is True


class _Left:
    def which(self):
        """left docstring"""
        return 'left'


class _Right:
    def which(self):
        """right docstring"""
        return 'right'


class _LeftFirst(_Left, _Right):
    pass


def precedence_follows_the_mro():
    """THE GUARD RAIL, and the risk a widened walk actually carries: when two
    bases define the same name, the metadata must come from wherever the CALL
    goes.  Python's C3 MRO picks the leftmost, so `_Left.which' wins both.

    A walk that searched bases in the wrong order, or that reached a base the
    dispatch does not use, would answer 'right docstring' here while the call
    returned 'left' -- a disagreement between what runs and what inspect reports,
    which is worse than the AttributeError this change fixes because nothing
    raises."""
    inst = _LeftFirst()
    return (inst.which() == 'left'
            and _LeftFirst.which.__doc__ == 'left docstring'
            and _LeftFirst.which.__code__.co_firstlineno
            == _Left.which.__code__.co_firstlineno)


def a_non_method_has_no_code():
    """The other guard rail: widening the walk must not make every attribute
    claim to be a function.  ``marker'' is a plain class attribute on the mixin,
    so it is merged by the value pass rather than recompiled as a method.

    Deliberately a name this fixture DEFINES.  The first version reached for
    ``Multi.maxDiff'' -- a real unittest.TestCase class attribute -- and it
    failed in Grail with ``type object 'Multi' has no attribute 'maxDiff''',
    which is a separate gap in Grail's vendored unittest and nothing to do with
    the walk under test.  A guard rail that can fail for an unrelated reason
    tests the wrong thing."""
    return Multi.marker == 5 and not hasattr(Multi.marker, '__code__')


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_copied_method_has_a_code_object,
        a_copied_method_s_code_names_its_file,
        a_copied_method_s_code_knows_its_line,
        a_copied_method_keeps_its_docstring,
        a_copied_method_keeps_its_signature,
        a_copied_method_keeps_its_annotations,
        a_copied_classmethod_keeps_its_metadata,
        a_copied_staticmethod_keeps_its_metadata,
        the_class_and_the_instance_agree,
        single_inheritance_still_works,
        the_mixin_itself_still_works,
        hasattr_code_is_true_for_a_copied_method,
        precedence_follows_the_mro,
        a_non_method_has_no_code,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
