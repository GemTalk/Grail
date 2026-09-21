# Objects that cannot hold attributes, and the three types that have exactly
# one instance.
#
# CPython gives a built-in instance no ``__dict__'', so ``x.attr = 1'' on an
# int, a str, a tuple or a singleton raises AttributeError with a message that
# says WHY -- ``and no __dict__ for setting new attributes'' -- rather than the
# plain ``has no attribute'' a misspelled READ gets.  The distinction is the
# point of the wording: from an assignment, the short form sends the reader
# looking for a typo when no spelling would have worked.
#
# Grail answered this THREE different ways depending on how GemStone happened
# to store the receiver, and none of them was a Python exception:
#
#   (1).zz = 1        ImproperOperation 2484 -- a special object has no object
#                     body to hang a dynamic instVar on
#   'ab'.zz = 1       ArgumentTypeError 2031 -- an invariant object may not be
#                     written
#   None.zz = 1       ACCEPTED, silently, and readable for the rest of the
#                     session
#
# The first two are UNCATCHABLE Smalltalk errors: ``except AttributeError'' did
# not see them, ``except Exception'' did not see them, and inside a test shard
# they take the shard rather than the test.  The third is worse in the way a
# wrong answer is worse than an error -- a mistyped assignment to None looked
# like it worked.
#
# The type NAME in these messages is the second half.  Grail printed the
# Smalltalk class that happens to back a built-in, so an int read 'SmallInteger'
# and a str 'Unicode7'.  The built-ins whose two names coincide (tuple,
# frozenset, NoneType) hid it, so whether the message was intelligible depended
# on which type you picked.
#
# test_builtin's test_construct_singletons and test_singleton_attribute_access.

r = {}


def outcome(fn):
    """What the call did: the exception type and message, or the value."""
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def setattr_outcome(obj, name='zz'):
    def go():
        setattr(obj, name, 1)
        # Reaching here is the silent-acceptance bug; report what was stored so
        # a regression says "it took the attribute" rather than merely "no
        # exception".
        return getattr(obj, name, '<unreadable>')
    return outcome(go)


# --- a store onto an object with no instance dictionary ---------------------
#
# Seven built-ins, chosen to span GemStone's two refusals: int, float and bool
# are SPECIAL objects, str, bytes, tuple and frozenset are INVARIANT ones.  A
# fix that converts only one of the two leaves half of these uncatchable, and
# the two halves are indistinguishable from Python.

for _v, _nm in ((1, 'int'), (1.5, 'float'), (True, 'bool'), ('ab', 'str'),
                (b'ab', 'bytes'), ((1, 2), 'tuple'), (frozenset(), 'frozenset')):
    r['store_' + _nm] = setattr_outcome(_v)

# ``e.name'' is what traceback.py's "Did you mean:" machinery matches on, so a
# refusal that carries no name is a refusal the stdlib cannot work with.
try:
    (1).zz = 1
except AttributeError as _e:
    r['store_carries_name'] = getattr(_e, 'name', None)

# --- and a READ of a missing attribute, which keeps the short message -------

for _v, _nm in ((1, 'int'), (1.5, 'float'), (True, 'bool'), ('ab', 'str'),
                (b'ab', 'bytes')):
    r['read_' + _nm] = outcome(lambda v=_v: v.nosuchattr)

# --- the three singleton types ----------------------------------------------
#
# ``tp()'' answers the one instance rather than raising or making a second one.
# A second instance of a singleton type is worse than an error: it answers the
# same __repr__, so nothing but ``is'' can see it and every ``x is None'' test
# in the program quietly stops matching.

for _const, _nm in ((None, 'None'), (Ellipsis, 'Ellipsis'),
                    (NotImplemented, 'NotImplemented')):
    _tp = type(_const)
    r['call_' + _nm] = outcome(lambda tp=_tp, c=_const: tp() is c)
    # Arity and keywords are both refused.  The keyword form is a separate code
    # path in Grail and was an uncatchable MessageNotUnderstood for every
    # built-in class that does not implement the keyword entry point.
    # TYPE ONLY for these two: CPython's arity wording ("NoneType takes no
    # arguments") and Grail's ("...takes wrong number of arguments (2
    # positional, 0 keyword)") are both reasonable and both stable, and
    # pinning one would make this fixture a test of the prose.  What has to
    # agree is that a Python exception of the right class arrives at all.
    r['call_args_' + _nm] = outcome(lambda tp=_tp: tp(1, 2)).split(':')[0]
    r['call_kwargs_' + _nm] = outcome(lambda tp=_tp: tp(a=1, b=2)).split(':')[0]
    # No instance dictionary, and no class dictionary either.
    r['singleton_set_' + _nm] = setattr_outcome(_const, 'prop')
    r['singleton_get_' + _nm] = outcome(lambda c=_const: c.prop)
    r['singleton_class_set_' + _nm] = outcome(
        lambda tp=_tp: setattr(tp, 'prop', 1))
    r['singleton_class_get_' + _nm] = outcome(lambda tp=_tp: tp.prop)

# --- keyword arguments to a built-in that takes none ------------------------
#
# Not singleton-specific: any built-in class without the keyword entry point
# went the same way.  tuple, which has one, raised the right TypeError all
# along -- so the two halves of one protocol disagreed.

for _cls, _nm in ((frozenset, 'frozenset'), (slice, 'slice'),
                  (object, 'object'), (tuple, 'tuple')):
    r['kwargs_' + _nm] = outcome(lambda c=_cls: c(zz=1)).split(':')[0]

