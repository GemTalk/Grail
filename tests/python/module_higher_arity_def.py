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
