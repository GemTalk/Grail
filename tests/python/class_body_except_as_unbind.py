"""Fixture: PEP 3110's implicit ``del NAME`` at the end of an ``except E as
NAME`` / ``except* E as NAME`` handler in a CLASS BODY (#2305), and for
``except*`` in a function and at module level.

CPython compiles the handler's cleanup as ``NAME = None; del NAME`` in a
``finally``, so however the handler ends, a class body loses the name: the
class has no such attribute afterwards, a later read in the body falls
through to the module, and a later ``del`` raises NameError.  Grail left the
name bound on the class, on every arm; ``except*`` also left it bound in a
function and in a module.

Every expectation is CPython 3.14's, verified by running this file directly;
the IR arm (whose method-local classes are built by an IR helper), the text
helper (``GRAIL_IR_CLASS_HELPER=0``) and the text arm (``GRAIL_IR_CODEGEN=0``)
all agree with it.  Each case is checked for a module-level class (``_m``)
and a method-local one (``_l``) where both apply.

* ``plain``: the as-name is gone, and the handler saw it bound.
* ``bound_before``: a name bound before the ``try`` is deleted too.
* ``rebound`` / ``del_in_handler``: rebinding the name in the handler, or
  deleting it there, still ends unbound and raises nothing (the cleanup
  stores None before it deletes).
* ``read_after`` / ``del_after``: a later read in the body falls through to
  the module (NameError here), and a later ``del`` raises NameError.
* ``shadows_global``: a body read after the handler finds the MODULE global
  of the same name, which the handler never touched.
* ``reraise``: a handler raising out to an enclosing class-body ``try``.
* ``loop_exit``: ``continue`` and ``break`` out of a handler in a class-body
  ``for``.
* ``nested``: the same name caught in a nested and an outer handler.
* ``else_finally`` / ``in_with_if`` / ``two_handlers``: the handler in a
  ``try`` with ``else`` and ``finally``, inside a ``with`` and an ``if``, and
  the second of two handlers.
* ``mangled``: a private ``__x`` as-name (stored mangled) is deleted.
* ``closure``: a lambda in the handler does not see the class name.
* ``prepare``: a ``__prepare__`` namespace sees the store, then
  ``__setitem__(name, None)`` and ``__delitem__(name)``.
* ``star``: ``except*`` in a class body, one clause and two (one deleting
  its name itself), and one re-raising.
* ``star_function`` / ``star_module``: ``except*`` in a function and at
  module level.
"""

import contextlib

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def has(cls, name):
    return (hasattr(cls, name), name in vars(cls))


# -- plain --------------------------------------------------------------

class PlainM:
    try:
        1 // 0
    except ZeroDivisionError as e:
        seen = type(e).__name__


def plain_l():
    class C:
        try:
            1 // 0
        except ZeroDivisionError as e:
            seen = type(e).__name__
    return C


record('plain_m', lambda: (PlainM.seen,) + has(PlainM, 'e'))
record('plain_l', lambda: (plain_l().seen,) + has(plain_l(), 'e'))


# -- bound before -------------------------------------------------------

class BoundBeforeM:
    e = 5
    try:
        1 // 0
    except ZeroDivisionError as e:
        pass


def bound_before_l():
    class C:
        e = 5
        try:
            1 // 0
        except ZeroDivisionError as e:
            pass
    return C


record('bound_before_m', lambda: has(BoundBeforeM, 'e'))
record('bound_before_l', lambda: has(bound_before_l(), 'e'))


# -- rebound / deleted in the handler -----------------------------------

class ReboundM:
    try:
        1 // 0
    except ZeroDivisionError as e:
        e = 7


class DelInHandlerM:
    try:
        1 // 0
    except ZeroDivisionError as e:
        del e
        gone = True


def del_in_handler_l():
    class C:
        try:
            1 // 0
        except ZeroDivisionError as e:
            e = 7
            del e
            gone = True
    return C


record('rebound_m', lambda: has(ReboundM, 'e'))
record('del_in_handler_m', lambda: (DelInHandlerM.gone,) + has(DelInHandlerM, 'e'))
record('del_in_handler_l', lambda: (del_in_handler_l().gone,) + has(del_in_handler_l(), 'e'))


