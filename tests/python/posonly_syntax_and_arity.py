"""Parameter-list placement rules, and the arity message's keyword-only tail.

Grail's parameter parser accepted every misplacement of ``/``: after
``*args``, after a bare ``*``, after ``**kwargs``, first, alone, twice --
and accepted a positional parameter without a default after one with a
default, the rule CPython words as ``parameter without a default follows
parameter with a default``.  test_positional_only_arg pins all of it, for
def, async def and lambda alike (one parser path serves the three).  The
refusals now live where the duplicate-name and bare-* checks already were,
with CPython's messages and precedence: after-* outranks only-once, the
after-**kwargs rule is the GENERAL ``arguments cannot follow var-keyword
argument`` (anything after ** -- a parameter, *, ** or /), and the bare
``def f(/)`` shape stays plain ``invalid syntax``.

The arity half: CPython's too-many-positional TypeError grows a
parenthetical when the call ALSO bound keyword-only parameters --
``f() takes 3 positional arguments but 6 positional arguments (and 2
keyword-only arguments) were given`` -- counts pluralized separately, the
verb fixed at ``were``.  Grail said ``but 6 were given`` regardless.  The
count is runtime (kw keys naming keyword-only parameters), emitted only
for defs that HAVE a keyword-only section so every other def keeps its
historical byte-identical guard.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}

DEFAULT_MSG = 'parameter without a default follows parameter with a default'


def refuses(name, src, fragment):
    try:
        compile(src + '\n', '<test>', 'exec')
        RESULTS[name] = 'compiled'
    except SyntaxError as exc:
        RESULTS[name] = (fragment in str(exc)) or 'msg: %s' % exc


def compiles(name, src):
    try:
        compile(src + '\n', '<test>', 'exec')
        RESULTS[name] = True
    except SyntaxError as exc:
        RESULTS[name] = 'raised: %s' % exc


# -- the slash placement family ----------------------------------------

refuses('slash_after_star_args', 'def f(*args, /): pass', '/ must be ahead of *')
refuses('slash_after_bare_star', 'def f(*, a, /): pass', '/ must be ahead of *')
refuses('slash_in_kwonly_section', 'def f(a, *, c, /, d, e): pass',
        '/ must be ahead of *')
refuses('slash_after_kwargs', 'def f(**kwargs, /): pass',
        'arguments cannot follow var-keyword argument')
refuses('param_after_kwargs', 'def f(**kw, a): pass',
        'arguments cannot follow var-keyword argument')
refuses('slash_twice', 'def f(a, /, c, /): pass', '/ may appear only once')
refuses('slash_twice_with_tail', 'def f(a, /, c, /, d, *, e): pass',
        '/ may appear only once')
refuses('slash_first', 'def f(/, a): pass', 'at least one argument must precede /')
refuses('slash_alone', 'def f(/): pass', 'invalid syntax')
refuses('async_slash_after_star', 'async def f(*args, /): pass',
        '/ must be ahead of *')
refuses('lambda_slash_alone', 'lambda /: None', 'invalid syntax')
refuses('lambda_slash_after_star', 'lambda *args, /: None', '/ must be ahead of *')

# -- default ordering ---------------------------------------------------

refuses('default_then_bare', 'def f(a=1, b): pass', DEFAULT_MSG)
refuses('default_then_bare_across_slash', 'def f(a, b=5, /, c): pass', DEFAULT_MSG)
refuses('default_before_slash_bare_after', 'def f(a=5, b=1, /, c, *, d=2): pass',
        DEFAULT_MSG)
refuses('async_default_ordering', 'async def f(a=5, b, /, c): pass', DEFAULT_MSG)
refuses('lambda_default_ordering', 'lambda a, b=5, /, c: None', DEFAULT_MSG)

# -- duplicates (pre-existing, pinned with the family) ------------------

refuses('duplicate_across_slash', 'def f(a, /, a): pass',
        "duplicate argument 'a' in function definition")
refuses('duplicate_into_kwonly', 'def f(a, /, *, a): pass',
        "duplicate argument 'a' in function definition")

# -- what stays legal ---------------------------------------------------

compiles('kwonly_bare_after_defaults', 'def f(a, b=1, *, c): pass')
compiles('star_args_after_defaults', 'def f(a=1, *args): pass')
compiles('kwargs_after_defaults', 'def f(a=1, **kw): pass')
compiles('posonly_defaults_matched', 'def f(a, b=10, /, c=100): pass')
compiles('full_signature', 'def f(a, b, /, c, d, *args, e, f_, **kw): pass')

# -- the arity parenthetical --------------------------------------------


def _msg(fn, *args, **kw):
    try:
        fn(*args, **kw)
        return 'NO RAISE'
    except TypeError as exc:
        return str(exc)


def outer():
    def f(a, b, c, *, d, e):
        pass
    return f


_f = outer()


def _g(a, *, b):
    pass


def _h(a, b, c):
    pass


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %s' % got


check('arity_pos_and_kwonly',
      _msg(_f, 1, 2, 3, 4, 5, 6, d=1, e=2),
      'outer.<locals>.f() takes 3 positional arguments but 6 positional '
      'arguments (and 2 keyword-only arguments) were given')

check('arity_singular_kwonly',
      _msg(_g, 1, 2, b=3),
      '_g() takes 1 positional argument but 2 positional arguments '
      '(and 1 keyword-only argument) were given')

check('arity_no_kwonly_bound_stays_plain',
      _msg(_f, 1, 2, 3, 4, 5, 6),
      'outer.<locals>.f() takes 3 positional arguments but 6 were given')

check('arity_plain_def_untouched',
      _msg(_h, 1, 2, 3, 4),
      '_h() takes 3 positional arguments but 4 were given')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
