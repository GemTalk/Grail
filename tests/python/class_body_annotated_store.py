"""Fixture: a class body runs an annotated assignment to an attribute or subscript.

PEP 526 annotates only a simple name.  An annotated assignment to anything
else -- ``obj.attr: int = 0``, ``d['k']: int = 1`` -- records no annotation,
but CPython still executes it: the value, then the store; and with no value,
the target's object alone ("the interpreter evaluates the target except for
the last __setitem__() or __setattr__() call").

Grail dropped such a statement from a class body whole, so
``class CBad: no_such_name_defined.attr: int = 0`` built the class where
CPython raises NameError (test_grammar test_var_annot_basic_semantics), and a
store a later statement reads never happened.  And with no value it evaluated
nothing anywhere -- class, function or module -- so ``no_such.attr: int``
passed silently.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def undefined_object():
    class CBad:
        no_such_name_defined.attr: int = 0


def unbound_object():
    class CBad:
        x: int
        x.y: list = []


def undefined_object_no_value():
    class CBad:
        no_such_name_defined.attr: int


def undefined_container_no_value():
    class CBad:
        no_such_container['key']: int


r['undefined_object'] = outcome(undefined_object)
r['bare_annotation_binds_nothing'] = outcome(unbound_object)
r['no_value_evaluates_the_object'] = outcome(undefined_object_no_value)
r['no_value_evaluates_the_container'] = outcome(undefined_container_no_value)


def stores_run():
    class C:
        d = {}
        d['k']: int = 1
        from_subscript = d['k']
        ns = types.SimpleNamespace()
        ns.a: int = 5
        from_attribute = ns.a
        plain: str = 'p'
    return [C.from_subscript, C.from_attribute, C.d, C.ns.a, C.__annotations__]


r['stores_run_and_only_names_are_annotated'] = outcome(stores_run)


def evaluation_order():
    log = []

    class C:
        log.append('before')
        types.SimpleNamespace().x: log.append('annotation') = log.append('value')
        log.append('after')
    return log


r['evaluation_order'] = outcome(evaluation_order)


def value_raises_first():
    class C:
        no_such_name_defined.attr: int = 1 / 0


r['value_before_target'] = outcome(value_raises_first)


def module_level_unchanged():
    namespace = {}
    exec("import types\nns = types.SimpleNamespace()\nns.a: int = 3\nd = {}\nd['k']: str = 'v'\n", namespace)
    return [namespace['ns'].a, namespace['d'], namespace.get('__annotations__', {})]


r['module_level_unchanged'] = outcome(module_level_unchanged)


# --- with no value, the parts of the target are evaluated (functions too) ----
def in_a_function():
    def bare_attribute():
        no_such_object.attr: int

    def slice_bound():
        d = {}
        d[no_such_lower:2]: int

    def tuple_key_element():
        d = {}
        d[1, no_such_element]: int

    class Holder:
        pass

    def nested_attribute():
        holder = Holder()
        holder.missing.leaf: int

    def nothing_is_stored():
        ns = types.SimpleNamespace()
        d = {}
        ns.leaf: int
        d['k']: int
        return [hasattr(ns, 'leaf'), d]

    return [outcome(bare_attribute), outcome(slice_bound), outcome(tuple_key_element),
            outcome(nested_attribute), outcome(nothing_is_stored)]


r['parts_evaluated_in_a_function'] = outcome(in_a_function)


EXPECTED = {
    'undefined_object': "NameError: name 'no_such_name_defined' is not defined",
    'bare_annotation_binds_nothing': "NameError: name 'x' is not defined",
    'no_value_evaluates_the_object': "NameError: name 'no_such_name_defined' is not defined",
    'no_value_evaluates_the_container': "NameError: name 'no_such_container' is not defined",
    'stores_run_and_only_names_are_annotated': [1, 5, {'k': 1}, 5, {'plain': str}],
    'evaluation_order': ['before', 'value', 'after'],
    'value_before_target': 'ZeroDivisionError: division by zero',
    'module_level_unchanged': [3, {'k': 'v'}, {}],
    'parts_evaluated_in_a_function': ["NameError: name 'no_such_object' is not defined",
                                      "NameError: name 'no_such_lower' is not defined",
                                      "NameError: name 'no_such_element' is not defined",
                                      "AttributeError: 'Holder' object has no attribute 'missing'",
                                      [False, {}]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