# -- read / del after the handler ---------------------------------------

def read_after_m():
    class C:
        try:
            1 // 0
        except ZeroDivisionError as e:
            pass
        print(e)
    return 'no error'


def del_after_l():
    def inner():
        class C:
            try:
                1 // 0
            except ZeroDivisionError as e:
                pass
            del e
        return C
    try:
        inner()
    except NameError as exc:
        return str(exc)
    return 'no error'


record('read_after', read_after_m)
record('del_after', del_after_l)


# -- a module global of the same name -----------------------------------

shadow = 'module'


class ShadowsGlobalM:
    try:
        1 // 0
    except ZeroDivisionError as shadow:
        pass
    after = shadow


def shadows_global_l():
    shadow = 'outer'
    class C:
        try:
            1 // 0
        except ZeroDivisionError as shadow:
            pass
        after = shadow
    return C


record('shadows_global_m', lambda: (ShadowsGlobalM.after, shadow) + has(ShadowsGlobalM, 'shadow'))
record('shadows_global_l', lambda: (shadows_global_l().after,) + has(shadows_global_l(), 'shadow'))


# -- re-raise out of the handler ----------------------------------------

class ReraiseM:
    try:
        try:
            1 // 0
        except ZeroDivisionError as e:
            raise KeyError('k')
    except KeyError:
        caught = True


def reraise_l():
    class C:
        try:
            try:
                1 // 0
            except ZeroDivisionError as e:
                raise
        except ZeroDivisionError:
            caught = True
    return C


record('reraise_m', lambda: (ReraiseM.caught,) + has(ReraiseM, 'e'))
record('reraise_l', lambda: (reraise_l().caught,) + has(reraise_l(), 'e'))


# -- continue / break out of the handler --------------------------------

class LoopExitM:
    passes = 0
    for i in range(3):
        try:
            1 // 0
        except ZeroDivisionError as e:
            passes += 1
            if i == 0:
                continue
            break


def loop_exit_l():
    class C:
        passes = 0
        for i in range(3):
            try:
                1 // 0
            except ZeroDivisionError as e:
                passes += 1
                if i == 0:
                    continue
                break
    return C


record('loop_exit_m', lambda: (LoopExitM.passes,) + has(LoopExitM, 'e'))
record('loop_exit_l', lambda: (loop_exit_l().passes,) + has(loop_exit_l(), 'e'))


# -- nested handlers of the same name -----------------------------------

def nested_l():
    class C:
        try:
            try:
                1 // 0
            except ZeroDivisionError as e:
                inner = type(e).__name__
                raise ValueError('v')
        except ValueError as e:
            outer = type(e).__name__
    return C


class NestedM:
    try:
        try:
            1 // 0
        except ZeroDivisionError as e:
            raise ValueError('v')
    except ValueError as e:
        outer = type(e).__name__


record('nested_m', lambda: (NestedM.outer,) + has(NestedM, 'e'))
record('nested_l', lambda: (nested_l().inner, nested_l().outer) + has(nested_l(), 'e'))


# -- else / finally, with / if, two handlers ----------------------------

def else_finally_l():
    class C:
        try:
            1 // 0
        except ZeroDivisionError as e:
            ran = 'except'
        else:
            ran = 'else'
        finally:
            fin = True
    return C


@contextlib.contextmanager
def cm():
    yield 'cm'


class InWithIfM:
    with cm() as w:
        if w:
            try:
                1 // 0
            except ZeroDivisionError as e:
                pass


def two_handlers_l():
    class C:
        try:
            int('x')
        except ZeroDivisionError as e:
            which = 1
        except ValueError as e:
            which = 2
    return C


record('else_finally_l', lambda: (else_finally_l().ran, else_finally_l().fin) + has(else_finally_l(), 'e'))
record('in_with_if_m', lambda: (InWithIfM.w,) + has(InWithIfM, 'e'))
record('two_handlers_l', lambda: (two_handlers_l().which,) + has(two_handlers_l(), 'e'))


