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
