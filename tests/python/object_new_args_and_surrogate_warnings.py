"""The gaps left open by test_warnings' fix (PR #1205), and two pins.

  * ``class A: pass; A(42)'' succeeded.  CPython's object_new refuses any
    argument when neither __new__ nor __init__ is overridden anywhere --
    ``A() takes no arguments'' -- and only then: a class with either one of
    its own, a built-in base, or an ASSIGNED __init__ takes arguments.
  * ``type(property(f)).__name__'' was 'PropertyDescriptor', and
    ``property.__module__'' raised.
  * A warning whose filename or message holds a LONE SURROGATE could be
    recorded but not formatted or shown: formatwarning, the registry key and
    the message filter all coerced the text to a Smalltalk string.
  * Pinned, because PR #1205 wrongly listed them as gaps: @property over
    @abstractmethod makes an ABC abstract, and a read-only property's
    message names the class by __qualname__.

Every expectation was measured against CPython 3.14.
"""

import abc
import dataclasses
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'ok'


# ------------------------------------------------ object_new's arguments

def _object_new_arguments():
    class A:
        pass

    class Sub(A):
        pass

    class WithInit:
        def __init__(self, x):
            self.x = x

    class WithNew:
        def __new__(cls, *args):
            return super().__new__(cls)

    class Int(int):
        pass

    class Err(Exception):
        pass

    class Lst(list):
        pass

    @dataclasses.dataclass
    class Data:
        x: int

    class Assigned:
        pass

    Assigned.__init__ = lambda self, v: None
    return [outcome(A), outcome(A, 42), outcome(A, x=1), outcome(Sub, 1),
            outcome(WithInit, 1), outcome(WithNew, 1), outcome(Int, 5),
            outcome(Err, 'm'), outcome(Lst, [1]), outcome(Data, 1),
            outcome(Assigned, 3)]


check('only_a_class_with_object_s_init_and_new_rejects_arguments',
      _object_new_arguments(),
      ['ok', 'TypeError: A() takes no arguments',
       'TypeError: A() takes no arguments',
       'TypeError: Sub() takes no arguments',
       'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'])


# ------------------------------------------------ the property type

check('the_property_type_is_builtins_property',
      (type(property(len)).__name__, property.__module__, repr(property),
       type(property(len)) is property),
      ('property', 'builtins', "<class 'property'>", True))


# ------------------------------------------------ pins

def _abstract_property():
    class Base(abc.ABC):
        @property
        @abc.abstractmethod
        def p(self): ...

    class Concrete(Base):
        @property
        def p(self):
            return 1

    return (sorted(Base.__abstractmethods__), outcome(Base), Concrete().p)


check('an_abstract_property_makes_the_class_abstract', _abstract_property(),
      (['p'], "TypeError: Can't instantiate abstract class Base without an "
              "implementation for abstract method 'p'", 1))


def _read_only_message():
    class C:
        @property
        def a(self):
            return 1

    return outcome(setattr, C(), 'a', 0)


check('a_read_only_property_names_the_class_by_qualname', _read_only_message(),
      "AttributeError: property 'a' of "
      "'_read_only_message.<locals>.C' object has no setter")


# ------------------------------------------------ lone surrogates

def _format_with_surrogates():
    return [warnings.formatwarning('text', UserWarning, 'surrogate\udc80', 1),
            warnings.formatwarning('te\udc81xt', UserWarning, 'f.py', 2),
            warnings.formatwarning('t', UserWarning, 'f.py', 3,
                                   line='  sp\udc82m  ')]


check('formatwarning_keeps_a_lone_surrogate', _format_with_surrogates(),
      ['surrogate\udc80:1: UserWarning: text\n',
       'f.py:2: UserWarning: te\udc81xt\n',
       'f.py:3: UserWarning: t\n  sp\udc82m\n'])


def _show_with_surrogates():
    class Sink:
        def __init__(self):
            self.written = []

        def write(self, text):
            self.written.append(text)

    sink = Sink()
    warnings.showwarning('te\udc81xt', UserWarning, 'surrogate\udc80', 1,
                         file=sink)
    return sink.written


check('showwarning_writes_a_lone_surrogate_to_its_file',
      _show_with_surrogates(),
      ['surrogate\udc80:1: UserWarning: te\udc81xt\n'])


def _warn_with_surrogates():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        warnings.warn('m\udc82')
        warnings.warn_explicit('text', UserWarning, 'surrogate\udc80', 1)
    recorded = [(x.message.args[0], x.filename) for x in w]
    # The raised warning is read as (type, args[0]) rather than through
    # outcome(): '%s' % a surrogate str is a separate Grail gap in str
    # formatting, not the one pinned here.
    with warnings.catch_warnings():
        warnings.filterwarnings('error', message='m')
        try:
            warnings.warn('m\udc83')
            filtered = 'not raised'
        except UserWarning as exc:
            filtered = (type(exc).__name__, exc.args[0])
    return (recorded[0][0], recorded[1][1], filtered)


check('a_lone_surrogate_message_warns_and_is_filtered',
      _warn_with_surrogates(),
      ('m\udc82', 'surrogate\udc80', ('UserWarning', 'm\udc83')))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
