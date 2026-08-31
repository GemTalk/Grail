"""Smoke fixture for the direct-to-IR module-method codegen path
(GRAIL_IR_CODEGEN).

Every top-level def here is in the narrow subset FunctionDefAst>>___irEligible___
admits for the first IR cut: module-level, simple positional args, no
decorators / annotations, read-only parameters, and a body of only
pass / return over constant and plain-local-name values.  So under Grail with
the flag on, each of these compiles through GsNMethod>>generateFromIR: instead
of source compilation; the RESULTS dict below calls them so the module import
also exercises env-1 dispatch to the IR-built methods.

Plain Python otherwise: under CPython the flag does not exist, the functions are
ordinary, and RESULTS is the same, so the fixture gate compares equal.
"""


def answer():
    return 42


def identity(x):
    return x


def greet():
    return "hello"


def flag_true():
    return True


def flag_false():
    return False


def nothing():
    pass


def bare_return():
    return


def pick_middle(a, b, c):
    return b


def echo_none():
    return None


def add_ints(a, b):
    return a + b


def poly(x):
    return x * x + 1


def negate(x):
    return -x


def invert(x):
    return ~x


def less(a, b):
    return a < b


def equal(a, b):
    return a == b


def sign(x):
    if x > 0:
        return 1
    elif x < 0:
        return -1
    else:
        return 0


def clamp10(x):
    if x > 10:
        return 10
    if x < 0:
        return 0
    return x


def poly_local(x):
    y = x * x
    z = y + 1
    return z


def ir_raiser():
    n = 1
    return n + "oops"


def text_caller():
    import traceback
    try:
        ir_raiser()
    except TypeError:
        return traceback.format_exc()
    return ""


def use_abs(x):
    return abs(x)


def use_max(a, b):
    return max(a, b)


def head(s):
    return s[0]


def re_of(z):
    return z.real


def bump(x):
    total = x
    total += 5
    return total


def scale(x):
    acc = x
    acc *= 3
    acc -= 1
    return acc


def concat(a, b):
    s = a
    s += b
    return s


def pair(a, b):
    return (a, b)


def empty_tuple():
    return ()


def listing(x):
    xs = [x, x + 1, 2]
    return xs[1]


def empty_list():
    return []


def nested(a, b):
    return [(a, b), a]


def shout(s):
    return s.upper()


def find_pos(s, c):
    return s.find(c)


def dashed(sep, a, b):
    return sep.join([a, b])


def count_to(n):
    i = 0
    while i < n:
        i += 1
    return i


def sum_below(n):
    total = 0
    i = 0
    while i < n:
        total += i
        i += 1
    return total


def find_first_ge(xs, limit):
    i = 0
    while i < len(xs):
        if xs[i] >= limit:
            return xs[i]
        i += 1
    return -1


def skip_odds(n):
    total = 0
    i = 0
    while True:
        i += 1
        if i >= n:
            break
        if i % 2 == 1:
            continue
        total += i
    return total


def cond_rebind(flag):
    x = 0
    if flag:
        x = 1
    return x


def double(x):
    return x + x


def quadruple(x):
    return double(double(x))


def dispatch_add(a, b):
    return add_ints(a, b) + answer()


def base_impl():
    return 1


def call_base():
    return base_impl()


def both(a, b):
    return a and b


def either(a, b):
    return a or b


CALL_BASE_ORIGINAL = call_base()
base_impl = lambda: 2  # noqa: E731 -- rebinding the def exercises the self-send probe's rebound branch
REBOUND_RESULT = call_base()

RESULTS = {
    "answer": answer() == 42,
    "identity_int": identity(99) == 99,
    "identity_str": identity("z") == "z",
    "greet": greet() == "hello",
    "flag_true": flag_true() is True,
    "flag_false": flag_false() is False,
    "nothing": nothing() is None,
    "bare_return": bare_return() is None,
    "pick_middle": pick_middle(10, 20, 30) == 20,
    "echo_none": echo_none() is None,
    "add_ints": add_ints(3, 4) == 7,
    "poly": poly(5) == 26,
    "negate": negate(7) == -7,
    "invert": invert(5) == -6,
    "less": less(3, 4) is True,
    "less_false": less(4, 3) is False,
    "equal": equal(2, 2) is True,
    "sign_pos": sign(5) == 1,
    "sign_neg": sign(-3) == -1,
    "sign_zero": sign(0) == 0,
    "clamp_hi": clamp10(15) == 10,
    "clamp_lo": clamp10(-2) == 0,
    "clamp_mid": clamp10(5) == 5,
    "poly_local": poly_local(5) == 26,
    "use_abs": use_abs(-5) == 5,
    "use_max": use_max(3, 7) == 7,
    "head": head("hi") == "h",
    "re_of": re_of(complex(3, 4)) == 3.0,
    "pair": pair(1, 2) == (1, 2),
    "empty_tuple": empty_tuple() == (),
    "listing": listing(5) == 6,
    "empty_list": empty_list() == [],
    "nested": nested(1, 2) == [(1, 2), 1],
    "bump": bump(10) == 15,
    "scale": scale(4) == 11,
    "concat": concat("ab", "cd") == "abcd",
    "shout": shout("hi") == "HI",
    "find_pos": find_pos("hello", "l") == 2,
    "dashed": dashed("-", "a", "b") == "a-b",
    "count_to": count_to(5) == 5,
    "count_to_zero": count_to(0) == 0,
    "sum_below": sum_below(5) == 10,
    "find_first_ge": find_first_ge([1, 5, 9], 4) == 5,
    "find_first_ge_miss": find_first_ge([1, 2], 9) == -1,
    "skip_odds": skip_odds(7) == 12,
    "cond_rebind_true": cond_rebind(True) == 1,
    "cond_rebind_false": cond_rebind(False) == 0,
    "quadruple": quadruple(3) == 12,
    "dispatch_add": dispatch_add(1, 2) == 45,
    "call_base_original": CALL_BASE_ORIGINAL == 1,
    "call_base_rebound": REBOUND_RESULT == 2,
    "both_last": both(3, 5) == 5,
    "both_short": both(0, 5) == 0,
    "either_first": either(3, 7) == 3,
    "either_second": either(0, 7) == 7,
}

ALL_OK = all(RESULTS.values())

print("ir_codegen_smoke RESULTS:", RESULTS)
print("ir_codegen_smoke ALL_OK:", ALL_OK)
