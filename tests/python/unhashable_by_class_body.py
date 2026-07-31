"""__hash__ = None, explicit and implicit."""


class Explicit:
    __hash__ = None


class EqOnly:
    """Implicit: defining __eq__ without __hash__ makes it unhashable."""
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return isinstance(o, EqOnly) and self.v == o.v


class EqAndHash:
    """Both defined -> keeps its own hash."""
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return isinstance(o, EqAndHash) and self.v == o.v
    def __hash__(self):
        return hash(self.v)


class HashAssignedNonNone:
    """__hash__ assigned a real function must NOT be clobbered."""
    def __eq__(self, o):
        return True
    def _h(self):
        return 99
    __hash__ = _h


class SubOfEqOnly(EqOnly):
    """A subclass inherits unhashability and reports ITSELF."""
    pass


class SubRestoresHash(EqOnly):
    def __hash__(self):
        return 7


class Plain:
    """No __eq__ at all -> stays hashable on identity."""
    pass


def probe():
    out = []
    def p(label, thunk):
        try:
            out.append((label, repr(thunk())))
        except Exception as e:
            out.append((label, '%s: %s' % (type(e).__name__, e)))
    p('EXPLICIT hash(Explicit())', lambda: hash(Explicit()))
    p('IMPLICIT hash(EqOnly(1))', lambda: hash(EqOnly(1)))
    p('IMPLICIT as dict key', lambda: {EqOnly(1): 'v'})
    p('IMPLICIT as set element', lambda: {EqOnly(1)})
    p('both defined: hash(EqAndHash(3))', lambda: hash(EqAndHash(3)))
    p('both: equal hash equal', lambda: hash(EqAndHash(3)) == hash(EqAndHash(3)))
    p('both: dict key', lambda: {EqAndHash(3): 'v'}[EqAndHash(3)])
    p('__hash__ = _h honoured?', lambda: hash(HashAssignedNonNone()))
    p('SUBCLASS inherits unhashable', lambda: hash(SubOfEqOnly(1)))
    p('SUBCLASS restores hash', lambda: hash(SubRestoresHash(1)))
    p('Plain stays hashable', lambda: isinstance(hash(Plain()), int))
    return out


def explicit_none_raises():
    try:
        hash(Explicit())
    except TypeError as e:
        return "unhashable type: 'Explicit'" in str(e)
    return False


def implicit_eq_without_hash_raises():
    """The case that surprises people, and the one Grail got wrong: a class
    that redefines __eq__ and not __hash__ is unhashable in CPython."""
    try:
        hash(EqOnly(1))
    except TypeError as e:
        return "unhashable type: 'EqOnly'" in str(e)
    return False


def unhashable_rejected_by_dict_and_set():
    ok = 0
    try:
        {EqOnly(1): 'v'}
    except TypeError:
        ok += 1
    try:
        {EqOnly(1)}
    except TypeError:
        ok += 1
    return ok == 2


def defining_both_keeps_the_hash():
    return (hash(EqAndHash(3)) == 3
            and hash(EqAndHash(3)) == hash(EqAndHash(3))
            and {EqAndHash(3): 'v'}[EqAndHash(3)] == 'v')


def hash_assigned_a_sibling_method_is_kept():
    """``__hash__ = _h'' is a real hash function.  It does NOT appear in
    classBodyAttributes -- sibling-method aliases are compiled as delegating
    METHODS -- so the implicit rule wrongly fired and clobbered it."""
    return hash(HashAssignedNonNone()) == 99


def subclass_inherits_unhashability_and_names_itself():
    try:
        hash(SubOfEqOnly(1))
    except TypeError as e:
        return "unhashable type: 'SubOfEqOnly'" in str(e)
    return False


def subclass_can_restore_a_hash():
    return hash(SubRestoresHash(1)) == 7


def a_class_without_eq_stays_hashable():
    return isinstance(hash(Plain()), int)

