"""Fixtures for the mapping operations a module namespace has to support, and
for the ``name'' attribute every NameError has to carry.

Driven by PythonTests>>ModuleDictOpsTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

CPython's ``globals()'' IS a dict.  Grail's is a LIVE view over the module
(PyModuleDict), which is the right object -- a write through it must reach the
module -- but it was missing the operations that deliberately DO NOT write
through.  ``copy()'' was absent entirely, so the ordinary
``custom = globals().copy(); custom[k] = v'' idiom raised AttributeError instead
of giving the caller a namespace of their own.

The second half is about ``e.name''.  CPython has carried it on NameError since
3.10 and the stdlib reads it; in Grail only the module-global miss set it, because
a bare-name miss compiled inside a function body emitted its own raise inline.
Both paths are checked here, since they are genuinely different code.

Run this file under CPython (``python3 tests/python/module_dict_ops.py'') to see
what it produces -- that is where the expectations come from.
"""

MODULE_LEVEL = 1
OTHER = 2


def a_copy_is_a_plain_dict():
    """Not another live view: CPython's globals() is a dict and copy() returns a
    dict, so the type a caller gets back is part of the contract."""
    c = globals().copy()
    return type(c) is dict


def a_copy_carries_the_current_bindings():
    c = globals().copy()
    return c.get('MODULE_LEVEL') == 1 and c.get('OTHER') == 2


def writing_to_a_copy_does_not_touch_the_module():
    """The whole point of copying.  A live view here would write straight back
    into the module, which is what the eval-with-custom-globals idiom relies on
    NOT happening."""
    c = globals().copy()
    c['ADDED_TO_COPY_ONLY'] = 99
    return 'ADDED_TO_COPY_ONLY' not in globals()


def deleting_from_a_copy_does_not_touch_the_module():
    c = globals().copy()
    del c['MODULE_LEVEL']
    return 'MODULE_LEVEL' in globals() and MODULE_LEVEL == 1


def eval_accepts_a_copied_namespace():
    """The idiom the suggestion tests use, end to end."""
    custom = globals().copy()
    custom['INJECTED'] = 7
    return eval('INJECTED + MODULE_LEVEL', custom) == 8


def or_merges_into_a_new_dict():
    """PEP 584: the result is a new dict and the module is untouched."""
    merged = globals() | {'MERGED_IN': 5}
    return (type(merged) is dict
            and merged.get('MERGED_IN') == 5
            and 'MERGED_IN' not in globals())


def ior_merges_in_place():
    """The in-place form DOES write through, exactly as update() does."""
    g = globals()
    g |= {'MERGED_IN_PLACE': 6}
    try:
        return globals().get('MERGED_IN_PLACE') == 6
    finally:
        del g['MERGED_IN_PLACE']


def popitem_returns_a_pair_and_removes_it():
    c = globals().copy()
    before = len(c)
    key, value = c.popitem()
    return (isinstance(key, str) and len(c) == before - 1
            and key not in c)


def popitem_on_an_empty_mapping_raises_keyerror():
    c = globals().copy()
    c.clear()
    try:
        c.popitem()
    except KeyError:
        return True
    return False


def a_module_global_miss_names_the_binding():
    """The path through the module's own attribute load."""
    try:
        MISSPELLED_MODULE_GLOBAL
    except NameError as e:
        return getattr(e, 'name', None) == 'MISSPELLED_MODULE_GLOBAL'
    return False


def a_miss_inside_a_function_names_the_binding_too():
    """A DIFFERENT code path: this one is compiled into the function body, and it
    used to emit its own raise with no ``name'' on it."""
    def inner():
        return missing_name_inside_a_function

    try:
        inner()
    except NameError as e:
        return getattr(e, 'name', None) == 'missing_name_inside_a_function'
    return False


def the_message_is_unchanged_by_carrying_the_name():
    """Adding the attribute must not reword the error."""
    try:
        another_missing_name
    except NameError as e:
        return str(e) == "name 'another_missing_name' is not defined"
    return False


if __name__ == '__main__':
    checks = [
        a_copy_is_a_plain_dict,
        a_copy_carries_the_current_bindings,
        writing_to_a_copy_does_not_touch_the_module,
        deleting_from_a_copy_does_not_touch_the_module,
        eval_accepts_a_copied_namespace,
        or_merges_into_a_new_dict,
        ior_merges_in_place,
        popitem_returns_a_pair_and_removes_it,
        popitem_on_an_empty_mapping_raises_keyerror,
        a_module_global_miss_names_the_binding,
        a_miss_inside_a_function_names_the_binding_too,
        the_message_is_unchanged_by_carrying_the_name,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
