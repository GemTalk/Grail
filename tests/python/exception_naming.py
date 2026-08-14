"""Fixtures for how a traceback names an exception, and for None rendering.

Driven by PythonTests>>TracebackTestCase.  Each function answers True when the
behaviour matches CPython, so a failure names the specific rule.
"""

import traceback


def _rendered_name(cls):
    """How CPython names a class in a rendered exception -- a transcription of
    traceback._get_exc_type_str.

    DERIVED rather than hardcoded, because both halves move between the two
    ways this file runs.  ``__module__'' is '__main__' when it runs as a script
    and 'exception_naming' when the harness imports it, and the module prefix
    is suppressed for '__main__' and 'builtins' (which is why ``ValueError: x''
    has no prefix).  ``__qualname__'' carries a '<locals>' segment for a class
    defined inside a function, so a function-local ``X'' renders as
    ``check.<locals>.X'', not ``X''.  Several checks below hardcoded the bare
    name and were therefore pinned to one context."""
    stype = cls.__qualname__
    smod = cls.__module__
    if smod not in ('__main__', 'builtins'):
        if not isinstance(smod, str):
            smod = '<unknown>'
        stype = smod + '.' + stype
    return stype


class ModuleLevelError(Exception):
    # The explicit __init__ is deliberate.  A subclass with an EMPTY body does
    # not record args in Grail today -- ``class E(Exception): pass'' then
    # ``E("boom").args'' answers () where CPython answers ("boom",), so str()
    # is '' and the message vanishes from the render.  That is a separate
    # defect (see the module docstring of the test method); chaining to
    # super().__init__ here keeps this fixture about the NAMING rule.
    def __init__(self, msg):
        super().__init__(msg)


class Outer:
    class Inner(Exception):
        def __str__(self):
            return 'I am Inner'


def builtin_exceptions_are_not_module_qualified():
    """CPython omits the module for builtins and __main__, so the everyday
    render is unchanged -- ``ValueError: x'', never ``builtins.ValueError: x''.

    KeyError carries its own expected text rather than sharing the loop's: its
    message is the REPR of the argument, so it renders "KeyError: 'x'".  This
    check used to assert an unquoted "KeyError: x" along with the rest, which
    made it FALSE under real CPython -- it was pinning a Grail bug, and catching
    exactly that is the point of running these fixtures standalone.
    """
    out = []
    for cls in (ValueError, TypeError, ZeroDivisionError, OSError):
        out.append(''.join(traceback.format_exception_only(cls('x')))
                   == cls.__name__ + ": x\n")
    out.append(''.join(traceback.format_exception_only(KeyError('x')))
               == "KeyError: 'x'\n")
    return all(out)


def library_exceptions_are_module_qualified():
    """An exception defined in a module renders module-qualified, which is what
    CPython does and what test_traceback's modulename/qualname tests assert."""
    text = ''.join(traceback.format_exception_only(ModuleLevelError('boom')))
    return (text == '%s: boom\n' % _rendered_name(ModuleLevelError)
            # ...and the prefix really is present when imported as a module,
            # which is the actual subject here.  Under `python3 thisfile.py'
            # __module__ is '__main__' and CPython suppresses it by design.
            and (ModuleLevelError.__module__ == '__main__'
                 or text.startswith(ModuleLevelError.__module__ + '.')))


def nested_exceptions_use_qualname():
    """__qualname__, not __name__, so the nesting shows."""
    text = ''.join(traceback.format_exception_only(Outer.Inner()))
    # Grail's __qualname__ for a nested class is what it is (see the test
    # method's comment); assert consistency with the attribute rather than a
    # hardcoded string, exactly as CPython's own test does.
    expected = '%s: I am Inner\n' % _rendered_name(Outer.Inner)
    # The nesting itself is the subject, so assert the qualname is compound
    # separately -- _rendered_name would happily agree with a bare 'Inner'.
    return text == expected and '.' in Outer.Inner.__qualname__


def a_non_str_module_renders_as_unknown():
    """__module__ is a plain writable attribute, so it can be anything; CPython
    renders a non-str one as '<unknown>'."""
    class X(Exception):
        def __str__(self):
            return 'I am X'

    X.__module__ = 42
    got = ''.join(traceback.format_exception_only(X()))
    # _rendered_name supplies the '<unknown>.' and the '<locals>' segment; the
    # rule under test is that a non-str module becomes '<unknown>' rather than
    # raising or rendering the 42.
    if got != '%s: I am X\n' % _rendered_name(X):
        return False
    if not got.startswith('<unknown>.'):
        return False
    X.__module__ = 'some_module'
    return (''.join(traceback.format_exception_only(X()))
            == '%s: I am X\n' % _rendered_name(X))


