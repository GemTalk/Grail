# Regression fixture: a @property declared on a subclass of a BUILT-IN fires,
# exactly as it does on a plain class.
#
# It did not.  ``obj.attr`` resolves through ``Object >> ___pyAttrLoad___:``,
# whose property/attribute pair-read (a unary getter plus a same-named 1-arg
# setter means "value attribute", so PERFORM the getter) was gated on the
# RECEIVER KIND -- PythonInstance, AbstractPyInt, or an enum member over
# str/float.  A class rooted at any other built-in matched none of those, so
# the getter was never performed and the read answered the BoundMethod that
# wraps it:
#
#     class T(tuple):
#         @property
#         def first(self): return self[0]
#
#     T(('a', 'b')).first      # CPython 'a';  Grail <BoundMethod object ...>
#
# int subclasses and plain classes were fine, which is exactly the set the
# receiver-kind tests happen to name; tuple, list, str, dict, set, bytes,
# float and Exception subclasses were all affected.  urllib3's ``Url`` is a
# typing.NamedTuple with five @property accessors, one of which
# ``PoolManager.urlopen`` passes straight into ``url.startswith('/')`` -- so
# the whole of kaggle's first network call died on ``'UnboundMethod' object
# has no attribute 'startswith'``.
#
# The gate is now the SHAPE of the pair rather than the kind of the receiver:
# both halves must be declared on ONE class, and that class must carry
# ClassDefAst's ``___pyDefinedClass___`` marker.  The second half of that rule
# is what the ``bare_*`` checks below are for -- see their comment.

RESULTS = {}

# --- the getter fires on every built-in root ------------------------------


class TupleSub(tuple):
    @property
    def first(self):
        return self[0]


class ListSub(list):
    @property
    def label(self):
        return 'list'


class StrSub(str):
    @property
    def label(self):
        return 'str'


class DictSub(dict):
    @property
    def label(self):
        return 'dict'


class SetSub(set):
    @property
    def label(self):
        return 'set'


class BytesSub(bytes):
    @property
    def label(self):
        return 'bytes'


class FloatSub(float):
    @property
    def label(self):
        return 'float'


class IntSub(int):
    @property
    def label(self):
        return 'int'


class ExcSub(Exception):
    @property
    def label(self):
        return 'exc'


class Plain:
    @property
    def label(self):
        return 'plain'


RESULTS['tuple_getter'] = (TupleSub(('a', 'b')).first == 'a')
RESULTS['list_getter'] = (ListSub().label == 'list')
RESULTS['str_getter'] = (StrSub('x').label == 'str')
RESULTS['dict_getter'] = (DictSub().label == 'dict')
RESULTS['set_getter'] = (SetSub().label == 'set')
RESULTS['bytes_getter'] = (BytesSub(b'q').label == 'bytes')
RESULTS['float_getter'] = (FloatSub(1.0).label == 'float')
RESULTS['int_getter'] = (IntSub(1).label == 'int')
RESULTS['exc_getter'] = (ExcSub().label == 'exc')

# THE OTHER DIRECTION.  A plain class's @property is the case that already
# worked, and the failure mode of a bad fix here is breaking it -- so it is
# pinned alongside, not assumed.
RESULTS['plain_getter'] = (Plain().label == 'plain')

# --- setter and deleter ---------------------------------------------------


class ManagedList(list):
    @property
    def val(self):
        return getattr(self, '_v', 'unset')

    @val.setter
    def val(self, v):
        self._v = v * 2

    @val.deleter
    def val(self):
        self._v = 'deleted'


class ManagedPlain:
    @property
    def val(self):
        return getattr(self, '_v', 'unset')

    @val.setter
    def val(self, v):
        self._v = v * 2

    @val.deleter
    def val(self):
        self._v = 'deleted'


_ml = ManagedList()
RESULTS['builtin_sub_getter_before_set'] = (_ml.val == 'unset')
_ml.val = 'ab'
RESULTS['builtin_sub_setter'] = (_ml.val == 'abab')
del _ml.val
RESULTS['builtin_sub_deleter'] = (_ml.val == 'deleted')

_mp = ManagedPlain()
RESULTS['plain_getter_before_set'] = (_mp.val == 'unset')
_mp.val = 'ab'
RESULTS['plain_setter'] = (_mp.val == 'abab')
del _mp.val
RESULTS['plain_deleter'] = (_mp.val == 'deleted')


# A @property with no explicit setter is READ-ONLY on a built-in subclass too.
class ReadOnlyTuple(tuple):
    @property
    def frozen(self):
        return 'ro'


