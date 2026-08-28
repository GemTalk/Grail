"""PEP 487: __init_subclass__ for the commonest spelling, and __set_name__
failures that carry CPython's note.

``def __init_subclass__(cls):`` -- no **kwargs, no @classmethod, the
spelling almost every use of the protocol is written in -- never ran.  It
compiles to BOTH a varargs entry and a unary instance-side method, and the
entry's whole body is its argument checks followed by ``^ self
__init_subclass__``: a VIRTUAL send whose receiver is the new CLASS, so it
resolved through the METACLASS chain, sailed past the hook (instance-side)
and landed on object's no-op terminator.  The hook ran, did nothing, and
reported success.  ``def __init_subclass__(cls, **kwargs)`` was unaffected,
which is why this survived -- that spelling has no unary method and its
varargs entry holds the real body.

__set_name__ gained two things.  A hook of the WRONG ARITY was skipped
rather than called, because the only probe was for the exact 2-argument
selector; every def spelling also compiles a varargs entry, and calling
through that one produces CPython's TypeError by construction.  And any
exception escaping a __set_name__ call now carries the PEP 678 note

    Error calling __set_name__ on 'Descriptor' instance 'attr' in 'C'

with the ORIGINAL exception still propagating -- type and identity intact
-- which is the only thing tying a failure inside a descriptor back to the
class body that triggered it.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- __init_subclass__, the no-kwargs spelling --------------------------

class Base:
    initialized = False

    def __init_subclass__(cls):
        super().__init_subclass__()
        cls.initialized = True


class Sub(Base):
    pass


check('no_kwargs_hook_runs', Sub.initialized, True)
check('owner_untouched', Base.initialized, False)

_order = []


class Ordered:
    def __init_subclass__(cls):
        _order.append(cls.__name__)


class OrderedSub(Ordered):
    pass


check('hook_saw_the_subclass', _order, ['OrderedSub'])


class NoSuperCall:
    def __init_subclass__(cls):
        cls.marked = True


class NoSuperSub(NoSuperCall):
    pass


check('hook_without_super_call', NoSuperSub.marked, True)


def _in_function():
    seen = []

    class P:
        def __init_subclass__(cls):
            seen.append(cls.__name__)

    class Q(P):
        pass

    return seen


check('hook_on_a_class_defined_in_a_function', _in_function(), ['Q'])


class RaisingHook:
    def __init_subclass__(cls):
        raise RuntimeError('from the hook')


def _raising():
    try:
        class Boom(RaisingHook):
            pass
        return 'no raise'
    except RuntimeError as exc:
        return str(exc)


check('hook_exception_propagates', _raising(), 'from the hook')


def _keyword_to_a_hook_that_takes_none():
    try:
        class WithKw(Base, x=1):
            pass
        return 'no raise'
    except TypeError as exc:
        return str(exc)


check('keyword_rejected_by_arity_check',
      _keyword_to_a_hook_that_takes_none(),
      "Base.__init_subclass__() got an unexpected keyword argument 'x'")


# The **kwargs spelling keeps working, with and without class keywords.

class KwBase:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__()
        cls.seen_kwargs = kwargs


class KwPlain(KwBase):
    pass


class KwTagged(KwBase, tag='t'):
    pass


check('kwargs_spelling_no_keywords', KwPlain.seen_kwargs, {})
check('kwargs_spelling_with_keywords', KwTagged.seen_kwargs, {'tag': 't'})


# __set_name__ still runs, and runs BEFORE __init_subclass__.

class Descriptor:
    def __set_name__(self, owner, name):
        self.owner = owner
        self.name = name


class HasDescriptor:
    d = Descriptor()


check('set_name_owner', HasDescriptor.d.owner is HasDescriptor, True)
check('set_name_name', HasDescriptor.d.name, 'd')


class SeesDescriptor:
    def __init_subclass__(cls):
        cls.seen = cls.d.owner is cls


class SeesDescriptorSub(SeesDescriptor):
    d = Descriptor()


check('set_name_runs_before_init_subclass', SeesDescriptorSub.seen, True)


# -- __set_name__ failures ---------------------------------------------

def _wrong_arity():
    class WrongArity:
        def __set_name__(self):
            pass

    try:
        class NotGoingToWork:
            attr = WrongArity()
        return ('no raise', None)
    except TypeError as exc:
        return ('TypeError', getattr(exc, '__notes__', None))


_kind, _notes = _wrong_arity()
check('wrong_arity_raises', _kind, 'TypeError')
check('wrong_arity_note',
      _notes,
      ["Error calling __set_name__ on 'WrongArity' instance 'attr' "
       "in 'NotGoingToWork'"])


def _raising_set_name():
    class Exploder:
        def __set_name__(self, owner, name):
            raise ZeroDivisionError('boom')

    try:
        class Owner:
            attr = Exploder()
        return ('no raise', None, None)
    except ZeroDivisionError as exc:
        return ('ZeroDivisionError', str(exc), getattr(exc, '__notes__', None))


_kind, _msg, _notes = _raising_set_name()
check('raising_set_name_type', _kind, 'ZeroDivisionError')
check('raising_set_name_message', _msg, 'boom')
check('raising_set_name_note',
      _notes,
      ["Error calling __set_name__ on 'Exploder' instance 'attr' in 'Owner'"])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
