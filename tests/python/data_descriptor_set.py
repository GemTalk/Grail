# Fixture for DataDescriptorSetTestCase.
#
# CPython's data model: a class attribute whose OWN TYPE defines __set__ or
# __delete__ is a DATA DESCRIPTOR.  It takes precedence over the instance dict
# in BOTH directions --
#
#   * ``obj.x = v''  calls ``type(obj).x.__set__(obj, v)'' and writes NOTHING
#     into obj.__dict__, so a validating or read-only descriptor is enforced;
#   * ``del obj.x''  calls ``type(obj).x.__delete__(obj)''.
#
# A NON-data descriptor (only __get__, e.g. functools.cached_property) does the
# opposite: the store writes obj.__dict__ and shadows the descriptor forever
# after.  Getting that direction right is half the contract.
#
# Because CPython fills ONE slot (tp_descr_set) from EITHER dunder, a descriptor
# with __delete__ but no __set__ still INTERCEPTS a store and then raises
# ``AttributeError: __set__'' -- and the mirror image for a missing __delete__.
#
# Pre-fix, Grail's attribute-STORE path recognised only its own ``property''
# (object >> ___instancePropertyDescriptorFor___: tested ``isKindOf:
# AbstractPropertyDescriptor''), so a user-written data descriptor was ignored:
# ``obj.x = v'' wrote the instance dict, __set__ never ran, and a read-only
# descriptor raised nothing.  collections._tuplegetter documents the workaround
# the corpus used instead (enforce read-only in __setattr__).


# --------------------------------------------------------------------------
# A data descriptor that records every call.
# --------------------------------------------------------------------------
class Recorder:
    def __init__(self):
        self.calls = []

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self.calls[-1] if self.calls else '<unset>'

    def __set__(self, obj, value):
        self.calls.append(('set', value))

    def __delete__(self, obj):
        self.calls.append(('del',))


class WithRecorder:
    d = Recorder()


# --------------------------------------------------------------------------
# Read-only: __set__ raises.  __delete__ is absent, so ``del'' must raise
# AttributeError('__delete__') rather than removing an instance attribute.
# --------------------------------------------------------------------------
class ReadOnly:
    def __get__(self, obj, objtype=None):
        return 'ro'

    def __set__(self, obj, value):
        raise AttributeError("can't set attribute")


class WithReadOnly:
    r = ReadOnly()


# --------------------------------------------------------------------------
# Validating descriptor with private backing storage -- the common real shape.
# --------------------------------------------------------------------------
class Positive:
    def __set_name__(self, owner, name):
        self.slot = '_' + name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.slot, 0)

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError('must be >= 0')
        setattr(obj, self.slot, value)


class Account:
    balance = Positive()
    balance.slot = '_balance'   # __set_name__ equivalent, spelled explicitly


# --------------------------------------------------------------------------
# NON-data descriptor: only __get__.  The instance store must shadow it.
# --------------------------------------------------------------------------
class GetOnly:
    def __get__(self, obj, objtype=None):
        return 'from-descriptor'


class WithGetOnly:
    n = GetOnly()


# --------------------------------------------------------------------------
# Delete-only descriptor: no __set__.  A store still intercepts (shared slot)
# and raises AttributeError('__set__').
# --------------------------------------------------------------------------
class DeleteOnly:
    def __get__(self, obj, objtype=None):
        return 'del-only'

    def __delete__(self, obj):
        pass


class WithDeleteOnly:
    q = DeleteOnly()


# --------------------------------------------------------------------------
# Inheritance, and a data descriptor on a subclass of each built-in root.
# --------------------------------------------------------------------------
class BaseWithRecorder:
    b = Recorder()


class SubOfBase(BaseWithRecorder):
    pass


class IntHolder(int):
    d = Recorder()


class StrHolder(str):
    d = Recorder()


class TupleHolder(tuple):
    d = Recorder()


class ListHolder(list):
    d = Recorder()


# --------------------------------------------------------------------------
# checks
# --------------------------------------------------------------------------
def set_calls_dunder_set():
    o = WithRecorder()
    o.d = 7
    return WithRecorder.__dict__['d'].calls[-1] == ('set', 7)


def set_does_not_shadow_in_instance_dict():
    o = WithRecorder()
    o.d = 7
    return 'd' not in o.__dict__


def read_after_set_goes_through_descriptor():
    o = WithRecorder()
    o.d = 11
    return o.d == ('set', 11)


def delete_calls_dunder_delete():
    o = WithRecorder()
    o.d = 1
    del o.d
    return WithRecorder.__dict__['d'].calls[-1] == ('del',)


