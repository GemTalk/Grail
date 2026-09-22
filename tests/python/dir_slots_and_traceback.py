# Two things dir() reports that Grail got wrong, both of them about WHERE the
# type comes from.
#
# A CLASS MAY SHADOW ITS OWN ``__class__''.  CPython's object.__dir__ reaches
# the type through ``getattr(self, '__class__')'', and that read can fail:
# ``__slots__ = ['__class__']'' names a real per-instance slot, which starts
# UNSET, so the read raises AttributeError until something assigns it.  dir()
# is then left with the instance's own names and nothing from the type.
# test_dir calls it "an ugly trick to cause getattr(f, '__class__') to fail".
#
# Grail took ``self class'' directly, so no shadowing could reach it: the
# read answered the real Smalltalk class and dir() answered the whole type
# chain.  Going through the attribute read makes the degradation happen for the
# same reason CPython's does rather than special-casing the trick.
#
# Two things had to move for it.  The __class__ SHORTCUT in the attribute
# loader already yields to a class body that declares its own ``__class__'' (a
# property), and a slot is not a class attribute, so it did not yield to one.
# And the slot has to be read RAW: a compiled slot getter ends
# ``ifNil: [self ___pyAttrLoad___: #'x']'', so asking it from inside
# ___pyAttrLoad___ recurses until the stack gives out.
#
# A TRACEBACK REPORTS EXACTLY FOUR NAMES.  CPython's traceback type contributes
# no dunders at all, and test_dir asserts the LENGTH, so an extra name is a
# failure.  Grail's generic __dir__ answered 29: every dunder object
# contributes, and NONE of the four, because they are read through the
# attribute chain rather than compiled as plain selectors.  The list was both
# too long and missing the only names anyone asks a traceback for.
#
# test_builtin's test_dir.

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Shadowed(object):
    __slots__ = ["__class__", "__dict__"]

    def __init__(self):
        self.bar = "wow"


class Plain(object):
    def __init__(self):
        self.x = 7


class WithClassProperty(object):
    """The OTHER way __class__ is shadowed, which already worked: a property.
    The abstract-class protocol depends on it."""

    @property
    def __class__(self):
        return Plain


# --- the slot shadows the type -------------------------------------------------

def raised(fn):
    """The exception TYPE and the tail of its message.

    Not the whole message: CPython names the class QUALIFIED when the module
    was imported (``dir_slots_and_traceback.Shadowed'') and bare when it ran as
    __main__, while Grail says ``Shadowed'' either way.  That divergence is
    about how an AttributeError names a class and is the same for every
    object; pinning it here would make this fixture disagree with itself
    depending on how it was run.
    """
    try:
        fn()
        return 'no raise'
    except Exception as e:
        return (type(e).__name__,
                str(e).endswith("object has no attribute '__class__'"))


r['reading_it_raises'] = raised(lambda: Shadowed().__class__)
r['getattr_raises'] = raised(lambda: getattr(Shadowed(), '__class__'))
r['dir_drops_the_type'] = outcome(lambda: '__repr__' in dir(Shadowed()))
r['dir_keeps_own_names'] = outcome(lambda: 'bar' in dir(Shadowed()))

# --- and an assignment fills it -------------------------------------------------


def _assigned():
    f = Shadowed()
    f.__class__ = Plain
    return (f.__class__ is Plain, '__repr__' in dir(f))


r['assigning_the_slot'] = outcome(_assigned)

# --- a traceback reports exactly four names --------------------------------------


def _traceback_dir():
    try:
        raise IndexError
    except IndexError as e:
        return sorted(dir(e.__traceback__))


r['traceback_dir'] = outcome(_traceback_dir)
r['traceback_dir_length'] = outcome(lambda: len(_traceback_dir()))

# --- controls --------------------------------------------------------------------
#
# The shortcut yields ONLY to a declared slot, so every other object still
# answers its real type, and the property form -- which the abstract-class
# protocol depends on -- keeps working.

r['plain_instance_dir'] = outcome(
    lambda: ('__repr__' in dir(Plain()), 'x' in dir(Plain())))
r['plain_instance_class'] = outcome(lambda: Plain().__class__ is Plain)
r['class_dir'] = outcome(lambda: '__init__' in dir(Plain))
r['builtin_dir'] = outcome(lambda: '__add__' in dir(3))
r['property_shadow_still_works'] = outcome(
    lambda: WithClassProperty().__class__ is Plain)
r['isinstance_unaffected'] = outcome(lambda: isinstance(Plain(), Plain))
r['type_is_unaffected'] = outcome(lambda: type(Shadowed()).__name__)

EXPECTED = {
    'assigning_the_slot': 'ok -> (True, True)',
    'builtin_dir': 'ok -> True',
    'class_dir': 'ok -> True',
    'dir_drops_the_type': 'ok -> False',
    'dir_keeps_own_names': 'ok -> True',
    'getattr_raises': ('AttributeError', True),
    'isinstance_unaffected': 'ok -> True',
    'plain_instance_class': 'ok -> True',
    'plain_instance_dir': 'ok -> (True, True)',
    'property_shadow_still_works': 'ok -> True',
    'reading_it_raises': ('AttributeError', True),
    'traceback_dir': "ok -> ['tb_frame', 'tb_lasti', 'tb_lineno', 'tb_next']",
    'traceback_dir_length': 'ok -> 4',
    'type_is_unaffected': "ok -> 'Shadowed'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
