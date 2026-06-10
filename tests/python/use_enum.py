# Fixture for EnumTestCase.  Exercises real Enum / IntEnum / IntFlag built
# by the metaclass hook.  Operations whose dispatch path is uncertain
# (Cls(value), Cls['NAME'], list(Cls)) are guarded so one failure doesn't
# abort the whole fixture; results land in dict ``r``.

import importlib
import enum
importlib.reload(enum)
from enum import Enum, IntEnum, IntFlag

r = {}


def _try(fn):
    try:
        return fn()
    except Exception as e:
        return 'ERR:' + str(e)


class Color(IntEnum):
    RED = 1
    GREEN = 2
    BLUE = 3


# --- core member protocol (high confidence) -------------------------
r['red_value'] = Color.RED.value
r['red_name'] = Color.RED.name
r['red_is_int'] = isinstance(Color.RED, int)
r['red_eq_1'] = (Color.RED == 1)
r['one_eq_red'] = (1 == Color.RED)
r['red_lt_green'] = (Color.RED < Color.GREEN)
r['red_plus_1'] = Color.RED + 1
r['red_repr'] = repr(Color.RED)
r['red_identity'] = (Color.RED is Color.RED)

# --- value lookup / name lookup / iteration (uncertain dispatch) ----
r['lookup_value'] = _try(lambda: Color(2) is Color.GREEN)
r['lookup_value_repr'] = _try(lambda: repr(Color(2)))
r['lookup_name'] = _try(lambda: Color['BLUE'] is Color.BLUE)
r['member_count'] = _try(lambda: len(list(Color)))

# --- plain Enum (markers) -------------------------------------------
class State(Enum):
    A = enum.auto()
    B = enum.auto()
    C = enum.auto()


r['state_a_name'] = State.A.name
r['state_distinct'] = (State.A is not State.B)
r['state_eq'] = (State.A == State.A)
r['state_ne'] = (State.A != State.B)
# auto() is a process-global counter, so the exact value isn't stable
# across the suite; assert the repr shape, not the number.
r['state_repr_ok'] = repr(State.A).startswith('<State.A: ')
r['state_lookup_name'] = _try(lambda: State['B'] is State.B)
r['state_count'] = _try(lambda: len(list(State)))

# --- IntFlag --------------------------------------------------------
class Perm(IntFlag):
    READ = 1
    WRITE = 2
    EXEC = 4


r['perm_read_value'] = Perm.READ.value
r['perm_is_int'] = isinstance(Perm.READ, int)
r['perm_or'] = _try(lambda: int(Perm.READ | Perm.WRITE))