# --- the class-side messages name the PYTHON type ---------------------------
#
# int/str/float are the cases where the Smalltalk name differs (Integer,
# Unicode7, Float); NoneType is the control whose two names coincide, so a
# regression that reverts the mapping still passes it.

for _cls, _nm in ((int, 'int'), (str, 'str'), (float, 'float'),
                  (type(None), 'NoneType')):
    r['class_set_' + _nm] = outcome(lambda c=_cls: setattr(c, 'foo', 1))
    r['class_get_' + _nm] = outcome(lambda c=_cls: c.nosuchattr)

# --- controls: objects that DO hold attributes are untouched ----------------
#
# The change converts a failure; it must not create one.  Without these a fix
# that refused every store at all would look perfect.


class _User:
    pass


_u = _User()
_u.x = 5
r['user_instance_attr'] = _u.x
_User.y = 6
r['user_class_attr'] = _User.y


class _Exc(Exception):
    pass


_e2 = _Exc('boom')
_e2.detail = 'kept'
r['exception_attr'] = _e2.detail


def _f():
    pass


_f.tag = 'kept'
r['function_attr'] = _f.tag


EXPECTED = {
    'call_Ellipsis': 'ok -> True',
    'call_None': 'ok -> True',
    'call_NotImplemented': 'ok -> True',
    'call_args_Ellipsis': 'TypeError',
    'call_args_None': 'TypeError',
    'call_args_NotImplemented': 'TypeError',
    'call_kwargs_Ellipsis': 'TypeError',
    'call_kwargs_None': 'TypeError',
    'call_kwargs_NotImplemented': 'TypeError',
    'class_get_NoneType': "AttributeError: type object 'NoneType' has no attribute 'nosuchattr'",
    'class_get_float': "AttributeError: type object 'float' has no attribute 'nosuchattr'",
    'class_get_int': "AttributeError: type object 'int' has no attribute 'nosuchattr'",
    'class_get_str': "AttributeError: type object 'str' has no attribute 'nosuchattr'",
    'class_set_NoneType': "TypeError: cannot set 'foo' attribute of immutable type 'NoneType'",
    'class_set_float': "TypeError: cannot set 'foo' attribute of immutable type 'float'",
    'class_set_int': "TypeError: cannot set 'foo' attribute of immutable type 'int'",
    'class_set_str': "TypeError: cannot set 'foo' attribute of immutable type 'str'",
    'exception_attr': 'kept',
    'function_attr': 'kept',
    'kwargs_frozenset': 'TypeError',
    'kwargs_object': 'TypeError',
    'kwargs_slice': 'TypeError',
    'kwargs_tuple': 'TypeError',
    'read_bool': "AttributeError: 'bool' object has no attribute 'nosuchattr'",
    'read_bytes': "AttributeError: 'bytes' object has no attribute 'nosuchattr'",
    'read_float': "AttributeError: 'float' object has no attribute 'nosuchattr'",
    'read_int': "AttributeError: 'int' object has no attribute 'nosuchattr'",
    'read_str': "AttributeError: 'str' object has no attribute 'nosuchattr'",
    'singleton_class_get_Ellipsis': "AttributeError: type object 'ellipsis' has no attribute 'prop'",
    'singleton_class_get_None': "AttributeError: type object 'NoneType' has no attribute 'prop'",
    'singleton_class_get_NotImplemented': "AttributeError: type object 'NotImplementedType' has no attribute 'prop'",
    'singleton_class_set_Ellipsis': "TypeError: cannot set 'prop' attribute of immutable type 'ellipsis'",
    'singleton_class_set_None': "TypeError: cannot set 'prop' attribute of immutable type 'NoneType'",
    'singleton_class_set_NotImplemented': "TypeError: cannot set 'prop' attribute of immutable type 'NotImplementedType'",
    'singleton_get_Ellipsis': "AttributeError: 'ellipsis' object has no attribute 'prop'",
    'singleton_get_None': "AttributeError: 'NoneType' object has no attribute 'prop'",
    'singleton_get_NotImplemented': "AttributeError: 'NotImplementedType' object has no attribute 'prop'",
    'singleton_set_Ellipsis': "AttributeError: 'ellipsis' object has no attribute 'prop' and no __dict__ for setting new attributes",
    'singleton_set_None': "AttributeError: 'NoneType' object has no attribute 'prop' and no __dict__ for setting new attributes",
    'singleton_set_NotImplemented': "AttributeError: 'NotImplementedType' object has no attribute 'prop' and no __dict__ for setting new attributes",
    'store_bool': "AttributeError: 'bool' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_bytes': "AttributeError: 'bytes' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_carries_name': 'zz',
    'store_float': "AttributeError: 'float' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_frozenset': "AttributeError: 'frozenset' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_int': "AttributeError: 'int' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_str': "AttributeError: 'str' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'store_tuple': "AttributeError: 'tuple' object has no attribute 'zz' and no __dict__ for setting new attributes",
    'user_class_attr': 6,
    'user_instance_attr': 5,
}


# A NAMED roll-up, not a count.  The SUnit peer asserts on this one string, so
# it has to say which check moved -- a bare "49 of 50" would report that
# something broke without saying what, and a check silently DELETED would leave
# a green count behind.  The key comparison catches that last case: a probe
# added without a measured expectation, or one removed, changes it.
DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-38s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
