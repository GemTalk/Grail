"""Fixture: assigning __bases__ cannot change how instances are laid out.

CPython's type_set_bases refuses an immutable type first
(check_set_special_type_attr), and then -- compatible_for_assignment in
Objects/typeobject.c -- new bases whose best base lays instances out
otherwise than the class's own base: a list subclass cannot become a dict
subclass, nor a plain class a list subclass ("__bases__ assignment: 'dict'
object layout differs from 'list'").  Grail took either assignment and
silently kept the old bases, and refused list.__bases__ = 5 as a non-tuple
rather than as an immutable type (test_descr test_builtin_bases).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(call):
    try:
        call()
        return 'ok'
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def names(classes):
    return [each.__name__ for each in classes]


class L(list):
    pass


class G(dict):
    pass


class C:
    pass


class D(C):
    pass


r['a_list_subclass_cannot_become_a_dict_subclass'] = [
    outcome(lambda: setattr(L, '__bases__', (dict,))), names(L.__bases__)]
r['a_dict_subclass_cannot_become_a_list_subclass'] = outcome(lambda: setattr(G, '__bases__', (list,)))
r['a_plain_class_cannot_gain_a_list_base'] = [
    outcome(lambda: setattr(D, '__bases__', (C, list))), names(D.__bases__)]
r['a_builtin_is_refused_as_immutable_first'] = [
    outcome(lambda: setattr(list, '__bases__', (dict,))), outcome(lambda: setattr(int, '__bases__', 5))]
r['a_base_of_the_same_layout_can_still_be_added'] = [
    outcome(lambda: setattr(L, '__bases__', (list, C))), names(L.__bases__)]

EXPECTED = {
    'a_list_subclass_cannot_become_a_dict_subclass': [
        "TypeError: __bases__ assignment: 'dict' object layout differs from 'list'", ['list']],
    'a_dict_subclass_cannot_become_a_list_subclass':
        "TypeError: __bases__ assignment: 'list' object layout differs from 'dict'",
    'a_plain_class_cannot_gain_a_list_base': [
        "TypeError: __bases__ assignment: 'list' object layout differs from 'C'", ['C']],
    'a_builtin_is_refused_as_immutable_first': [
        "TypeError: cannot set '__bases__' attribute of immutable type 'list'",
        "TypeError: cannot set '__bases__' attribute of immutable type 'int'"],
    'a_base_of_the_same_layout_can_still_be_added': ['ok', ['list', 'C']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