# -- a private name -----------------------------------------------------

class MangledM:
    try:
        1 // 0
    except ZeroDivisionError as __x:
        pass


record('mangled_m', lambda: sorted(k for k in vars(MangledM) if k.endswith('__x')))


# -- a lambda in the handler --------------------------------------------

def closure_l():
    class C:
        try:
            1 // 0
        except ZeroDivisionError as e:
            f = lambda: e
    try:
        C.f()
    except NameError as exc:
        return ('NameError', str(exc)) + has(C, 'e')
    return 'no error'


record('closure_l', closure_l)


# -- a __prepare__ namespace sees the cleanup ---------------------------

def prepare_l():
    log = []

    class NS(dict):
        def __setitem__(self, k, v):
            if k == 'e':
                log.append(('set', type(v).__name__))
            super().__setitem__(k, v)

        def __delitem__(self, k):
            if k == 'e':
                log.append(('del',))
            super().__delitem__(k)

    class Meta(type):
        @classmethod
        def __prepare__(mcs, name, bases):
            return NS()

    class C(metaclass=Meta):
        try:
            1 // 0
        except ZeroDivisionError as e:
            pass

    return tuple(log) + has(C, 'e')


record('prepare_l', prepare_l)


# -- except* --------------------------------------------------------------

class StarM:
    try:
        raise ExceptionGroup('g', [ValueError(1)])
    except* ValueError as e:
        n = len(e.exceptions)


def star_l():
    class C:
        try:
            raise ExceptionGroup('g', [ValueError(1), TypeError(2)])
        except* ValueError as e:
            del e
        except* TypeError as e:
            n = len(e.exceptions)
    return C


def star_reraise_l():
    class C:
        try:
            try:
                raise ExceptionGroup('g', [ValueError(1)])
            except* ValueError as e:
                raise KeyError('k')
        except KeyError:
            caught = True
    return C


def star_function():
    try:
        raise ExceptionGroup('g', [ValueError(1)])
    except* ValueError as e:
        seen = len(e.exceptions)
    try:
        e
    except NameError as exc:
        return (seen, type(exc).__name__, 'e' in locals())
    return 'no error'


try:
    raise ExceptionGroup('g', [ValueError(1)])
except* ValueError as star_module_name:
    star_module_seen = len(star_module_name.exceptions)


record('star_m', lambda: (StarM.n,) + has(StarM, 'e'))
record('star_l', lambda: (star_l().n,) + has(star_l(), 'e'))
record('star_reraise_l', lambda: (star_reraise_l().caught,) + has(star_reraise_l(), 'e'))
record('star_function', star_function)
record('star_module', lambda: (star_module_seen, 'star_module_name' in globals()))


EXPECTED = {
    'plain_m': ('ZeroDivisionError', False, False),
    'plain_l': ('ZeroDivisionError', False, False),
    'bound_before_m': (False, False),
    'bound_before_l': (False, False),
    'rebound_m': (False, False),
    'del_in_handler_m': (True, False, False),
    'del_in_handler_l': (True, False, False),
    'read_after': "NameError: name 'e' is not defined",
    'del_after': "name 'e' is not defined",
    'shadows_global_m': ('module', 'module', False, False),
    'shadows_global_l': ('module', False, False),
    'reraise_m': (True, False, False),
    'reraise_l': (True, False, False),
    'loop_exit_m': (2, False, False),
    'loop_exit_l': (2, False, False),
    'nested_m': ('ValueError', False, False),
    'nested_l': ('ZeroDivisionError', 'ValueError', False, False),
    'else_finally_l': ('except', True, False, False),
    'in_with_if_m': ('cm', False, False),
    'two_handlers_l': (2, False, False),
    'mangled_m': [],
    'closure_l': ('NameError', "name 'e' is not defined", False, False),
    'prepare_l': (('set', 'ZeroDivisionError'), ('set', 'NoneType'), ('del',), False, False),
    'star_m': (1, False, False),
    'star_l': (1, False, False),
    'star_reraise_l': (True, False, False),
    'star_function': (1, 'UnboundLocalError', False),
    'star_module': (1, False),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
