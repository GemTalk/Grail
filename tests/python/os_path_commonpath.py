"""os.path.commonpath answers what CPython's posixpath.commonpath does.

Grail's own Smalltalk version was wrong four ways: two absolute paths sharing
only the root raised ValueError("Paths do not start from a common point")
instead of answering '/', a relative pair came back absolute ('a/b', 'a/c' ->
'/a'), mixing absolute and relative raised that same wrong message, and bytes
failed with an uncatchable Smalltalk ArgumentTypeError.

The first is the one that cost: pytest's rootdir is the common ancestor of the
invocation directory and the test paths, with '/' meaning "unrelated, use the
test path" (is_fs_root).  The ValueError made pytest fall back to the
invocation directory instead, so collection walked down from '/' through every
entry of /private/tmp -- 264s of a 270s run, for 14 tests.

Every expectation here was measured against CPython 3.14.
"""

import os.path

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _attempt(*paths):
    try:
        return os.path.commonpath(paths)
    except (ValueError, TypeError) as exc:
        return '%s: %s' % (type(exc).__name__, exc)


check('only_the_root_in_common', _attempt('/Users/a/b', '/opt/c'), '/')
check('a_shared_prefix', _attempt('/a/b/c', '/a/b/d'), '/a/b')
check('one_contains_the_other', _attempt('/a', '/a/b'), '/a')
check('the_root_and_a_child', _attempt('/', '/a'), '/')
check('relative_paths_stay_relative', _attempt('a/b', 'a/c'), 'a')
check('relative_with_nothing_in_common', _attempt('a/b', 'c/d'), '')
check('redundant_separators_and_trailing_slash', _attempt('/a//b/', '/a/b/c'), '/a/b')
check('dot_components_are_dropped', _attempt('/a/./b', '/a/b/c'), '/a/b')
check('a_single_path', _attempt('/a/b'), '/a/b')
check('component_not_character_prefix', _attempt('/usr/lib', '/usr/local'), '/usr')
check('an_empty_sequence', _attempt(), 'ValueError: commonpath() arg is an empty sequence')
check('absolute_and_relative', _attempt('/a', 'b'),
      "ValueError: Can't mix absolute and relative paths")
check('str_and_bytes', _attempt('/a', b'/b'),
      "TypeError: Can't mix strings and bytes in path components")
check('bytes', _attempt(b'/x/y', b'/x/z'), b'/x')
check('a_generator_argument', os.path.commonpath(p for p in ('/a/b', '/a/c')), '/a')


# pytest's own use, _pytest.config.findpaths.get_common_ancestor reduced to the
# lines that matter: an unrelated pair has the root as its ancestor.
def _pytest_shaped(invocation_dir, test_dir):
    shared = os.path.commonpath((invocation_dir, test_dir))
    return shared == os.path.dirname(shared)          # is_fs_root


check('pytest_sees_an_unrelated_tree_as_rooted_at_slash',
      _pytest_shaped('/Users/someone/project', '/opt/elsewhere/tests'), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
