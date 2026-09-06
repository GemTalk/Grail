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


def in_range(lo, x, hi):
    return lo <= x <= hi


def ascending(a, b, c, d):
    return a < b < c < d


def negation(x):
    return not x


def pick(flag, a, b):
    return a if flag else b


def total_of(xs):
    total = 0
    for x in xs:
        total += x
    return total


def first_even(xs):
    for x in xs:
        if x % 2 == 0:
            return x
    return -1


def count_pairs(xs):
    n = 0
    for a in xs:
        for b in xs:
            if a < b:
                n += 1
    return n


def make_point(x, y):
    return {"x": x, "y": y}


def empty_dict():
    return {}


def lookup(k):
    d = {"a": 1, "b": 2}
    return d[k]


def uniq_count(a, b, c):
    return len({a, b, c})


def same(a, b):
    return a is b


def differs(a, b):
    return a is not b


def holds(xs, x):
    return x in xs


def lacks(xs, x):
    return x not in xs


class Box:
    pass


def set_at(xs, i, v):
    xs[i] = v
    return xs[i]


def tag(obj, v):
    obj.tag_value = v
    return obj.tag_value


FLOOR = 10


def read_floor():
    return FLOOR


def above_floor(x):
    return x > FLOOR


def demand_positive(x):
    if x <= 0:
        raise ValueError("not positive")
    return x


def reraise_expr(e):
    raise e


def bare_reraise():
    raise


