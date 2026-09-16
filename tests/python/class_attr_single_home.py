# A class attribute has ONE home in Grail: the per-class ``___dynInstVars___''
# holder.  The class-side accessor pair ClassDefAst compiles for ``x = 1'' is
# the protocol the loader keys on; the VALUE is a holder entry, not a
# classInstVar on the metaclass (docs/Class_Attribute_Single_Home.md).
#
# What that buys, and what this fixture pins, is CPython's one-dict-per-class
# behaviour end to end:
#
#   * a subclass that does not redeclare an attribute reads the parent's
#     CURRENT value -- a later ``A.x = v'' is visible as ``B.x'' -- where a
#     per-class slot held a build-time copy;
#   * ``del Cls.x'' on a class-body attribute removes it, so hasattr answers
#     False afterwards and a second del raises, where the slot-backed pair
#     used to raise on the first del or keep answering nil;
#   * ``vars(cls)'' is ``cls.__dict__'' and lists the class body's names, not
#     the metaclass's instVars;
#   * a class attribute named after a kernel class-object slot (``name'') no
#     longer needs a mangled backing slot to leave ``cls.__name__'' alone.
#
# Self-running: ``python3 tests/python/class_attr_single_home.py'' prints one
# OK/FAIL line per check, and scripts/check_python_fixtures.sh gates on it.
# Driven from Smalltalk by ClassAttrSingleHomeTestCase through ``r''.


class A:
    x = 1
    name = 'attr-name'

    def m(self):
        return self.x


class B(A):
    y = 2


class C(A):
    x = 10


def check_inherited_read():
    return (A.x, B.x, C.x, B.y) == (1, 1, 10, 2)


def check_parent_change_reaches_subclass():
    A.x = 99
    try:
        return B.x == 99 and C.x == 10 and B().m() == 99
    finally:
        A.x = 1


def check_subclass_store_shadows_only_subclass():
    B.x = 5
    try:
        return B.x == 5 and A.x == 1 and C.x == 10
    finally:
        del B.x


def check_subclass_del_uncovers_parent():
    B.x = 5
    del B.x
    return B.x == 1 and 'x' not in vars(B)


def check_del_body_attribute():
    class D:
        k = 1
        j = 2
    del D.k
    if hasattr(D, 'k') or D.j != 2:
        return False
    try:
        del D.k
    except AttributeError:
        pass
    else:
        return False
    return True


def check_del_inherited_raises():
    class D:
        j = 2

    class E(D):
        pass
    try:
        del E.j
    except AttributeError:
        return E.j == 2
    return False


def check_vars_is_class_dict():
    keys = set(vars(A))
    return ({'x', 'name', 'm'} <= keys
            and keys == set(A.__dict__)
            and not ({'format', 'superClass', 'methDicts', 'instVarNames'} & keys))


def check_class_dict_is_own_only():
    own = {k for k in B.__dict__ if not k.startswith('__')}
    return own == {'y'}


def check_reserved_name_isolated():
    return A.name == 'attr-name' and A.__name__ == 'A' and B.__name__ == 'B'


def check_type_built_class_inherits():
    T = type('T', (A,), {'kind': 'derived'})
    A.x = 7
    try:
        return T.kind == 'derived' and T.x == 7 and T.__name__ == 'T'
    finally:
        A.x = 1


CHECKS = (
    check_inherited_read,
    check_parent_change_reaches_subclass,
    check_subclass_store_shadows_only_subclass,
    check_subclass_del_uncovers_parent,
    check_del_body_attribute,
    check_del_inherited_raises,
    check_vars_is_class_dict,
    check_class_dict_is_own_only,
    check_reserved_name_isolated,
    check_type_built_class_inherits,
)

r = {fn.__name__: fn() for fn in CHECKS}

if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL', fn.__name__))