def read_only_descriptor_raises():
    o = WithReadOnly()
    try:
        o.r = 1
    except AttributeError as e:
        return str(e) == "can't set attribute"
    return False


def read_only_descriptor_leaves_read_intact():
    o = WithReadOnly()
    try:
        o.r = 1
    except AttributeError:
        pass
    return o.r == 'ro'


def delete_without_dunder_delete_raises():
    o = WithReadOnly()
    try:
        del o.r
    except AttributeError as e:
        return str(e) == '__delete__'
    return False


def set_without_dunder_set_raises():
    o = WithDeleteOnly()
    try:
        o.q = 1
    except AttributeError as e:
        return str(e) == '__set__'
    return False


def delete_only_descriptor_deletes():
    o = WithDeleteOnly()
    del o.q
    return o.q == 'del-only'


def validating_descriptor_accepts():
    a = Account()
    a.balance = 5
    return a.balance == 5 and a._balance == 5


def validating_descriptor_rejects():
    a = Account()
    try:
        a.balance = -1
    except ValueError as e:
        return str(e) == 'must be >= 0'
    return False


def non_data_descriptor_is_shadowed():
    o = WithGetOnly()
    o.n = 'instance'
    return o.n == 'instance' and 'n' in o.__dict__


def non_data_descriptor_reads_before_store():
    return WithGetOnly().n == 'from-descriptor'


def inherited_data_descriptor_intercepts():
    o = SubOfBase()
    o.b = 3
    return (BaseWithRecorder.__dict__['b'].calls[-1] == ('set', 3)
            and 'b' not in o.__dict__)


def runtime_setattr_descriptor_intercepts():
    class Late:
        pass
    Late.z = Recorder()
    o = Late()
    o.z = 4
    return Late.__dict__['z'].calls[-1] == ('set', 4)


def _builtin_subclass_case(cls, inst):
    inst.d = 2
    return cls.__dict__['d'].calls[-1] == ('set', 2) and 'd' not in _dict_of(inst)


def _dict_of(inst):
    try:
        return inst.__dict__
    except AttributeError:
        return {}


def int_subclass_descriptor():
    return _builtin_subclass_case(IntHolder, IntHolder(1))


def str_subclass_descriptor():
    return _builtin_subclass_case(StrHolder, StrHolder('a'))


def tuple_subclass_descriptor():
    return _builtin_subclass_case(TupleHolder, TupleHolder((1,)))


def list_subclass_descriptor():
    return _builtin_subclass_case(ListHolder, ListHolder([1]))


class HasProp:
    """Module level, so __qualname__ is a plain 'HasProp' on both sides -- a
    class nested in the check function would be 'read_only_property_message.
    <locals>.HasProp' under CPython and the message check would be about
    qualname synthesis rather than about the property."""

    @property
    def p(self):
        return 1


def read_only_property_message():
    try:
        HasProp().p = 1
    except AttributeError as e:
        return str(e) == "property 'p' of 'HasProp' object has no setter"
    return False


def property_setter_still_fires():
    class HasBoth:
        def __init__(self):
            self._v = 0

        @property
        def p(self):
            return self._v

        @p.setter
        def p(self, v):
            self._v = v * 2

    o = HasBoth()
    o.p = 3
    return o.p == 6 and 'p' not in o.__dict__


def plain_class_attribute_still_stores():
    class Plain:
        count = 0

    o = Plain()
    o.count = 9
    return o.count == 9 and o.__dict__['count'] == 9 and Plain.count == 0


CHECKS = [
    set_calls_dunder_set,
    set_does_not_shadow_in_instance_dict,
    read_after_set_goes_through_descriptor,
    delete_calls_dunder_delete,
    read_only_descriptor_raises,
    read_only_descriptor_leaves_read_intact,
    delete_without_dunder_delete_raises,
    set_without_dunder_set_raises,
    delete_only_descriptor_deletes,
    validating_descriptor_accepts,
    validating_descriptor_rejects,
    non_data_descriptor_is_shadowed,
    non_data_descriptor_reads_before_store,
    inherited_data_descriptor_intercepts,
    runtime_setattr_descriptor_intercepts,
    int_subclass_descriptor,
    str_subclass_descriptor,
    tuple_subclass_descriptor,
    list_subclass_descriptor,
    read_only_property_message,
    property_setter_still_fires,
    plain_class_attribute_still_stores,
]


def run_all():
    """True when every check above passes.  Driven from Smalltalk."""
    return all(fn() is True for fn in CHECKS)


def failures():
    """Names of the checks that did not pass -- what the Smalltalk side
    reports, so a red test names the divergence instead of just '0 ~= 1'."""
    return [fn.__name__ for fn in CHECKS if fn() is not True]


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
