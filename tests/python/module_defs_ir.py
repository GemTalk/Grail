"""Fixture: top-level def statements, built through IR, behave and report
frames as CPython does.

Grail compiles a module-level def's FUNCTION to a method of the module class
before the body runs; the def STATEMENT records what the method cannot carry
-- the PEP 649 annotate function, the inspect.signature spec, the default
values -- and applies the decorators.  Since P4.3a the statement seam
(ModuleBodySeam) builds that statement through IR, in a helper with the simple
statements around it, and so a def inside a module-level if or loop.
module_defs_ir_body.py is such a body.  What has to hold:

  * signatures, defaults (shared, writable), keyword-only defaults,
    annotations (a forward reference too), docstrings, async defs and PEP 695
    type parameters are CPython's;
  * decorators are evaluated top-down and applied bottom-up, each at its own
    line in the ``<module>'' frame, and a later def rebinds a decorated name;
  * a def in an if or a loop binds when its statement runs;
  * the module frame's code object starts at line 1 (#2358);
  * an uncaught error from a decorator, or from a decorator's expression,
    reaches the importer with the decorator's line in the module frame.

The text arm (GRAIL_IR_CODEGEN=0) compiles the same body as one text method
and must give the same answers.

What it does NOT check: a name used above its def.  Grail binds every
top-level def before the body runs, on both arms (#2166), so a read of the
name there finds the function where CPython raises NameError.
"""
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
BODY = 'module_defs_ir_body'
BODY_FILE = os.path.join(HERE, BODY + '.py')


def marker_line(name, path=BODY_FILE):
    with open(path) as f:
        for n, text in enumerate(f, 1):
            if text.rstrip().endswith('# @' + name):
                return n
    raise LookupError(name)


def load():
    sys.modules.pop(BODY, None)
    return __import__(BODY)


def load_raising(probe):
    sys.modules.pop(BODY, None)
    sys._grail_ir_def_probe = probe
    try:
        __import__(BODY)  # @import
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        # CPython drops importlib's own frames from an import's traceback;
        # Grail has none to drop.
        return (type(e).__name__,
                [(f.name, f.lineno, os.path.basename(f.filename))
                 for f in tb if not f.filename.startswith('<frozen')])
    finally:
        del sys._grail_ir_def_probe
        sys.modules.pop(BODY, None)
    return None


def raised_at(error, marker, *inner):
    return (error, [
        ('load_raising', marker_line('import', os.path.abspath(__file__)),
         os.path.basename(__file__)),
        ('<module>', marker_line(marker), BODY + '.py')] + list(inner))


m = load()
r = dict(m.R)
for probe in ('decorator', 'decorator_expr'):
    r['uncaught_' + probe] = load_raising(probe)
r['main_code'] = (sys._getframe(0).f_code.co_name, sys._getframe(0).f_code.co_firstlineno)

EXPECTED = {
    'plain': ((1, 2, (), 3, True, (1, 'x'), {}), ['a', 'b', 'args', 'c', 'd', 'e', 'kw'],
              (2,), True, (1, 'x'), 'A docstring.', 'plain'),
    'mutable_default': ([1, 2], ([1, 2],)),
    'annotations': (int, 'Later', True),
    'decorated': ('decorated', ('inner', 'outer'),
                  [('make', 'outer'), ('make', 'inner'),
                   ('apply', 'inner', '<module>', marker_line('inner')),
                   ('apply', 'outer', '<module>', marker_line('outer'))]),
    'wrapped': (('wrapped', 8), 'twice', 10),
    'rebound': 'second',
    'classmethod': 'classmethod',
    'async': (7, True, (7,)),
    'deco_line': ('<module>', marker_line('generic_deco')),
    'generic': (3, 'T', 'generic'),
    'generic_default': ((5, 6), (5,), {'k': 6}),
    'conditional': 'then',
    'looped': 2,
    'nested_decorated': (3, ('nested',), [('make', 'nested'),
                                          ('apply', 'nested', '<module>', marker_line('nested'))]),
    'module_code': ('<module>', 1),
    'def_code': ('plain', marker_line('plain_def')),
    'signature': ('(x, acc=[1, 2])', '(a, /, b: int = 3, *, k=None) -> None'),
    'kwdefaults': 5,
    'write_defaults': 9,
    'uncaught_decorator': raised_at('KeyError', 'raise_decorator',
                                    ('boom', marker_line('boom'), BODY + '.py')),
    'uncaught_decorator_expr': raised_at('ZeroDivisionError', 'raise_decorator_expr'),
    'main_code': ('<module>', 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
