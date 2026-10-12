"""Fixture: a traceback ends at the frame that CAUGHT, not at the first frame
that has the catcher's name (#1401).

Grail's traceback walk recognised the catching frame by its function name.  So
any frame between the raise and the catch with that same name was taken for
the catcher: it was given the catcher's line and file, and the walk stopped
there.  Three ordinary shapes have such a frame:

* a module whose body raises, imported inside a module-level ``try``: both
  frames are ``<module>``.  The imported module's frame vanished, and the
  importer's frame was reported in the imported file -- at a line number that
  file has blank, so its text came out None;
* a recursive function caught by an outer call of itself: only the innermost
  call was reported;
* a function defined in exec'd code with the catcher's name.

Every check is verified against CPython by running the file directly.
CPython's own import-machinery frames (``<frozen importlib._bootstrap>``) are
left out, as they are not Python frames of either program.
"""

import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = 'unexpected %s: %s' % (type(exc).__name__, exc)


def frames(exc):
    return [(fs.name, os.path.basename(fs.filename), fs.lineno, fs.line)
            for fs in traceback.extract_tb(exc.__traceback__)
            if not fs.filename.startswith('<frozen')]


def names_and_lines(exc):
    return [(fs.name, fs.lineno) for fs in traceback.extract_tb(exc.__traceback__)]


def import_raising_module():
    sys.modules.pop('catching_frame_module_helper', None)
    try:
        import catching_frame_module_helper  # noqa: F401
    except ValueError as e:
        return frames(e)


def recurse(n, catch):
    if n == 0:
        raise ValueError('bottom')
    if catch:
        try:
            recurse(n - 1, False)
        except ValueError as e:
            return names_and_lines(e)
    else:
        recurse(n - 1, False)


def recurse_inner_except_does_not_match(n):
    if n == 0:
        raise ValueError('bottom')
    try:
        return recurse_inner_except_does_not_match(n - 1)
    except KeyError:
        return 'inner KeyError handler ran'


def outer_catches_through_non_matching_handlers():
    try:
        recurse_inner_except_does_not_match(2)
    except ValueError as e:
        return names_and_lines(e)


def recurse_every_level_catches(n):
    if n == 0:
        raise ValueError('bottom')
    try:
        return recurse_every_level_catches(n - 1)
    except ValueError as e:
        return names_and_lines(e)



def g():
    try:
        h()
    except ValueError as e:
        return [fs.name for fs in traceback.extract_tb(e.__traceback__)]


def h():
    exec("def g():\n    raise ValueError('y')\ng()", {})


def plain_catch():
    try:
        recurse(0, False)
    except ValueError as e:
        return names_and_lines(e)


# The issue's own shape: the ``try`` at MODULE level, so the catcher is a
# ``<module>`` frame too.
sys.modules.pop('catching_frame_module_helper', None)
try:
    import catching_frame_module_helper  # noqa: F401
except ValueError as _e:
    r['import_inside_a_module_level_try'] = frames(_e)

record('import_raising_module', import_raising_module)
record('recursive_catch_reports_every_call', lambda: recurse(3, True))
record('non_matching_inner_handlers_are_not_the_catcher',
       outer_catches_through_non_matching_handlers)
record('innermost_matching_handler_is_the_catcher',
       lambda: recurse_every_level_catches(3))
record('same_name_function_in_exec', g)
record('plain_catch', plain_catch)


EXPECTED = {
    'import_inside_a_module_level_try': [
        ('<module>', 'catching_frame_identity.py', 116,
         'import catching_frame_module_helper  # noqa: F401'),
        ('<module>', 'catching_frame_module_helper.py', 10, 'raising(1)'),
        ('raising', 'catching_frame_module_helper.py', 7,
         'raise ValueError("plain raised")'),
    ],
    'import_raising_module': [
        ('import_raising_module', 'catching_frame_identity.py', 51,
         'import catching_frame_module_helper  # noqa: F401'),
        ('<module>', 'catching_frame_module_helper.py', 10, 'raising(1)'),
        ('raising', 'catching_frame_module_helper.py', 7,
         'raise ValueError("plain raised")'),
    ],
    'recursive_catch_reports_every_call': [
        ('recurse', 61), ('recurse', 65), ('recurse', 65), ('recurse', 58)],
    'non_matching_inner_handlers_are_not_the_catcher': [
        ('outer_catches_through_non_matching_handlers', 79),
        ('recurse_inner_except_does_not_match', 72),
        ('recurse_inner_except_does_not_match', 72),
        ('recurse_inner_except_does_not_match', 70)],
    'innermost_matching_handler_is_the_catcher': [
        ('recurse_every_level_catches', 88), ('recurse_every_level_catches', 86)],
    'same_name_function_in_exec': ['g', 'h', '<module>', 'g'],
    'plain_catch': [('plain_catch', 107), ('recurse', 58)],
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-50s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-50s is not in EXPECTED' % ('FAIL', extra))
