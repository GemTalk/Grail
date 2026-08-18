"""``cls.__subclasses__()'' -- the direct subclasses of a class.

Grail had no such method, and could not simply grow one: its classes are
ANONYMOUS.  Class.gs's ___subclass___ creates every Python class with
``inDictionary: nil'', and GemStone's own ``Behavior>>subclasses'' is
``ClassOrganizer new subclassesOf: self'' -- a scan of the SYMBOL DICTIONARIES.
So the machinery Grail already had answered a correct list for the
Smalltalk-defined Python classes and an EMPTY one for every class any Python
module defines, which is all of them.

That was not only a missing feature.  functools' ABC _compose_mro walk consults
the same computation to find the concrete classes registered under an abstract
one, so ``class MySeq(Sequence)'' in a module was invisible to the walk whose
whole purpose is finding exactly that.  Both now read importlib's subclass
registry, written at the one point every Python class creation passes through.

pydoc is what made it urgent: TextDoc.docclass lists a class's built-in
subclasses via ``type.__subclasses__(object)'' -- the UNBOUND spelling -- and
the AttributeError from its absence was swallowed by document()'s own
``except AttributeError: pass'', so every class was described as a plain value
instead.  Both spellings are asserted below for that reason.
"""


class Base:
    pass


class K1(Base):
    pass


class K2(Base):
    pass


class GrandKid(K1):
    pass


class M1:
    pass


class M2:
    pass


class Both(M1, M2):
    pass


def _make():
    class Local(Base):
        pass
    return Local


# Held in a module global on purpose: __subclasses__ is a list of classes that
# still exist, so a class with no reference left is allowed to disappear from it.
_local = _make()


def _names(classes):
    return sorted(c.__name__ for c in classes)


r = {}

# --- the bound spelling -----------------------------------------------------------------
r['direct'] = repr(_names(Base.__subclasses__()))
# DIRECT subclasses only -- a grandchild belongs to its own parent's list.
r['grandchild_not_direct'] = repr('GrandKid' in _names(Base.__subclasses__()))
r['grandchild_of_k1'] = repr(_names(K1.__subclasses__()))
r['leaf_is_empty'] = repr(GrandKid.__subclasses__())
# A class defined inside a function is registered the same way as a module-level
# one; this is the case GemStone's dictionary scan could never have found.
r['function_local_is_listed'] = repr('Local' in _names(Base.__subclasses__()))

# A SECONDARY base has to see the class too.  Grail chains a
# multiple-inheritance class under its primary base alone, so M2 finds Both only
# through the MI registry -- a different source from the one M1 uses.
r['primary_base'] = repr(_names(M1.__subclasses__()))
r['secondary_base'] = repr(_names(M2.__subclasses__()))

# --- the unbound spelling ---------------------------------------------------------------
# ``type.__subclasses__'' is a descriptor in CPython, taking the class
# explicitly.  Reading it off Grail's ``type'' class object used to bind the
# receiver to ``type'' itself, so the argument arrived as a surplus one.
r['unbound'] = repr(_names(type.__subclasses__(Base)))
r['unbound_agrees'] = repr(
    _names(type.__subclasses__(Base)) == _names(Base.__subclasses__()))

# --- shape ------------------------------------------------------------------------------
r['is_a_list'] = repr(type(Base.__subclasses__()) is list)
r['no_duplicates'] = repr(
    len(Base.__subclasses__()) == len(set(Base.__subclasses__())))


EXPECTED = {
    'direct': "['K1', 'K2', 'Local']",
    'function_local_is_listed': 'True',
    'grandchild_not_direct': 'False',
    'grandchild_of_k1': "['GrandKid']",
    'is_a_list': 'True',
    'leaf_is_empty': '[]',
    'no_duplicates': 'True',
    'primary_base': "['Both']",
    'secondary_base': "['Both']",
    'unbound': "['K1', 'K2', 'Local']",
    'unbound_agrees': 'True',
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-26s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
