# Regression for module-level def with 4+ positional params
# resolving through ___moduleAttrLoad___.
#
# Pre-fix, ``module.fn`` from a Python ``def fn(a, b, c, d, e):''
# at module scope raised NameError because module>>___moduleAttrLoad___
# only checked arities 1..3 + varargs.  Surfaced in
# ``flask/cli.py`` whose ``def run_command(...)`` has 9 positional
# parameters.


def fn_9(a, b, c, d, e, f, g, h, i):
    return a + b + c + d + e + f + g + h + i


def fn_4(a, b, c, d):
    return [a, b, c, d]


def read_fn_9_as_value():
    """Read the bare name and check it's a callable (BoundMethod)."""
    return callable(fn_9)


def call_fn_9_via_value_read():
    """Bind to a local then call — exercises ___moduleAttrLoad___ +
    BoundMethod._call_."""
    f = fn_9
    return f(1, 2, 3, 4, 5, 6, 7, 8, 9)


def call_fn_4_via_value_read():
    f = fn_4
    return f(10, 20, 30, 40)


# --- module-level __name__ dunder read -----------------------------
# Regression: a bare ``__name__'' read resolved to a BoundMethod (the
# ``__name__:'' setter shadowed the accessor in ___moduleAttrLoad___),
# so ``__name__ == '<modname>'`` was always False.

_BODY_NAME = __name__


def body_name_matches():
    """__name__ captured at module-body time equals the module name."""
    return _BODY_NAME == 'module_higher_arity_def'


def func_name_matches():
    """__name__ read inside a function equals the module name."""
    return __name__ == 'module_higher_arity_def'


def name_main_guard():
    """The ``if __name__ == '__main__':`` idiom is False for an import."""
    if __name__ == '__main__':
        return 'is_main'
    return 'not_main'


def reads_optional_dunders_safely():
    """Bare reads of optional module dunders must return a value, not
    raise — this module has no docstring, so ``__doc__'' is absent.
    (Regression: the hardened accessors guard the dict read.)"""
    _doc = __doc__
    _pkg = __package__
    _spec = __spec__
    _loader = __loader__
    return True
