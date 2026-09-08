"""A metaclass's class-body attribute is reachable from the class.

Methods on a metaclass reached the class; data did not.

    class AttrMeta(type):
        registry = {}
    class Owned(metaclass=AttrMeta): pass

    Owned.registry      # was AttributeError; CPython answers {}

`ClassDefAst` compiles a class-body `name = expr` to a class-side
getter/setter PAIR, not to an entry in `___dynInstVars___` -- so
`AttrMeta.registry` resolved through the accessor branch of
`___pyAttrLoad___` while `Owned.registry` looked only in the store that
branch does not use, and raised.

It matters because it is half of the canonical metaclass idiom: CPython's
singleton keeps `_instances = {}` on the metaclass and reads it as
`cls._instances` from inside `__call__`.  Written that way, it is
asserted here.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


class AttrMeta(type):
    COUNT = 7
    LABEL = 'from-meta'

    def get_registry(cls):
        return cls.SHARED

    SHARED = {}


class Owned(metaclass=AttrMeta):
    pass


class Inheriting(Owned):
    """A metaclass is inherited, as in CPython."""


class Shadowing(metaclass=AttrMeta):
    LABEL = 'from-class'


# ------------------------------------------------ reading it off the class

def _read_off_the_class():
    return (Owned.COUNT, Owned.LABEL)


def _read_from_inside_a_metaclass_method():
    """``cls.SHARED`` where cls is the using class, not the metaclass."""
    return Owned.get_registry()


def _the_metaclass_still_reads_its_own():
    return (AttrMeta.COUNT, AttrMeta.LABEL)


def _an_inherited_metaclass_too():
    return (Inheriting.COUNT, Inheriting.get_registry())


def _it_is_the_same_object():
    """Not a copy -- a registry only works if every class sees one dict."""
    return Owned.SHARED is Inheriting.SHARED is AttrMeta.SHARED


check('read_off_the_class', _read_off_the_class(), (7, 'from-meta'))
check('read_from_inside_a_metaclass_method',
      _read_from_inside_a_metaclass_method(), {})
check('the_metaclass_still_reads_its_own', _the_metaclass_still_reads_its_own(),
      (7, 'from-meta'))
check('an_inherited_metaclass_too', _an_inherited_metaclass_too(), (7, {}))
check('it_is_the_same_object', _it_is_the_same_object(), True)


# ---------------------------------------------------- who outranks whom

def _the_class_own_attribute_wins():
    """A name the class itself binds shadows the metaclass's."""
    return (Shadowing.LABEL, Shadowing.COUNT)


class OwnMethodMeta(type):
    def describe(cls):
        return 'from-meta'


class OverridesIt(metaclass=OwnMethodMeta):
    @classmethod
    def describe(cls):
        return 'from-class'


def _the_class_own_method_wins():
    return OverridesIt.describe()


check('the_class_own_attribute_wins', _the_class_own_attribute_wins(),
      ('from-class', 7))
check('the_class_own_method_wins', _the_class_own_method_wins(), 'from-class')


# --------------------------------- the registry idiom, read AND written

class RegistryMeta(type):
    _registry = {}

    def register(cls, key):
        """Writes through the class to the metaclass's dict, which is the
        half a read-only fix would leave broken."""
        cls._registry[key] = cls
        return len(cls._registry)

    def lookup(cls, key):
        return cls._registry.get(key)


class Alpha(metaclass=RegistryMeta):
    pass


class Beta(metaclass=RegistryMeta):
    pass


def _the_registry_idiom():
    """Every class sees ONE dict, written through whichever class you
    happen to hold -- the shape a singleton or a plugin registry needs.

    (The singleton spelled with ``__call__`` needs a metaclass __call__ to
    run at all, which is a separate change; this exercises the same read
    and the same write without it.)"""
    RegistryMeta._registry.clear()
    n1 = Alpha.register('a')
    n2 = Beta.register('b')
    return (n1, n2, Alpha.lookup('b') is Beta,
            Alpha._registry is Beta._registry,
            len(RegistryMeta._registry))


check('the_registry_idiom', _the_registry_idiom(), (1, 2, True, True, 2))


# ------------------------------------------------- what must NOT change

class Plain:
    THING = 'plain'


class QuietMeta(type):
    def unrelated(cls):
        return 'unrelated'


class Quiet(metaclass=QuietMeta):
    OWN = 'own'


def _a_plain_class_is_unaffected():
    return (Plain.THING, _outcome(lambda: Plain.NOPE)[0])


def _a_metaclass_without_attributes_is_unaffected():
    return (Quiet.OWN, Quiet.unrelated(), _outcome(lambda: Quiet.NOPE)[0])


def _a_missing_name_still_raises():
    return _outcome(lambda: Owned.NO_SUCH_NAME)[0]


def _instances_do_not_see_it():
    """A metaclass attribute is not part of the INSTANCE protocol."""
    return _outcome(lambda: Owned().COUNT)[0]


check('a_plain_class_is_unaffected', _a_plain_class_is_unaffected(),
      ('plain', 'AttributeError'))
check('a_metaclass_without_attributes_is_unaffected',
      _a_metaclass_without_attributes_is_unaffected(),
      ('own', 'unrelated', 'AttributeError'))
check('a_missing_name_still_raises', _a_missing_name_still_raises(),
      'AttributeError')
check('instances_do_not_see_it', _instances_do_not_see_it(),
      'AttributeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