def safe_div(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return -1


def catch_as(xs, i):
    try:
        return xs[i]
    except IndexError as ex:
        return len(ex.args)


def catch_all(xs):
    try:
        return xs[5]
    except:
        return "caught"


FINALLY_RAN = []


def div_logged(a, b):
    try:
        return a / b
    finally:
        FINALLY_RAN.append(1)


def guarded_get(xs, i):
    try:
        return xs[i]
    except IndexError:
        return -1
    finally:
        FINALLY_RAN.append(2)


def both(a, b):
    return a and b


def either(a, b):
    return a or b


try:
    demand_positive(-3)
    DEMAND = "no-raise"
except ValueError as _dex:
    DEMAND = str(_dex)

try:
    reraise_expr(KeyError("k"))
    RERAISE = "no-raise"
except KeyError:
    RERAISE = "caught"

try:
    bare_reraise()
    BARE = "no-raise"
except RuntimeError:
    BARE = "runtime"

_ = div_logged(8, 2)
try:
    div_logged(1, 0)
    DIV_RAISED = False
except ZeroDivisionError:
    DIV_RAISED = True
_ = guarded_get([], 0)

CALL_BASE_ORIGINAL = call_base()
base_impl = lambda: 2  # noqa: E731 -- rebinding the def exercises the self-send probe's rebound branch
REBOUND_RESULT = call_base()


# --- cut 25: except tuples, in-handler bare raise, raise ... from ... ---

def classify(x):
    try:
        return 10 // x
    except (ZeroDivisionError, TypeError):
        return -1


def rethrow(x):
    try:
        return 10 // x
    except ZeroDivisionError:
        raise


def chained(x):
    try:
        return 10 // x
    except ZeroDivisionError as e:
        raise ValueError("bad") from e


def suppressed(x):
    try:
        return 10 // x
    except ZeroDivisionError:
        raise ValueError("bad") from None


RETHROWN = None
try:
    rethrow(0)
except ZeroDivisionError:
    RETHROWN = "zde"

CHAINED = None
try:
    chained(0)
except ValueError as _e:
    CHAINED = type(_e.__cause__).__name__

SUPPRESSED = None
try:
    suppressed(0)
except ValueError as _e:
    SUPPRESSED = (_e.__cause__ is None) and _e.__suppress_context__


# --- cut 26: multi-clause except (the shield) and try/else ---

def pick_handler(x):
    try:
        return 10 // x
    except ZeroDivisionError:
        return "zero"
    except TypeError:
        return "type"
    except Exception:
        return "other"


def shielded(x):
    # A raise inside the FIRST handler must leave the statement, not be
    # caught by the later clause (Python's clauses are alternatives for the
    # try body only).
    try:
        return 10 // x
    except ZeroDivisionError:
        raise TypeError("from handler")
    except TypeError:
        return "wrongly caught"


def with_else(d, k):
    # v is pre-bound: the IR flow rule rejects a FIRST binding inside a try
    # body (the body may raise before it), and does not yet know that an else
    # runs only after the body completed.  Deferred refinement.
    v = None
    try:
        v = d[k]
    except KeyError:
        return "missing"
    else:
        return v * 2


def else_not_protected(d, k):
    # An error raised in the else must NOT be caught by this try's handler.
    v = None
    try:
        v = d[k]
    except KeyError:
        return "missing"
    else:
        return v["inner"]


def bare_after_typed(x):
    try:
        return 10 // x
    except ZeroDivisionError:
        return "zero"
    except:
        return "bare"


SHIELDED = None
try:
    shielded(0)
except TypeError as _e:
    SHIELDED = str(_e)

ELSE_LEAK = None
try:
    else_not_protected({"a": 1}, "a")
except TypeError:
    ELSE_LEAK = "propagated"


# --- cut 27: assert, slices, del ---

def check_positive(x):
    assert x > 0
    return x


def check_with_msg(x):
    assert x > 0, "must be positive"
    return x


def middle(xs):
    return xs[1:3]


def evens(xs):
    return xs[::2]


def prefix(s, n):
    return s[:n]


def tail_from(xs, i):
    return xs[i:]


def splice(xs):
    xs[0:2] = [9, 9]
    return xs


def drop_key(d, k):
    del d[k]
    return d


def drop_attr(b):
    b.extra = 1
    del b.extra
    return hasattr(b, "extra")


ASSERT_MSG = None
try:
    check_with_msg(-1)
except AssertionError as _e:
    ASSERT_MSG = str(_e)

ASSERT_BARE = None
try:
    check_positive(0)
except AssertionError as _e:
    ASSERT_BARE = str(_e)


# --- cut 28: call shapes -- class constructors, keyword arguments, general callees ---

def to_text(x):
    return str(x)


def as_int(s):
    return int(s)


def make_box():
    return Box()


def rounded(x):
    return round(x, ndigits=1)


def sorted_desc(parts):
    return sorted(parts, reverse=True)


def apply(f, x):
    return f(x)


def apply_kw(f, x):
    return f(x, flag=True)


def kw_target(x, flag=False):
    return (x, flag)


def spec_fmt(x):
    return f"{x!r}/{x:>4}"


def count_chars(a):
    return len(str(a))


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
    "in_range_yes": in_range(1, 5, 10) is True,
    "in_range_no": in_range(1, 0, 10) is False,
    "in_range_hi": in_range(1, 11, 10) is False,
    "ascending_yes": ascending(1, 2, 3, 4) is True,
    "ascending_no": ascending(1, 3, 2, 4) is False,
    "negation_zero": negation(0) is True,
    "negation_list": negation([1]) is False,
    "pick_true": pick(True, 1, 2) == 1,
    "pick_false": pick(False, 1, 2) == 2,
    "pick_truthy": pick(0, 1, 2) == 2,
    "total_of": total_of([1, 2, 3]) == 6,
    "total_of_empty": total_of([]) == 0,
    "first_even": first_even([1, 3, 4, 5]) == 4,
    "first_even_miss": first_even([1, 3]) == -1,
    "count_pairs": count_pairs([1, 2, 3]) == 3,
    "make_point": make_point(1, 2) == {"x": 1, "y": 2},
    "empty_dict": empty_dict() == {},
    "lookup": lookup("b") == 2,
    "uniq_two": uniq_count(1, 2, 1) == 2,
    "uniq_three": uniq_count(1, 2, 3) == 3,
    "same_none": same(None, None) is True,
    "differs_none": differs(None, 1) is True,
    "holds_yes": holds([1, 2, 3], 2) is True,
    "holds_no": holds([1, 2, 3], 9) is False,
    "lacks_yes": lacks([1, 2], 9) is True,
    "lacks_str": lacks("abc", "b") is False,
    "set_at": set_at([10, 20, 30], 1, 99) == 99,
    "tag": tag(Box(), 7) == 7,
    "read_floor": read_floor() == 10,
    "above_floor": above_floor(11) is True,
    "demand_ok": demand_positive(5) == 5,
    "demand_raised": DEMAND == "not positive",
    "reraise_caught": RERAISE == "caught",
    "bare_runtime": BARE == "runtime",
    "safe_div_ok": safe_div(6, 3) == 2.0,
    "safe_div_zero": safe_div(1, 0) == -1,
    "catch_as_ok": catch_as([7], 0) == 7,
    "catch_as_err": catch_as([], 0) == 1,
    "catch_all_hit": catch_all([1, 2]) == "caught",
    "catch_all_ok": catch_all([0, 0, 0, 0, 0, 9]) == 9,
    "finally_on_return": FINALLY_RAN.count(1) == 2,
    "finally_on_raise": DIV_RAISED is True,
    "finally_with_except": FINALLY_RAN.count(2) == 1,
    "guarded_get_end": guarded_get([5], 0) == 5,
    "both_last": both(3, 5) == 5,
    "both_short": both(0, 5) == 0,
    "either_first": either(3, 7) == 3,
    "either_second": either(0, 7) == 7,
    "classify_zero": classify(0) == -1,
    "classify_type": classify("a") == -1,
    "classify_ok": classify(5) == 2,
    "rethrown": RETHROWN == "zde",
    "chained_cause": CHAINED == "ZeroDivisionError",
    "suppressed_cause": SUPPRESSED is True,
    "pick_zero": pick_handler(0) == "zero",
    "pick_type": pick_handler("a") == "type",
    "pick_ok": pick_handler(2) == 5,
    "shielded": SHIELDED == "from handler",
    "with_else_hit": with_else({"a": 3}, "a") == 6,
    "with_else_miss": with_else({}, "a") == "missing",
    "else_leak": ELSE_LEAK == "propagated",
    "else_miss": else_not_protected({}, "a") == "missing",
    "bare_after_typed_zero": bare_after_typed(0) == "zero",
    "bare_after_typed_bare": bare_after_typed("a") == "bare",
    "assert_ok": check_positive(3) == 3,
    "assert_bare_raised": ASSERT_BARE == "",
    "assert_msg_ok": check_with_msg(2) == 2,
    "assert_msg_raised": ASSERT_MSG == "must be positive",
    "middle": middle([0, 1, 2, 3, 4]) == [1, 2],
    "evens": evens([0, 1, 2, 3, 4]) == [0, 2, 4],
    "prefix": prefix("hello", 2) == "he",
    "tail_from": tail_from([5, 6, 7], 1) == [6, 7],
    "splice": splice([1, 2, 3]) == [9, 9, 3],
    "drop_key": drop_key({"a": 1, "b": 2}, "a") == {"b": 2},
    "drop_attr": drop_attr(Box()) is False,
    "to_text": to_text(42) == "42",
    "as_int": as_int("17") == 17,
    "make_box": type(make_box()).__name__ == "Box",
    "rounded": rounded(2.345) == 2.3,
    "sorted_desc": sorted_desc([1, 3, 2]) == [3, 2, 1],
    "apply": apply(abs, -4) == 4,
    "apply_kw": apply_kw(kw_target, 5) == (5, True),
    "spec_fmt": spec_fmt(7) == "7/   7",
    "count_chars": count_chars(1234) == 4,
}

ALL_OK = all(RESULTS.values())

print("ir_codegen_smoke RESULTS:", RESULTS)
print("ir_codegen_smoke ALL_OK:", ALL_OK)