def a_none_exception_renders_as_nonetype_none():
    """CPython does not special-case a None exception: type(None) is NoneType,
    so print_exception(None) renders 'NoneType: None' rather than a blank
    line.  All three entry shapes agree."""
    return (''.join(traceback.format_exception_only(None)) == 'NoneType: None\n'
            and ''.join(traceback.format_exception_only(None, None)) == 'NoneType: None\n'
            and ''.join(traceback.format_exception(None, None, None)) == 'NoneType: None\n'
            and traceback.format_exc() == 'NoneType: None\n')


def a_legacy_type_is_ignored_when_a_value_is_given():
    """KNOWN GRAIL GAP -- this states CPython and Grail does not match it yet.

    CPython's module-level legacy entry points DERIVE the type from the value
    and ignore the type they were handed.  The CLASS does not -- it keeps the
    type it was constructed with.  Both sides were measured rather than reasoned
    about, in CPython 3.14.6 and in Grail:

                                                 CPython        Grail
        format_exception_only(ValueError, None)  NoneType: None ValueError
        format_exception(ValueError, None, None) NoneType: None TypeError!
        TracebackException(ValueError,None,None) ValueError: None   --

    Grail matches neither CPython path, and it does not even fail the same way
    twice.  format_exception_only carries a ``derived'' flag and reads "value is
    None and not derived" as "no message at all", giving the bare name;
    format_exception instead reaches the single-argument guard, which rejects a
    TYPE as a value and raises ``Exception expected for value, type found''.

    This check used to assert Grail's 'ValueError\\n' as though it were
    CPython's rule, which is what made it a fixture pinning a bug.  Fixing it
    properly means reworking that flag AND leaving the class path alone, so it
    is left failing here on purpose and TracebackTestCase no longer asserts it.
    The second clause below RAISES under Grail rather than answering False --
    which is why nothing in the harness may call this until it is fixed.
    """
    return (''.join(traceback.format_exception_only(ValueError, None))
                == 'NoneType: None\n'
            and ''.join(traceback.format_exception(ValueError, None, None))
                == 'NoneType: None\n')


def a_none_argument_is_not_a_missing_message():
    """str(exc) for one argument is str(args[0]) -- the PYTHON str protocol.
    Smalltalk #asString answered the arg's printString instead, so
    Exception(None) rendered as 'Exception: aNoneType'."""
    return (''.join(traceback.format_exception_only(Exception(None)))
                == 'Exception: None\n'
            and ''.join(traceback.format_exception_only(Exception('None')))
                == 'Exception: None\n'
            and ''.join(traceback.format_exception_only(Exception()))
                == 'Exception\n'
            and ''.join(traceback.format_exception_only(Exception('')))
                == 'Exception\n')


def non_string_arguments_use_python_str():
    """The same rule for any object whose Smalltalk printString differs from
    its Python __str__."""
    class Thing:
        def __str__(self):
            return 'the thing'

    return (''.join(traceback.format_exception_only(Exception(Thing())))
                == 'Exception: the thing\n'
            and ''.join(traceback.format_exception_only(Exception(42)))
                == 'Exception: 42\n'
            and ''.join(traceback.format_exception_only(Exception([1, 2])))
                == 'Exception: [1, 2]\n')


def a_broken_str_is_reported_not_propagated():
    """Rendering an exception must never raise a second one."""
    class Broken(Exception):
        def __str__(self):
            raise ValueError('bad')

    Broken.__module__ = 'builtins'      # keep the module prefix suppressed
    return (''.join(traceback.format_exception_only(Broken()))
            == '%s: <exception str() failed>\n' % _rendered_name(Broken))


def print_exc_takes_limit_first():
    """CPython's signature is print_exc(limit=None, file=None, chain=True).
    It used to be print_exc(file=None) here, so a caller writing CPython's
    ``print_exc(None, file=f)'' bound None to the wrong parameter."""
    from io import StringIO
    out = StringIO()
    traceback.print_exc(None, file=out)
    return out.getvalue() == 'NoneType: None\n'


def print_last_reads_sys_last_exc():
    """print_last renders sys.last_exc (3.12+), and raises ValueError -- not
    an empty render -- when there is no last exception."""
    import sys
    from io import StringIO

    had = hasattr(sys, 'last_exc')
    if not had:
        try:
            traceback.print_last(file=StringIO())
            return False
        except ValueError:
            pass

    sys.last_exc = ValueError(42)
    try:
        out = StringIO()
        traceback.print_last(file=out)
        if out.getvalue() != 'ValueError: 42\n':
            return False
    finally:
        if not had:
            del sys.last_exc
    return True


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        builtin_exceptions_are_not_module_qualified,
        library_exceptions_are_module_qualified,
        nested_exceptions_use_qualname,
        a_non_str_module_renders_as_unknown,
        a_none_exception_renders_as_nonetype_none,
        a_legacy_type_is_ignored_when_a_value_is_given,
        a_none_argument_is_not_a_missing_message,
        non_string_arguments_use_python_str,
        a_broken_str_is_reported_not_propagated,
        print_exc_takes_limit_first,
        print_last_reads_sys_last_exc,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