try:
    _ro = ReadOnlyTuple(())
    _ro.frozen = 1
    RESULTS['builtin_sub_readonly_raises'] = False
except AttributeError:
    RESULTS['builtin_sub_readonly_raises'] = True

try:
    _rop = Plain()
    _rop.label = 1
    RESULTS['plain_readonly_raises'] = False
except AttributeError:
    RESULTS['plain_readonly_raises'] = True


# --- inheritance and override --------------------------------------------


class PropBase(tuple):
    @property
    def which(self):
        return 'base'


class PropHeir(PropBase):
    pass


class PropOverridden(PropBase):
    # A plain def in a SUBCLASS outranks the base's @property: CPython answers
    # the function, not the base's value.  This is the case the "both halves
    # on ONE class" half of the gate protects -- here the getter is on the
    # subclass and the synthesized setter on the base, so the pair test must
    # DECLINE.
    def which(self):
        return 'override'


RESULTS['inherited_getter'] = (PropHeir(()).which == 'base')
RESULTS['override_is_callable'] = callable(PropOverridden(()).which)
RESULTS['override_calls'] = (PropOverridden(()).which() == 'override')

# Reading the property off the CLASS must not evaluate it.
RESULTS['class_read_is_not_value'] = (PropBase.which != 'base')


# --- ordinary methods on a built-in subclass stay first-class -------------
#
# The pair-read PERFORMS the getter, so a method wrongly taken for a getter
# comes back as its RETURN VALUE.  These pin the negative side.


class MethodList(list):
    def go(self):
        return 'went'


class DefaultArgTuple(tuple):
    def go(self, x=1):
        return x


class WidenBase(list):
    def f(self):
        return 'unary'


class WidenSub(WidenBase):
    # Grail spells arity into the selector, so this compiles to ``f:`` over an
    # inherited ``f'' -- the same two spellings a property pair has.
    def f(self, extra):
        return 'widened:' + extra


RESULTS['method_is_callable'] = callable(MethodList().go)
RESULTS['method_calls'] = (MethodList().go() == 'went')
RESULTS['default_arg_is_callable'] = callable(DefaultArgTuple(()).go)
RESULTS['default_arg_calls'] = (DefaultArgTuple(()).go() == 1)
RESULTS['default_arg_calls_with_arg'] = (DefaultArgTuple(()).go(9) == 9)
RESULTS['widened_is_callable'] = callable(WidenSub().f)
RESULTS['widened_calls'] = (WidenSub().f('q') == 'widened:q')


# --- NEGATIVE CONTROL: the built-in's own methods are not a property pair --
#
# Grail implements str/list/bytes methods as env-1 Smalltalk methods, and some
# of those names exist in BOTH spellings on the same Smalltalk class -- 'strip'
# and 'strip:', 'split' and 'split:', 'pop' and 'pop:', 'decode' and 'decode:'.
# Selector-wise that is indistinguishable from a getter/setter pair, so a
# pair-read that asked only "do both spellings exist, on one class?" would take
# ``s.strip`` for a value attribute and answer the STRIPPED STRING where CPython
# answers a bound method.  Requiring the owning class to carry
# ``___pyDefinedClass___`` -- the marker only a Python class body gets -- is what
# separates them, and these checks are what fails without it.


class BareStr(str):
    pass


class BareList(list):
    pass


class BareBytes(bytes):
    pass


RESULTS['bare_str_strip_is_callable'] = callable(BareStr('  a  ').strip)
RESULTS['bare_str_strip_calls'] = (BareStr('  a  ').strip() == 'a')
RESULTS['bare_str_split_is_callable'] = callable(BareStr('a b').split)
RESULTS['bare_str_split_calls'] = (BareStr('a b').split() == ['a', 'b'])
RESULTS['bare_list_pop_is_callable'] = callable(BareList([1, 2]).pop)
RESULTS['bare_list_pop_calls'] = (BareList([1, 2]).pop() == 2)
RESULTS['bare_bytes_decode_is_callable'] = callable(BareBytes(b'hi').decode)
RESULTS['bare_bytes_decode_calls'] = (BareBytes(b'hi').decode() == 'hi')

# A name neither side declares still raises, on every root.
for _cls, _arg in ((BareStr, 'q'), (BareList, []), (BareBytes, b'q')):
    try:
        getattr(_cls(_arg), 'definitely_not_an_attribute')
        RESULTS['bare_%s_missing_raises' % _cls.__name__] = False
    except AttributeError:
        RESULTS['bare_%s_missing_raises' % _cls.__name__] = True


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        print('%-4s %s' % ('OK' if RESULTS[_name] is True else 'FAIL', _name))
