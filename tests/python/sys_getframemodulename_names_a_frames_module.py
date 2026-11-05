"""Fixture: sys._getframemodulename names the module of a frame's function.

CPython's sys._getframemodulename(depth=0) answers the __module__ of the
function running ``depth'' frames above its caller, or None when the stack
is not that deep (Python/sysmodule.c:2597-2617); test_sys's
test_getframemodulename compares it with each frame's f_globals['__name__'].
Grail had none.  typing and dataclasses read it to name the module a TypeVar
or a made dataclass belongs to.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses
import sys
import typing

r = {}


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return type(exception).__name__


def names(depth):
    return sys._getframemodulename(depth)


def through_frames():
    return [sys._getframemodulename(i) == sys._getframe(i).f_globals['__name__'] for i in range(2)]


r['at_depth_zero_its_caller'] = attempt(lambda: [sys._getframemodulename() == __name__, names(0) == __name__,
                                                names(1) == __name__])
r['agrees_with_each_frames_globals'] = attempt(through_frames)
r['past_the_stack_none'] = attempt(lambda: sys._getframemodulename(10 ** 6))
namespace = {}
exec('import sys, typing\nmodule = sys._getframemodulename()\nnew = typing.NewType("New", int).__module__', namespace)
r['exec_d_without_a_name'] = [namespace.get('module', '<unset>'), namespace.get('new', '<unset>')]
r['what_reads_it_names_this_module'] = [dataclasses.make_dataclass('Made', []).__module__ == __name__,
                                        typing.TypeVar('T').__module__ == __name__]

EXPECTED = {
    'at_depth_zero_its_caller': [True, True, True],
    'agrees_with_each_frames_globals': [True, True],
    'past_the_stack_none': None,
    'exec_d_without_a_name': [None, '__main__'],
    'what_reads_it_names_this_module': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
