"""``__init_subclass__`` bound by a CLASS BODY, and found along the MRO.

Two things this pins, both measured against CPython 3.14.6.

**PEP 487's implicit classmethod.** ``type.__new__`` wraps whatever it finds
under ``__init_subclass__`` in the class namespace with ``classmethod``, so the
hook receives the new class as its first argument -- however the name got into
that namespace.  A ``def`` at the top of the body is the usual spelling, but a
``def`` inside an ``if``, a ``for``, a ``try`` or a ``with`` is the same
binding, and so is ``__init_subclass__ = classmethod(fn)`` or
``__init_subclass__ = fn``.  All of them get the class.

That is NOT true of a hook installed by ``setattr`` after the class exists:
``super(cls, cls).__init_subclass__`` looks it up with a NULL instance, so a
plain function comes back unbound and receives nothing, while a ``classmethod``
comes back bound and receives the class.  ``tests/python/init_subclass_assigned.py``
pins the setattr half; this file pins the class-body half, and the difference
between them is the whole point of having both.

pip's ``annotated-types`` writes its hook under ``if not TYPE_CHECKING:`` and
died on this with ``GroupedMetadata.__init_subclass__() missing 1 required
positional argument: 'cls'``.

**Resolution along the MRO.** The hook is found by walking the new class's
bases in order, not just its first base, so a hook DEFINED on a secondary base
runs.  Without that the class keyword travelled on to ``object``'s terminal
hook and was rejected, naming ``object`` for a hook that was sitting on the
second base.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


SEEN = []


def _record(cls, kwargs):
    SEEN.append((getattr(cls, '__name__', repr(cls)), dict(kwargs)))


# ------------------------------------------- the implicit classmethod

def _a_def_under_if_receives_the_class():
    del SEEN[:]
    flag = True

    class Base:
        if flag:
            def __init_subclass__(cls, **kwargs):
                _record(cls, kwargs)

    class Sub(Base, colour='red'):
        pass

    return SEEN


check('a_def_under_if_receives_the_class',
      _a_def_under_if_receives_the_class, [('Sub', {'colour': 'red'})])


def _a_def_under_for_receives_the_class():
    del SEEN[:]

    class Base:
        for _once in (1,):
            def __init_subclass__(cls, **kwargs):
                _record(cls, kwargs)
        del _once

    class Sub(Base, colour='green'):
        pass

    return SEEN


check('a_def_under_for_receives_the_class',
      _a_def_under_for_receives_the_class, [('Sub', {'colour': 'green'})])


def _a_def_under_try_receives_the_class():
    del SEEN[:]

    class Base:
        try:
            def __init_subclass__(cls, **kwargs):
                _record(cls, kwargs)
        except Exception:
            pass

    class Sub(Base, colour='blue'):
        pass

    return SEEN


check('a_def_under_try_receives_the_class',
      _a_def_under_try_receives_the_class, [('Sub', {'colour': 'blue'})])


def _a_body_classmethod_assignment_runs():
    """``__init_subclass__ = classmethod(fn)`` in the body.  This one did not
    run AT ALL -- no error, no hook -- because an assignment compiles no
    method for the definition search to find, and the assignment search read
    only two of the three homes a class attribute can have."""
    del SEEN[:]

    def hook(cls, **kwargs):
        _record(cls, kwargs)

    class Base:
        __init_subclass__ = classmethod(hook)

    class Sub(Base, colour='violet'):
        pass

    return SEEN


check('a_body_classmethod_assignment_runs',
      _a_body_classmethod_assignment_runs, [('Sub', {'colour': 'violet'})])


def _a_body_plain_assignment_receives_the_class():
    del SEEN[:]

    def hook(cls, **kwargs):
        _record(cls, kwargs)

    class Base:
        __init_subclass__ = hook

    class Sub(Base, colour='amber'):
        pass

    return SEEN


check('a_body_plain_assignment_receives_the_class',
      _a_body_plain_assignment_receives_the_class,
      [('Sub', {'colour': 'amber'})])


def _a_body_hook_with_no_keywords_still_gets_the_class():
    del SEEN[:]
    flag = True

    class Base:
        if flag:
            def __init_subclass__(cls, **kwargs):
                _record(cls, kwargs)

    class Sub(Base):
        pass

    return SEEN


check('a_body_hook_with_no_keywords_still_gets_the_class',
      _a_body_hook_with_no_keywords_still_gets_the_class, [('Sub', {})])


def _a_star_args_hook_gets_the_class_positionally():
    """annotated-types' exact signature."""
    del SEEN[:]
    flag = True
    shapes = []

    class Base:
        if flag:
            def __init_subclass__(cls, *args, **kwargs):
                shapes.append((getattr(cls, '__name__', None), args))

    class Sub(Base):
        pass

    return shapes


check('a_star_args_hook_gets_the_class_positionally',
      _a_star_args_hook_gets_the_class_positionally, [('Sub', ())])


# ------------------------------------------- resolution along the MRO

class _Left:
    pass


class _Middle:
    def __init_subclass__(cls, **kwargs):
        _record(cls, kwargs)


class _Right:
    pass


def _a_secondary_base_hook_runs():
    del SEEN[:]

    class Child(_Left, _Middle, _Right, middle='yes'):
        pass

    return SEEN


check('a_secondary_base_hook_runs', _a_secondary_base_hook_runs,
      [('Child', {'middle': 'yes'})])


class _First:
    def __init_subclass__(cls, **kwargs):
        SEEN.append(('first', dict(kwargs)))


class _Second:
    def __init_subclass__(cls, **kwargs):
        SEEN.append(('second', dict(kwargs)))


def _the_first_base_that_supplies_one_wins():
    """MRO order, so the leftmost base carrying a hook is the one that runs --
    exactly one hook, not both."""
    del SEEN[:]

    class Child(_First, _Second, tag=1):
        pass

    return SEEN


check('the_first_base_that_supplies_one_wins',
      _the_first_base_that_supplies_one_wins, [('first', {'tag': 1})])


def _a_secondary_base_hook_runs_without_keywords():
    del SEEN[:]

    class Child(_Left, _Middle):
        pass

    return SEEN


check('a_secondary_base_hook_runs_without_keywords',
      _a_secondary_base_hook_runs_without_keywords, [('Child', {})])


def _no_hook_on_any_base_still_rejects_a_keyword():
    try:
        class Child(_Left, _Right, oops=1):
            pass
    except TypeError as exc:
        return str(exc)
    return 'NOT RAISED'


# The QUALNAME, ``<locals>'' and all -- CPython 3.14 builds the message from
# ``__qualname__``, so pinning the bare name would pass for the wrong reason.
check('no_hook_on_any_base_still_rejects_a_keyword',
      _no_hook_on_any_base_still_rejects_a_keyword,
      '_no_hook_on_any_base_still_rejects_a_keyword.<locals>.Child'
      '.__init_subclass__() takes no keyword arguments')


# ------------------------------------------- the message names the class

def _the_message_names_the_class_being_created():
    class Plain:
        pass

    try:
        class Mistyped(Plain, flavuor='vanilla'):
            pass
    except TypeError as exc:
        return str(exc)
    return 'NOT RAISED'


check('the_message_names_the_class_being_created',
      _the_message_names_the_class_being_created,
      '_the_message_names_the_class_being_created.<locals>.Mistyped'
      '.__init_subclass__() takes no keyword arguments')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
