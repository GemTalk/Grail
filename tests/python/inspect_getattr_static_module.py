# inspect.getattr_static on a MODULE.
#
# getattr_static reads an object's own __dict__ unless its class binds
# ``__dict__`` to something that hides it.  CPython's module type lists its
# namespace as a member descriptor (md_dict), which getattr_static treats as
# the instance's storage.  Grail's module class lists an accessor function
# there instead, which read as a hiding binding, so every module answered the
# default for every name.
#
# pluggy 1.7 finds hook specifications with getattr_static, so pytest -- whose
# hookspecs are a module, _pytest.hookspec -- could not start under Grail:
# ``did not find any 'pytest' hooks in <module '_pytest.hookspec'>``.

import inspect
import json
import sys
import types

_MISSING = object()


def module_level_function():
    pass


module_level_function.marker = 'here'


def a_stdlib_modules_function_is_found():
    return inspect.getattr_static(json, 'dumps', _MISSING) is json.dumps


def this_modules_own_function_is_found():
    me = sys.modules[__name__]
    return inspect.getattr_static(me, 'module_level_function', _MISSING) is module_level_function


def an_attribute_set_on_a_module_is_found():
    m = types.ModuleType('scratch')
    m.value = 42
    return inspect.getattr_static(m, 'value', _MISSING) == 42


def a_missing_name_answers_the_default():
    return inspect.getattr_static(json, 'no_such_name', _MISSING) is _MISSING


def a_missing_name_without_default_raises():
    try:
        inspect.getattr_static(json, 'no_such_name')
    except AttributeError:
        return True
    return False


class Plain:
    def method(self):
        pass


def classes_and_instances_are_unaffected():
    p = Plain()
    p.attr = 1
    return (inspect.getattr_static(Plain, 'method', _MISSING) is Plain.__dict__['method']
            and inspect.getattr_static(p, 'attr', _MISSING) == 1
            and inspect.getattr_static(p, 'method', _MISSING) is Plain.__dict__['method'])


CHECKS = [
    a_stdlib_modules_function_is_found,
    this_modules_own_function_is_found,
    an_attribute_set_on_a_module_is_found,
    a_missing_name_answers_the_default,
    a_missing_name_without_default_raises,
    classes_and_instances_are_unaffected,
]


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
