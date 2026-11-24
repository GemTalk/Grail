"""Fixture: a module body run as several methods still has exactly one
``<module>`` frame, with the right file and line.

Grail's statement seam (P4.1, ModuleBodySeam) compiles a module body on the IR
arm as an ``initialize`` that only SENDS to statement helpers, each holding a
run of statements, and a class statement in a helper of its own.  CPython has
one frame for the body.  So the helper running a statement has to read as that
frame -- named ``<module>``, filed under the module's own file, at the
statement's line -- and the ``initialize`` that called it must not read as a
frame at all, or every ``sys._getframe(n)`` above the body would be off by one.

module_body_frames_big.py is long enough to be split: its ``@early`` probes run
in the first helper and its ``@late`` probes in the second.  Each probe records
what a module frame reports; this file checks the records against CPython 3.14,
reading every expected line from a ``# @marker`` comment in that file, so the
numbers move with the text.  load_raising() imports it a second time with an
uncaught raise at the end of the body, which is the traceback that has to walk
from a helper, past the dispatcher, to the importer.

The text arm (GRAIL_IR_CODEGEN=0) compiles the body as one method and must give
the same answers; it is the oracle for the IR arm.
"""
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
BIG = 'module_body_frames_big'
BIG_FILE = os.path.join(HERE, BIG + '.py')


def marker_line(name, path=BIG_FILE):
    with open(path) as f:
        for n, text in enumerate(f, 1):
            if text.rstrip().endswith('# @' + name):
                return n
    raise LookupError(name)


def load():
    sys.modules.pop(BIG, None)
    return __import__(BIG)


def load_raising():
    sys.modules.pop(BIG, None)
    sys._grail_seam_probe_raise = True
    try:
        __import__(BIG)  # @import
    except ValueError as e:
        tb = traceback.extract_tb(e.__traceback__)
        # CPython drops importlib's own frames from an import's traceback;
        # Grail has none to drop.
        return [(f.name, f.lineno, os.path.basename(f.filename))
                for f in tb if not f.filename.startswith('<frozen')]
    finally:
        del sys._grail_seam_probe_raise
        sys.modules.pop(BIG, None)
    return None


r = {}
m = load()
r['early_frame'] = m.EARLY
r['late_frame'] = m.LATE
# The module frame, then the importer: one frame for the body, never two.
r['early_frames_up_to_the_importer'] = m.EARLY_FRAMES[:2]
r['late_frames_up_to_the_importer'] = m.LATE_FRAMES[:2]
r['early_inspect_stack'] = m.EARLY_STACK
r['late_inspect_stack'] = m.LATE_STACK
r['early_globals_are_the_module'] = m.EARLY_GLOBALS
r['late_globals_are_the_module'] = m.LATE_GLOBALS
r['early_traceback'] = m.EARLY_TB
r['late_traceback'] = m.LATE_TB
r['module_frame_during_a_class_statement'] = m.Probe.BACK
r['every_statement_ran'] = (m.fill449, m.more19)
r['uncaught_raise_from_a_later_helper'] = load_raising()
r['main_module_frame'] = (sys._getframe(0).f_code.co_name,
                          sys._getframe(0).f_code.co_filename == __file__)

EXPECTED = {
    'early_frame': ('<module>', marker_line('early'), True),
    'late_frame': ('<module>', marker_line('late'), True),
    'early_frames_up_to_the_importer': [('<module>', True), ('load', False)],
    'late_frames_up_to_the_importer': [('<module>', True), ('load', False)],
    'early_inspect_stack': [('<module>', marker_line('early_stack'))],
    'late_inspect_stack': [('<module>', marker_line('late_stack'))],
    'early_globals_are_the_module': (True, True),
    'late_globals_are_the_module': (True, False, True),
    'early_traceback': [('<module>', marker_line('early_raise'), True)],
    'late_traceback': [('<module>', marker_line('late_raise'), True)],
    'module_frame_during_a_class_statement': (marker_line('class'), True, 'load'),
    'every_statement_ran': (449, 19),
    'uncaught_raise_from_a_later_helper': [
        ('load_raising', marker_line('import', os.path.abspath(__file__)), os.path.basename(__file__)),
        ('<module>', marker_line('uncaught'), BIG + '.py')],
    'main_module_frame': ('<module>', True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
