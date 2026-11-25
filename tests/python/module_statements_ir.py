"""Fixture: the simple module statements, built through IR, behave and report
frames as CPython does.

Grail's statement seam (P4.2, ModuleBodySeam) builds a module's expression
statements, assignments of every kind, imports, del, if / for / while, pass,
assert and raise as IR methods -- the module source of a run of them attached
as their Python, as an IR def's is -- and keeps the rest (defs, classes, try,
...) in text helpers.  module_statements_ir_body.py is such a body.  What has
to hold:

  * every statement computes what CPython computes, and runs once -- a
    decorated generic class, whose statements the parser synthesises at one
    offset, among them: the stores land in the module, annotated names reach ``__annotations__'' (a conditional one only
    when it ran), a module-level Final is bound, del unbinds;
  * the ``<module>'' frame reads the statement's own line inside an if, a for
    and a while body, and in ``inspect.stack()`` -- and, through IR, the line
    of a call on the second line of a statement spanning two (MULTILINE: the
    text arm reports the statement's first line there);
  * an uncaught error from an IR statement -- a for body, a failed assert, a
    raise, a NameError after del, a while body -- reaches the importer with a
    traceback whose module frame names the file and the line.

The text arm (GRAIL_IR_CODEGEN=0) compiles the same body as one text method and
must give the same answers, MULTILINE apart.  This file's own body is built the same way when
it runs as __main__.
"""
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
BODY = 'module_statements_ir_body'
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
    sys._grail_ir_stmt_probe = probe
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
        del sys._grail_ir_stmt_probe
        sys.modules.pop(BODY, None)
    return None


def raised_at(error, marker):
    return (error, [
        ('load_raising', marker_line('import', os.path.abspath(__file__)),
         os.path.basename(__file__)),
        ('<module>', marker_line(marker), BODY + '.py')])


m = load()
r = dict(m.R)
# The module frame's line during the SECOND line of a statement that spans
# two.  CPython reports the line of the call; Grail's IR helper does too, from
# its step points, but the text arm reports the statement's first line (its
# ``___curPos___'' store is per statement), so this is checked on its own:
# ModuleBodySeamTestCase asserts it through IR.
MULTILINE = r.pop('multiline')
MULTILINE_AGREES = MULTILINE == (marker_line('multiline_first'), marker_line('multiline_second'))
for probe in ('for', 'assert', 'raise', 'name', 'while'):
    r['uncaught_' + probe] = load_raising(probe)
r['main_frame'] = (sys._getframe(0).f_code.co_name,
                   sys._getframe(0).f_code.co_filename == __file__)

EXPECTED = {
    'plain': ('<module>', marker_line('plain'), True),
    'assignments': (3, 3, 3, 1, 2, [3, 4], 'a', ['b', 'c'], 28, [11, 20, 21], 49),
    'generic_class_once': (['Generic'], 'T'),
    'annotations': (5, 9, 'once', 42, 1.5),
    'annotation_keys': ['FINAL_TYPED', 'FINAL_VALUE', 'annotated', 'bare_annotation', 'conditional'],
    'bare_annotation_unbound': True,
    'imports': ('b.txt', os.path.join('p', 'q'), ['z'], 2),
    'star': (1, 4, 5, []),
    'deleted': True,
    'elif_frame': ('<module>', marker_line('elif_frame'), True),
    'branch': 'medium',
    'for_frame': ('<module>', marker_line('for_frame'), True),
    'for': (13, 6),
    'for_else': ('q', 2),
    'while_frame': ('<module>', marker_line('while_frame'), True),
    'while_else': 5,
    'walrus': 14,
    'stack': [('<module>', marker_line('stack'))],
    'f_back': True,
    'f_globals': True,
    'f_code': '<module>',
    'module_doc': 'Helper',
    'uncaught_for': raised_at('ZeroDivisionError', 'raise_for'),
    'uncaught_assert': raised_at('AssertionError', 'raise_assert'),
    'uncaught_raise': raised_at('KeyError', 'raise_raise'),
    'uncaught_name': raised_at('NameError', 'raise_name'),
    'uncaught_while': raised_at('ZeroDivisionError', 'raise_while'),
    'main_frame': ('<module>', True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print('%-5s %-40s -> %r' % ('OK' if MULTILINE_AGREES else 'FAIL', 'multiline', MULTILINE))
    print(SUMMARY)
