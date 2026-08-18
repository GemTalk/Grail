"""Fixture: ``from X import *'' inside exec().

At module-compile time Grail REWRITES a star import into an explicit name list:
importlib >> expandStarImports: reads the target module's ``__all__'' (or its
public top-level names), replaces the ``*'' alias with those names, and declares
each one on the importing body so it gets a slot.  A doit -- exec(), eval(), the
REPL -- never ran that rewrite, so codegen reached the alias list with the
literal ``*'' still in it and emitted

    * := (... ___pyAttrLoad___: #'*').

which is not Smalltalk.  The result was a CompileError, and a CompileError is
NOT a Python exception: it took down the whole exec() and could not be caught,
so a caller could not even fall back.  The module-level spelling of the same
import has always worked, which is why this survived.

``uncatchable_before'' is the check that speaks to the failure MODE rather than
the names: the star import is wrapped in try/except, which under the old
behaviour did not help at all.

WHAT IS GIVEN UP in a doit is the runtime merge step.  A module-level star
import also emits ``self ___mergePublicAttrsFrom: X'', which catches names that
appear only at run time (something a helper injected via globals().update()).
An exec'd body has no module instance -- ``self'' is nil there -- so that send
would be a doesNotUnderstand on nil, which is exactly the uncatchable failure
being removed.  The parse-time expansion covers every name the module declares
statically, which is what a star import means in practice.
"""


def catch(fn):
    try:
        return ['ok', fn()]
    except BaseException as e:
        return type(e).__name__


def star_into_exec_namespace():
    ns = {}
    exec("from bisect import *", ns)
    return sorted(k for k in ns if not k.startswith('__'))


def the_names_are_usable():
    ns = {}
    exec("from bisect import *\nout = bisect_left([1, 2, 3], 2)", ns)
    return ns['out']


def uncatchable_before():
    # The failure mode: this try/except was useless, because a Smalltalk
    # CompileError is not a Python exception.
    def go():
        ns = {}
        try:
            exec("from heapq import *", ns)
        except BaseException:
            return 'raised'
        return 'ok'
    return go()


def star_from_a_module_with_dunder_all():
    # __all__ decides the exported set, not "every public name".  heapq declares
    # one; bisect does not, which is why the check above lists bisect's publics.
    ns = {}
    exec("from heapq import *", ns)
    import heapq
    got = set(k for k in ns if not k.startswith('__'))
    return sorted(got) == sorted(set(heapq.__all__))


def plain_import_in_exec_still_works():
    ns = {}
    exec("import bisect", ns)
    return sorted(k for k in ns if not k.startswith('__'))


def named_import_in_exec_still_works():
    ns = {}
    exec("from bisect import bisect_left, insort", ns)
    return sorted(k for k in ns if not k.startswith('__'))


def module_level_star_is_unchanged():
    # The path that always worked -- regression guard.
    from heapq import heappush, heappop
    h = []
    heappush(h, 3)
    heappush(h, 1)
    return heappop(h)


def several_star_imports_in_one_exec():
    ns = {}
    exec("from bisect import *\nfrom heapq import *", ns)
    return [('bisect_left' in ns), ('heappush' in ns)]


r = {
    'star_into_exec_namespace': star_into_exec_namespace(),
    'the_names_are_usable': the_names_are_usable(),
    'uncatchable_before': uncatchable_before(),
    'star_from_a_module_with_dunder_all': star_from_a_module_with_dunder_all(),
    'plain_import_in_exec_still_works': plain_import_in_exec_still_works(),
    'named_import_in_exec_still_works': named_import_in_exec_still_works(),
    'module_level_star_is_unchanged': module_level_star_is_unchanged(),
    'several_star_imports_in_one_exec': several_star_imports_in_one_exec(),
}


EXPECTED = {
    'star_into_exec_namespace': ['bisect', 'bisect_left', 'bisect_right',
                                 'insort', 'insort_left', 'insort_right'],
    'the_names_are_usable': 1,
    'uncatchable_before': 'ok',
    'star_from_a_module_with_dunder_all': True,
    'plain_import_in_exec_still_works': ['bisect'],
    'named_import_in_exec_still_works': ['bisect_left', 'insort'],
    'module_level_star_is_unchanged': 1,
    'several_star_imports_in_one_exec': [True, True],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-36s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-36s is not in EXPECTED' % ('FAIL', extra))
