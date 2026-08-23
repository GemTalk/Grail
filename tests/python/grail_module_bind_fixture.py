# Fixture for tests/scripts/runModuleBindTest.gs — the phase-5 acceptance
# test of docs/Persistent_Modules_and_Classes.md par.10.6.
#
# Exercises the three definition-time side-effect families that made the
# old reuse-classes + re-run-body hybrid incoherent, so a warm-BOUND import
# in a later session proves the whole graph stayed consistent:
#   - @dataclass: the synthesized __init__ / field objects capture
#     dataclasses' MISSING sentinel at definition time;
#   - @enum.global_enum: class creation injects member names into THIS
#     module's globals;
#   - a class decorator populating a module-level registry.
#
# ``events`` discriminates bind from re-run: the module body sets it to
# ['boot']; session A appends 'A' after import and commits; a warm-bound
# session B must see ['boot', 'A'] (a body re-run would rebind ['boot']).
import enum
from enum import IntEnum
from dataclasses import dataclass, field

events = ['boot']

REGISTRY = {}


def register(cls):
    REGISTRY[cls.__name__] = cls
    return cls


@register
@dataclass
class Widget:
    name: str = 'unnamed'
    tags: list = field(default_factory=list)

    def describe(self):
        return self.name + ':' + str(len(self.tags))


@enum.global_enum
class Color(IntEnum):
    CRIMSON = 1
    TEAL = 2


# True only if global_enum's injection landed in this module's globals.
injected_ok = (CRIMSON is Color.CRIMSON) and (TEAL is Color.TEAL)


# Session tier (doc par.10.4): __session_init__ runs once per session per
# module, at every ACQUISITION -- after a cold body run, after a warm bind
# (where the body does not run), and after reload().  The body resets
# init_count to 0 and each acquisition increments it, so:
#   cold import      -> 1   (body 0, hook +1)
#   warm bind        -> committed_value + 1  (no body, hook +1)
#   reload           -> 1   (body re-runs to 0, hook +1)
init_count = 0


def __session_init__():
    global init_count
    init_count = init_count + 1


# par.8.4: the two records only the class BUILD writes -- an MI class's declared
# bases / MRO, and the direct-subclass links.  A warm bind runs no class
# statement, so before they were restored from the committed side, ``Both``
# reported only its Smalltalk superclass and __subclasses__() was empty.
class Mixin:
    def tag(self):
        return 'mixin'


class Base:
    def tag(self):
        return 'base'


class Both(Base, Mixin):
    pass


class Derived(Both):
    pass


def class_structure():
    """Read the reflective metadata AT CALL TIME.

    A module-level dict would be computed by the body and committed with it,
    so a warm-bound session would read session A's answer and prove nothing.
    """
    return {
        'both_bases': [b.__name__ for b in Both.__bases__],
        'mixin_in_mro': 'Mixin' in [c.__name__ for c in Both.__mro__],
        'base_subclasses': sorted(c.__name__ for c in Base.__subclasses__()),
        'mixin_subclasses': sorted(c.__name__ for c in Mixin.__subclasses__()),
        'both_subclasses': sorted(c.__name__ for c in Both.__subclasses__()),
    }
