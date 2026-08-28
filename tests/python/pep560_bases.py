"""PEP 560 base substitution: tuples for __bases__/__mro__, and
__orig_bases__ on the sole-base path.

Two shape bugs, both of which made correct machinery look broken.

``cls.__bases__`` and ``cls.__mro__`` answered a plain Smalltalk Array
where CPython answers a TUPLE, so every ``assertEqual(D.__bases__, (A, C,
B))`` failed however right the contents were -- which was most of
test_genericclass's TestMROEntry.  A Grail tuple is an Array SUBCLASS, so
every Smalltalk reader (do:, at:, size, the MI registry) is unaffected.

``__orig_bases__`` -- the original header, the only way back to a base the
substitution replaced or removed -- was recorded only on the MULTI-base
path.  The sole-base path is the shape the protocol is most used in (a
generic alias is normally the only base), and it recorded nothing.  It now
stashes the tuple during ___subclass___: and installs it from
___pyClassDefined___:, because at substitution time the class exists but
its attribute holder does not yet.

The sole-base hook lookup also walks the TRUE MRO rather than the
Smalltalk superclass chain, so a hook inherited from a secondary base is
found: a multiple-inheritance class is one Smalltalk class whose
superclass is only its primary base.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- tuples, not arrays -------------------------------------------------

class Plain:
    pass


class Child(Plain):
    pass


check('bases_is_a_tuple', isinstance(Child.__bases__, tuple), True)
check('bases_contents', Child.__bases__, (Plain,))
check('mro_is_a_tuple', isinstance(Child.__mro__, tuple), True)
check('mro_contents', Child.__mro__, (Child, Plain, object))
check('object_bases_of_a_root', Plain.__bases__, (object,))
check('mro_method_is_a_list', isinstance(Child.mro(), list), True)


# -- __mro_entries__ substitution, several bases ------------------------

_seen = []


class A:
    pass


class B:
    pass


class Sub:
    def __mro_entries__(self, bases):
        _seen.append(bases)
        return (self.__class__,)


_sub = Sub()


class Multi(A, _sub, B):
    pass


check('hook_saw_the_whole_header', _seen[-1], (A, _sub, B))
check('multi_bases_substituted', Multi.__bases__, (A, Sub, B))
check('multi_orig_bases', Multi.__orig_bases__, (A, _sub, B))
check('multi_mro', Multi.__mro__, (Multi, A, Sub, B, object))


# -- the SOLE-base path -------------------------------------------------

class SoleReplacing:
    def __mro_entries__(self, bases):
        return (A,)


_sole = SoleReplacing()


class SoleSub(_sole):
    pass


check('sole_bases_substituted', SoleSub.__bases__, (A,))
check('sole_orig_bases', SoleSub.__orig_bases__, (_sole,))
check('sole_mro', SoleSub.__mro__, (SoleSub, A, object))


class SoleEmpty:
    def __mro_entries__(self, bases):
        return ()


_empty = SoleEmpty()


class EmptySub(_empty):
    pass


check('empty_bases_falls_back_to_object', EmptySub.__bases__, (object,))
check('empty_orig_bases_still_recorded', EmptySub.__orig_bases__, (_empty,))
check('empty_mro', EmptySub.__mro__, (EmptySub, object))


# An ordinary class has no __orig_bases__ at all.

check('ordinary_class_has_no_orig_bases',
      hasattr(Child, '__orig_bases__'), False)


# -- a parameterised generic has NO __bases__ ---------------------------
#
# The one attribute CPython does not proxy to the origin, and the
# difference is load-bearing: isinstance()/issubclass() decide whether a
# non-type classinfo joins the old-style protocol by asking for a TUPLE
# __bases__, so proxying it makes ``isinstance([], list[int])`` look like
# a legitimate check instead of the TypeError CPython raises.  Grail got
# the right answer for the wrong reason until __bases__ above started
# answering a real tuple.

check('alias_has_no_bases', hasattr(list[int], '__bases__'), False)
check('alias_still_proxies_args', list[int].__args__, (int,))

# __mro__ IS still proxied -- asserted through its first entry rather than
# whole, because a BUILTIN origin's MRO still leaks Grail's Smalltalk
# ancestry (list, SequenceableCollection, Collection, object) where CPython
# has (list, object).  That gap is real and separate; see docs/Issues.md.
# What this change owns is that __bases__ stopped being proxied and
# everything else did not.
check('alias_still_proxies_mro', list[int].__mro__[0], list)


def _isinstance_with_alias():
    try:
        isinstance([], list[int])
        return 'no raise'
    except TypeError:
        return 'TypeError'


def _issubclass_with_alias():
    try:
        issubclass(list, list[int])
        return 'no raise'
    except TypeError:
        return 'TypeError'


check('isinstance_rejects_alias', _isinstance_with_alias(), 'TypeError')
check('issubclass_rejects_alias', _issubclass_with_alias(), 'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
