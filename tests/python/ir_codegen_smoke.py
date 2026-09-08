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
    # Deliberately NOT IR-eligible: this def is the TEXT side of the
    # text-calls-IR traceback check below.  A ``global'' declaration is the
    # opt-out (cut 30 made a function-level import eligible on its own).
    global FLOOR
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
    # v is first bound INSIDE the try body and read in the else: the flow
    # analysis knows (since cut 31) that an else runs only after the body
    # completed, so the body's bindings hold there.
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


# --- cut 29: reassigned parameters (the text's transport-arg + temp shadow) ---

def clamp(x, lo, hi):
    if x < lo:
        x = lo
    if x > hi:
        x = hi
    return x


def accumulate(total, items):
    for item in items:
        total += item
    return total


def normalize(s):
    s = s.strip()
    s = s.lower()
    return s



# --- cut 30: function-level import ---

def load_sqrt(x):
    import math
    return math.sqrt(x)


def alias_join(a, b):
    import os.path as p
    return p.join(a, b)


def dotted_top():
    import os.path
    return os.sep


# --- cut 31: bindings inside nested blocks (the recursive flow analysis) ---

def first_even_bound(xs):
    for x in xs:
        if x % 2 == 0:
            found = x
            return found
    return None


def label(n):
    if n < 0:
        word = "neg"
    else:
        word = "nonneg"
    return word


def sum_squares(xs):
    total = 0
    for x in xs:
        sq = x * x
        total += sq
    return total


def try_get(d, k):
    try:
        v = d[k]
    except KeyError:
        return "missing"
    return v * 2


def try_get_else(d, k):
    try:
        v = d[k]
    except KeyError:
        return "missing"
    else:
        doubled = v * 2
    return doubled


def countdown(n):
    while n > 0:
        step = n
        n -= step
    return n


def maybe(flag):
    # Deliberately NOT IR-eligible: x is bound on one branch only, so the read
    # can raise UnboundLocalError and needs the text path's guard.  The flow
    # analysis must refuse this def -- the RESULTS entry below asserts the
    # guard fires, and the SUnit compiled-count excludes it.
    if flag:
        x = 1
    return x


def maybe_unbound():
    try:
        maybe(False)
    except UnboundLocalError:
        return "unbound"
    return "bound"


# --- cut 32: from-imports, multi-alias imports, del name ---

def from_import(x):
    from math import sqrt
    return sqrt(x)


def from_import_alias(a, b):
    from os.path import join as pjoin, sep
    return pjoin(a, b) + sep


def multi_import(x):
    import math, os
    return math.floor(x) + len(os.sep)


def drop_name(x):
    y = x + 1
    del y
    return x


def drop_param(x):
    del x
    return "gone"


def drop_then_read(x):
    # Deliberately NOT IR-eligible: x is read after ``del x''.  The flow
    # analysis drops the name at the del, so the def stays on the text path
    # and its unbound guard raises UnboundLocalError as CPython does.
    del x
    return x


def drop_then_read_raises():
    try:
        drop_then_read(1)
    except UnboundLocalError:
        return "unbound"
    return "bound"


# --- cut 33: tuple / list unpacking targets ---

def swap(a, b):
    a, b = b, a
    return (a, b)


def head_tail(xs):
    head, *tail = xs
    return (head, tail)


def middle_star(xs):
    first, *mid, last = xs
    return (first, mid, last)


def nested_unpack(pair):
    (a, b), c = pair
    return a + b + c


def unpack_into(box, xs):
    box.left, box.right = xs
    return (box.left, box.right)


def unpack_items(d, xs):
    d["a"], d["b"] = xs
    return d


def pairs_sum(items):
    total = 0
    for k, v in items:
        total += k * v
    return total


def nested_for(items):
    out = []
    for a, (b, c) in items:
        out.append(a + b + c)
    return out


def unpack_count_error(xs):
    try:
        a, b = xs
    except ValueError:
        return "count"
    return a + b


# --- cut 34: the with statement ---

class Ctx:
    def __init__(self, log, suppress=False):
        self.log = log
        self.suppress = suppress

    def __enter__(self):
        self.log.append("enter")
        return self

    def __exit__(self, t, v, tb):
        self.log.append("exit:" + (t.__name__ if t is not None else "None"))
        return self.suppress


class Pair:
    def __enter__(self):
        return (1, 2)

    def __exit__(self, t, v, tb):
        return False


def with_plain(log):
    with Ctx(log):
        log.append("body")
    return log


def with_target(log):
    with Ctx(log) as c:
        return c.log is log


def with_return(log):
    with Ctx(log):
        return "early"


def with_return_log():
    log = []
    got = with_return(log)
    return (got, log)


def with_raise(log):
    try:
        with Ctx(log):
            raise ValueError("x")
    except ValueError:
        log.append("caught")
    return log


def with_suppress(log):
    with Ctx(log, True):
        raise KeyError("k")
    return "suppressed"


def with_two(log):
    with Ctx(log) as a, Ctx(log) as b:
        return a is not b


def with_break(log):
    for i in range(3):
        with Ctx(log):
            if i == 1:
                break
            log.append(i)
    return log


def with_tuple():
    with Pair() as (p, q):
        return p + q


# --- cut 35: late-bound module names ---

globals().update({"DYNAMIC_NAME": 5})


def read_dynamic():
    # DYNAMIC_NAME is bound at run time, so codegen cannot see it: the text
    # path emits its late module-name lookup, and so does the IR path now.
    return DYNAMIC_NAME + 1


# --- cut 36: class-body methods through the IR seam ---

class Counter:
    def __init__(self, start):
        self.value = start
        self.log = []

    def bump(self, n):
        self.value = self.value + n
        self.log.append(n)
        return self.value

    def twice(self, n):
        self.bump(n)
        return self.bump(n)

    def describe(self):
        return "Counter(" + str(self.value) + ")"

    def floor_plus(self):
        return FLOOR + self.value


def counter_run():
    c = Counter(1)
    c.twice(2)
    return (c.value, c.log, c.describe(), c.floor_plus())
# --- cut 40: parameter defaults (the varargs ``_f:kw:'' form) ---

DEFAULT_STEP = 10


def add_default(a, b=2):
    return a + b


def step_default(a, step=DEFAULT_STEP, tag=None):
    return (a + step, tag)


def shared_default(item, bucket=[]):
    bucket.append(item)
    return len(bucket)


def all_default(a=1, b=2):
    return a * 10 + b


def rebind_default(a, b=1):
    b = b + a
    return b


def default_from_call(x, y=count_chars(12)):
    return x + y


def call_defaults():
    return (add_default(1), add_default(1, 5), add_default(1, b=7),
            add_default(b=3, a=1), all_default(), all_default(b=9))


def default_errors():
    out = []
    try:
        add_default()
    except TypeError as e:
        out.append(str(e))
    try:
        add_default(1, 2, 3)
    except TypeError as e:
        out.append(str(e))
    try:
        add_default(1, c=2)
    except TypeError as e:
        out.append(str(e))
    try:
        add_default(1, 2, 3, 4)
    except TypeError as e:
        out.append(str(e))
    return out


# --- cut 41: *args and **kwargs ---

def star_args(a, *args):
    return (a, args)


def star_kwargs(a, **kwargs):
    return (a, sorted(kwargs.items()))


def star_both(*args, **kwargs):
    return (len(args), len(kwargs))


def star_defaults(a, b=1, *rest):
    return (a, b, rest)


def star_named_collision(*positional, **kwargs):
    return (positional, kwargs)


def star_calls():
    return (star_args(1), star_args(1, 2, 3), star_kwargs(1),
            star_kwargs(1, x=2, a2=3), star_both(), star_both(1, 2, k=3),
            star_defaults(1), star_defaults(1, 2, 3, 4),
            star_named_collision(1, k=2))


def star_errors():
    out = []
    try:
        star_args()
    except TypeError as e:
        out.append(str(e))
    try:
        star_args(1, k=2)
    except TypeError as e:
        out.append(str(e))
    try:
        star_kwargs(1, 2)
    except TypeError as e:
        out.append(str(e))
    try:
        star_kwargs()
    except TypeError as e:
        out.append(str(e))
    return out


# --- cut 42: keyword-only parameters ---

def kw_only(a, *, k, j=3):
    return (a, k, j)


def kw_only_default_global(a, *, step=DEFAULT_STEP):
    return a + step


def kw_only_star(*args, sep="-"):
    return sep.join(args)


def kw_only_kwargs(a, *, flag=False, **rest):
    return (a, flag, sorted(rest))


def kw_only_calls():
    return (kw_only(1, k=2), kw_only(1, k=2, j=4), kw_only(k=5, a=0),
            kw_only_default_global(1), kw_only_default_global(1, step=1),
            kw_only_star(), kw_only_star("a", "b"), kw_only_star("a", "b", sep="+"),
            kw_only_kwargs(1), kw_only_kwargs(1, flag=True, z=1, y=2))


def kw_only_errors():
    out = []
    try:
        kw_only(1)
    except TypeError as e:
        out.append(str(e))
    try:
        kw_only(1, 2, k=3)
    except TypeError as e:
        out.append(str(e))
    try:
        kw_only(1, 2)
    except TypeError as e:
        out.append(str(e))
    try:
        kw_only(1, k=2, z=3)
    except TypeError as e:
        out.append(str(e))
    return out


# --- cut 43: positional-only parameters in the varargs form ---

def pos_only(a, /, b=2):
    return a + b


def pos_only_kw(a, b, /, c=0, **rest):
    return (a, b, c, sorted(rest))


def pos_only_calls():
    return (pos_only(1), pos_only(1, 5), pos_only(1, b=7),
            pos_only_kw(1, 2), pos_only_kw(1, 2, a=9, c=3))


def pos_only_errors():
    out = []
    try:
        pos_only(a=1)
    except TypeError as e:
        out.append(str(e))
    try:
        pos_only(1, z=3, a=2)
    except TypeError as e:
        out.append(str(e))
    try:
        pos_only(1, z=3)
    except TypeError as e:
        out.append(str(e))
    try:
        pos_only()
    except TypeError as e:
        out.append(str(e))
    return out


# --- cut 44: methods on the varargs selector ---

class Gauge:
    LABEL = "gauge"

    def __init__(self, start=0, step=1):
        self.value = start
        self.step = step
        self.seen = []

    def advance(self, times=1, *, note=None):
        self.value = self.value + self.step * times
        if note is not None:
            self.seen.append(note)
        return self.value

    def bump(self, by=DEFAULT_STEP):
        self.value = self.value + by
        return self.value

    def collect(self, first, *rest, **extra):
        return (first, rest, sorted(extra))

    def scaled(self, factor, /, offset=0):
        return self.value * factor + offset

    def tag(self, item, bucket=[]):
        bucket.append(item)
        return len(bucket)


def gauge_run():
    g = Gauge()
    h = Gauge(step=5, start=1)
    g.advance()
    g.advance(2, note="x")
    return (g.value, g.seen, h.value, h.step, h.advance(times=3),
            h.scaled(2, offset=1), h.bump(), h.bump(by=2))


def gauge_collect():
    g = Gauge(1, 2)
    return (g.collect(1), g.collect(1, 2, 3, b=1, a=2),
            (g.tag("a"), g.tag("b")), Gauge().tag("c"))


def gauge_errors():
    g = Gauge()
    out = []
    try:
        g.advance(1, 2)
    except TypeError as e:
        out.append("too many")
    try:
        g.advance(bogus=1)
    except TypeError as e:
        out.append(str(e))
    try:
        g.scaled()
    except TypeError as e:
        out.append(str(e))
    try:
        g.scaled(factor=2)
    except TypeError as e:
        out.append(str(e))
    try:
        Gauge(1, 2, 3)
    except TypeError as e:
        out.append("too many")
    return out


# --- cut 45: classes whose backing instVars were unknown at emit time ---

class Boom(Exception):
    def describe(self, extra):
        # ``args'' is a named instVar of the Smalltalk Exception under Boom.
        args = ["boom", extra]
        return "-".join(args)

    def rethrown(self, messageText="again"):
        return Boom(messageText)


class Bag(dict):
    def put(self, key, value):
        count = len(self)
        self[key] = value
        return count + 1

    def total(self, start=0):
        total = start
        for value in self.values():
            total = total + value
        return total


def boom_run():
    try:
        raise Boom("first")
    except Boom as e:
        again = e.rethrown()
        return (e.describe("x"), str(e), str(again), again.rethrown("z").args)


def bag_run():
    b = Bag()
    return (b.put("a", 1), b.put("b", 2), b.total(), b.total(start=10), sorted(b))


# --- cut 47: annotations (the method body never sees them) ---

def typed_add(a: int, b: int = 2) -> int:
    return a + b


def typed_none(x: "str") -> None:
    return None


class Typed:
    def __init__(self, v: float) -> None:
        self.v = v

    def scale(self, k: float = 1.5) -> float:
        return self.v * k


def typed_run():
    t = Typed(2)
    return (typed_add(1), typed_add(1, b=5), typed_none("q"), t.scale(), t.scale(k=2))


def typed_annotations():
    return (typed_add.__annotations__ == {"a": int, "b": int, "return": int},
            typed_none.__annotations__ == {"x": "str", "return": None},
            Typed.scale.__annotations__ == {"k": float, "return": float})


# --- cut 48: decorators (applied over the compiled method) ---

import functools


def doubled(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs) * 2
    return wrapper


def labelled(label):
    def deco(fn):
        fn.label = label
        return fn
    return deco


@doubled
def deco_add(a, b=1):
    """Add, then the decorator doubles."""
    return a + b


@labelled("plain")
def deco_tagged(a):
    return a


class Deco:
    def __init__(self, base):
        self.base = base
        self._level = base

    @doubled
    def bump(self, n):
        return self.base + n

    @property
    def size(self):
        return self.base * 10

    # A getter and its setter share the Python name and compile to ``level''
    # and ``level:'' -- the seam must key its registrations by selector.
    @property
    def level(self):
        return self._level

    @level.setter
    def level(self, value):
        self._level = value * 2

    def use(self):
        return self.bump(1) + self.size


def deco_run():
    d = Deco(3)
    before = d.level
    d.level = 7
    return (deco_add(1, 2), deco_add(1), deco_tagged(5), deco_tagged.label,
            d.bump(1), d.size, d.use(), before, d.level)


def deco_meta():
    # ``__doc__'' is not asserted: Grail answers None for a module-level
    # def's docstring through functools.wraps on either path (text gap).
    return (deco_add.__name__, deco_add.__wrapped__(1, 2), deco_add.__wrapped__(2, 2),
            Deco.bump.__name__)


# --- cut 49: keyword / arity-mismatch self-sends (the varargs self-send) ---
# --- cut 50: module-function reads inside a method ---

def helper_scale(x, factor=3):
    return x * factor


class Sender:
    def __init__(self, base):
        self.base = base

    def combine(self, a, b=1, *, sep="-"):
        return str(self.base) + sep + str(a) + sep + str(b)

    def via_keyword(self):
        return self.combine(1, sep="+")

    def via_positional(self):
        # combine compiles as varargs, so even a plain positional self-send
        # takes the ``_combine:kw:'' selector.
        return self.combine(2, 3)

    def via_module(self):
        return helper_scale(self.base)

    def via_alias(self):
        f = helper_scale
        return f(2, factor=2)

    def via_decorated(self):
        # deco_add's module slot holds the decorator's wrapper: the read
        # probes the slot first and must see the doubling.
        return deco_add(1, 2)


def sender_run():
    s = Sender(5)
    return (s.via_keyword(), s.via_positional(), s.via_module(), s.via_alias(),
            s.via_decorated())


# --- cut 51: __slots__ classes (named instVars behind self.x) ---

class Slotted:
    __slots__ = ("a", "b")

    def __init__(self, a):
        self.a = a
        self.b = a * 2

    def total(self):
        return self.a + self.b

    def swap(self):
        self.a, self.b = self.b, self.a
        return (self.a, self.b)

    def missing(self):
        try:
            return self.c
        except AttributeError:
            return "no c"


def slotted_run():
    s = Slotted(3)
    first = s.total()
    swapped = s.swap()
    return (first, swapped, s.total(), s.missing())


# --- cut 52: annotated assignment ---

class AnnTyped:
    def __init__(self, v):
        self.v: int = v

    def grow(self, by):
        self.v: int = self.v + by
        return self.v


def typed_locals(n):
    total: int = 0
    items: list = []
    for i in range(n):
        total = total + i
        items.append(i)
    d: dict = {}
    d["n"]: int = n
    return (total, items, d)


def ann_run():
    t = AnnTyped(4)
    return (t.grow(3), t.v, typed_locals(4))


# --- cut 55: super() / super(C, self) / __class__ / type inside methods ---

class Base:
    def __init__(self, v):
        self.v = v

    def describe(self):
        return "Base(%d)" % self.v

    def tag(self):
        return "base"


class Child(Base):
    def __init__(self, v, w):
        super().__init__(v)
        self.w = w

    def describe(self):
        return super().describe() + "+Child(%d)" % self.w

    def tag(self):
        return super(Child, self).tag() + "/child"

    def kind(self):
        return (__class__.__name__, type(self).__name__, type(self) is Child,
                isinstance(Child, type), __class__ is Child)

    def klass_of(self, obj, cls):
        return super(cls, obj).tag(), type(obj) is cls


class Grand(Child):
    def tag(self):
        return super().tag() + "/grand"

    def kind(self):
        return super().kind()[0]


def super_run():
    c = Child(1, 2)
    g = Grand(4, 5)
    return (c.describe(), c.tag(), g.tag(), c.kind(), g.kind(), g.describe(),
            Grand.kind(g), g.klass_of(g, Grand), c.klass_of(c, Child))


# --- cut 56: call-site *args / **kwargs splats; starred tuple and list displays ---

def splat_target(*args, **kw):
    return args, sorted(kw.items())


def splat_calls():
    xs = [2, 3]
    opts = {"b": 2, "c": 3}
    return (
        splat_target(*xs),
        splat_target(1, *xs, 4),
        splat_target(*xs, **opts),
        splat_target(**opts),
        splat_target(a=1, **opts),
        splat_target(*xs, a=1, **opts),
        splat_target(*xs, *xs),
        max(*xs),
        list(range(*[1, 7, 3])),
    )


def splat_seq():
    xs = [2, 3]
    t = (1, *xs, 4)
    l = [*xs, *xs, 0]
    return t, l, (*xs,), [*xs], len([1, *xs])


class Splatter:
    def m(self, *a, **k):
        return list(a), sorted(k)

    def run(self, xs, kw):
        return self.m(*xs, **kw), self.m(1, *xs, z=3, **kw), self.m(**kw), self.m(*xs)

    def pack(self, *xs):
        return (*xs, len(xs))


def splatter_run():
    s = Splatter()
    return s.run([7, 8], {"y": 2}), s.pack(1, 2)
# --- cut 53: generator defs (module-level and class-body), same wrapper shape
# as the text: PythonGenerator withBlock: [:___gen___ | ...] name:qualname:code:.


def gen_count(n):
    i = 0
    while i < n:
        yield i
        i += 1


def gen_echo():
    received = []
    x = yield "ready"
    while x is not None:
        received.append(x)
        x = yield len(received)
    return received


def gen_inner():
    yield 1
    yield 2
    return "inner-done"


def gen_outer():
    r = yield from gen_inner()
    yield r
    yield from [10, 20]


def gen_early(n):
    yield "a"
    if n > 0:
        return
    yield "b"


def gen_cleanup(log):
    try:
        yield 1
        yield 2
    finally:
        log.append("closed")


def gen_catch():
    try:
        yield 1
    except ValueError as e:
        yield "caught:" + str(e)
    yield "after"


def gen_step(n, step=1):
    i = 0
    while i < n:
        yield i
        i += step


def gen_ret_finally(log):
    try:
        yield 1
        return "done"
    finally:
        log.append("fin")


def gen_run():
    total = 0
    for v in gen_count(4):
        total += v
    e = gen_echo()
    first = next(e)
    n1 = e.send("a")
    n2 = e.send("b")
    final = None
    try:
        e.send(None)
        final = "no-stop"
    except StopIteration as ex:
        final = ex.value
    outer = list(gen_outer())
    early = list(gen_early(1))
    full = list(gen_early(0))
    return (total, first, n1, n2, final, outer, early, full)


def gen_control(log):
    g = gen_cleanup(log)
    first = next(g)
    g.close()
    closed = list(log)
    c = gen_catch()
    next(c)
    thrown = c.throw(ValueError("bad"))
    after = next(c)
    ended = None
    try:
        next(c)
        ended = "no-stop"
    except StopIteration:
        ended = "stop"
    h = gen_cleanup([])
    raised = None
    try:
        h.throw(KeyError("k"))
        raised = "no-raise"
    except KeyError:
        raised = "keyerror"
    return (first, closed, thrown, after, ended, raised)


def gen_stop_value():
    g = gen_inner()
    next(g)
    next(g)
    try:
        next(g)
    except StopIteration as e:
        return e.value
    return "no-stop"


def gen_ret_finally_run():
    log = []
    g = gen_ret_finally(log)
    next(g)
    val = None
    try:
        next(g)
        val = "no-stop"
    except StopIteration as e:
        val = e.value
    return (val, log)


class Walker:
    def __init__(self, items):
        self.items = items

    def walk(self):
        for it in self.items:
            yield it

    def pairs(self, other):
        i = 0
        while i < len(self.items):
            yield (self.items[i], other[i])
            i += 1

    def until(self, stop):
        for it in self.items:
            if it == stop:
                return
            yield it

    def take(self, n=2):
        i = 0
        for it in self.items:
            if i >= n:
                return
            yield it
            i += 1


def walker_run():
    w = Walker([1, 2, 3])
    got = []
    for v in w.walk():
        got.append(v)
    pairs = list(w.pairs(["a", "b", "c"]))
    stopped = list(w.until(3))
    g = w.walk()
    return (got, pairs, stopped, type(g).__name__, g.__qualname__, g.__name__,
            list(w.take()), list(w.take(n=1)))


# --- cut 54: async defs (coroutines and async generators, module-level and
# class-body), driven by a hand-rolled send() loop over a suspending awaitable.


class Suspend:
    def __init__(self, v):
        self.v = v

    def __await__(self):
        yield "s"
        return self.v


class ACounter:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.i >= self.n:
            raise StopAsyncIteration
        self.i = self.i + 1
        return await Suspend(self.i)


class ACtx:
    def __init__(self, log):
        self.log = log

    async def __aenter__(self):
        self.log.append("aenter")
        return await Suspend(7)

    async def __aexit__(self, et, ev, tb):
        self.log.append("aexit:" + ("None" if et is None else et.__name__))
        return False


async def co_add(a, b):
    x = await Suspend(a)
    y = await Suspend(b)
    return x + y


async def co_plain(v):
    return v * 2


async def co_loop(n):
    total = 0
    async for v in ACounter(n):
        total += v
    return total


async def co_with(log):
    async with ACtx(log) as v:
        log.append(v)
    return log


async def co_with_raise(log):
    try:
        async with ACtx(log):
            raise ValueError("x")
    except ValueError:
        log.append("caught")
    return log


async def co_await_co(a):
    inner = await co_add(a, 1)
    return inner + await co_plain(a)


async def agen(n):
    i = 0
    while i < n:
        yield await Suspend(i)
        i += 1


async def co_agen():
    out = []
    async for v in agen(3):
        out.append(v)
    return out


async def co_ret_finally(log):
    try:
        await Suspend(0)
        return "done"
    finally:
        log.append("fin")


def drive(c):
    steps = 0
    try:
        while True:
            c.send(None)
            steps += 1
    except StopIteration as e:
        return (e.value, steps)


def async_run():
    c = co_add(1, 2)
    kind = type(c).__name__
    fin = []
    return (drive(co_add(2, 3)), drive(co_plain(4)), drive(co_loop(3)), drive(co_with([])),
            drive(co_with_raise([])), drive(co_await_co(5)), drive(co_agen()),
            drive(co_ret_finally(fin)), fin, kind, c.__qualname__, drive(c))


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
    "first_even_miss": first_even_bound([1, 3]) == -1,
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
    "clamp_low": clamp(-5, 0, 10) == 0,
    "clamp_high": clamp(50, 0, 10) == 10,
    "clamp_mid": clamp(5, 0, 10) == 5,
    "accumulate": accumulate(1, [2, 3]) == 6,
    "normalize": normalize("  MiXed ") == "mixed",
    "load_sqrt": load_sqrt(16) == 4.0,
    "alias_join": alias_join("a", "b") == "a/b",
    "dotted_top": dotted_top() == "/",
    "first_even_hit": first_even_bound([1, 3, 4, 5]) == 4,
    "first_even_miss": first_even_bound([1, 3]) is None,
    "label_neg": label(-1) == "neg",
    "label_pos": label(1) == "nonneg",
    "sum_squares": sum_squares([1, 2, 3]) == 14,
    "try_get_hit": try_get({"a": 4}, "a") == 8,
    "try_get_miss": try_get({}, "a") == "missing",
    "try_get_else_hit": try_get_else({"a": 4}, "a") == 8,
    "try_get_else_miss": try_get_else({}, "a") == "missing",
    "countdown": countdown(5) == 0,
    "maybe_bound": maybe(True) == 1,
    "maybe_unbound": maybe_unbound() == "unbound",
    "from_import": from_import(9) == 3.0,
    "from_import_alias": from_import_alias("a", "b") == "a/b/",
    "multi_import": multi_import(2.5) == 3,
    "drop_name": drop_name(1) == 1,
    "drop_param": drop_param(1) == "gone",
    "drop_then_read": drop_then_read_raises() == "unbound",
    "swap": swap(1, 2) == (2, 1),
    "head_tail": head_tail([1, 2, 3]) == (1, [2, 3]),
    "middle_star": middle_star([1, 2, 3, 4]) == (1, [2, 3], 4),
    "nested_unpack": nested_unpack(((1, 2), 3)) == 6,
    "unpack_into": unpack_into(Box(), (4, 5)) == (4, 5),
    "unpack_items": unpack_items({}, (1, 2)) == {"a": 1, "b": 2},
    "pairs_sum": pairs_sum([(1, 2), (3, 4)]) == 14,
    "nested_for": nested_for([(1, (2, 3)), (4, (5, 6))]) == [6, 15],
    "unpack_count_ok": unpack_count_error((1, 2)) == 3,
    "unpack_count_err": unpack_count_error((1, 2, 3)) == "count",
    "with_plain": with_plain([]) == ["enter", "body", "exit:None"],
    "with_target": with_target([]) is True,
    "with_return": with_return_log() == ("early", ["enter", "exit:None"]),
    "with_raise": with_raise([]) == ["enter", "exit:ValueError", "caught"],
    "with_suppress": with_suppress([]) == "suppressed",
    "with_two": with_two([]) is True,
    "with_break": with_break([]) == ["enter", 0, "exit:None", "enter", "exit:None"],
    "with_tuple": with_tuple() == 3,
    "read_dynamic": read_dynamic() == 6,
    "counter_run": counter_run() == (5, [2, 2], "Counter(5)", 15),
    "add_default": add_default(1) == 3,
    "step_default": step_default(1) == (11, None),
    "step_default_kw": step_default(1, tag="t", step=2) == (3, "t"),
    "shared_default": (shared_default("a"), shared_default("b")) == (1, 2),
    "all_default": all_default() == 12,
    "rebind_default": rebind_default(2) == 3,
    "default_from_call": default_from_call(1) == 3,
    "call_defaults": call_defaults() == (3, 6, 8, 4, 12, 19),
    "default_errors": default_errors() == [
        "add_default() missing 1 required positional argument: 'a'",
        "add_default() takes from 1 to 2 positional arguments but 3 were given",
        "add_default() got an unexpected keyword argument 'c'",
        "add_default() takes from 1 to 2 positional arguments but 4 were given",
    ],
    "star_calls": star_calls() == (
        (1, ()), (1, (2, 3)), (1, []), (1, [("a2", 3), ("x", 2)]), (0, 0), (2, 1),
        (1, 1, ()), (1, 2, (3, 4)), ((1,), {"k": 2})),
    "star_errors": star_errors() == [
        "star_args() missing 1 required positional argument: 'a'",
        "star_args() got an unexpected keyword argument 'k'",
        "star_kwargs() takes 1 positional argument but 2 were given",
        "star_kwargs() missing 1 required positional argument: 'a'",
    ],
    "kw_only_calls": kw_only_calls() == (
        (1, 2, 3), (1, 2, 4), (0, 5, 3), 11, 2, "", "a-b", "a+b",
        (1, False, []), (1, True, ["y", "z"])),
    "kw_only_errors": kw_only_errors() == [
        "kw_only() missing 1 required keyword-only argument: 'k'",
        "kw_only() takes 1 positional argument but 2 positional arguments (and 1 keyword-only argument) were given",
        "kw_only() takes 1 positional argument but 2 were given",
        "kw_only() got an unexpected keyword argument 'z'",
    ],
    "pos_only_calls": pos_only_calls() == (3, 6, 8, (1, 2, 0, []), (1, 2, 3, ["a"])),
    "pos_only_errors": pos_only_errors() == [
        "pos_only() got some positional-only arguments passed as keyword arguments: 'a'",
        "pos_only() got some positional-only arguments passed as keyword arguments: 'a'",
        "pos_only() got an unexpected keyword argument 'z'",
        "pos_only() missing 1 required positional argument: 'a'",
    ],
    "gauge_run": gauge_run() == (3, ["x"], 1, 5, 16, 33, 26, 28),
    "gauge_collect": gauge_collect() == (
        (1, (), []), (1, (2, 3), ["a", "b"]), (1, 2), 3),
    "gauge_errors": gauge_errors() == [
        "too many",
        "Gauge.advance() got an unexpected keyword argument 'bogus'",
        "Gauge.scaled() missing 1 required positional argument: 'factor'",
        "Gauge.scaled() got some positional-only arguments passed as keyword arguments: 'factor'",
        "too many",
    ],
    "boom_run": boom_run() == ("boom-x", "first", "again", ("z",)),
    "bag_run": bag_run() == (1, 2, 3, 13, ["a", "b"]),
    "typed_run": typed_run() == (3, 6, None, 3.0, 4),
    "typed_annotations": typed_annotations() == (True, True, True),
    "deco_run": deco_run() == (6, 4, 5, "plain", 8, 30, 38, 3, 14),
    "deco_meta": deco_meta() == ("deco_add", 3, 4, "bump"),
    "sender_run": sender_run() == ("5+1+1", "5-2-3", 15, 4, 6),
    "slotted_run": slotted_run() == (9, (6, 3), 9, "no c"),
    "ann_run": ann_run() == (7, 7, (6, [0, 1, 2, 3], {"n": 4})),
    "super_run": super_run() == (
        "Base(1)+Child(2)", "base/child", "base/child/grand",
        ("Child", "Child", True, True, True), "Child", "Base(4)+Child(5)",
        "Child", ("base/child", True), ("base", True)),
    "splat_calls": splat_calls() == (
        ((2, 3), []), ((1, 2, 3, 4), []), ((2, 3), [("b", 2), ("c", 3)]),
        ((), [("b", 2), ("c", 3)]), ((), [("a", 1), ("b", 2), ("c", 3)]),
        ((2, 3), [("a", 1), ("b", 2), ("c", 3)]), ((2, 3, 2, 3), []), 3, [1, 4]),
    "splat_seq": splat_seq() == ((1, 2, 3, 4), [2, 3, 2, 3, 0], (2, 3), [2, 3], 3),
    "splatter_run": splatter_run() == (
        (([7, 8], ["y"]), ([1, 7, 8], ["y", "z"]), ([], ["y"]), ([7, 8], [])), (1, 2, 2)),
    "gen_run": gen_run() == (
        6, "ready", 1, 2, ["a", "b"], [1, 2, "inner-done", 10, 20], ["a"], ["a", "b"]),
    "gen_control": gen_control([]) == (1, ["closed"], "caught:bad", "after", "stop", "keyerror"),
    "gen_stop_value": gen_stop_value() == "inner-done",
    "gen_step": (list(gen_step(3)), list(gen_step(4, step=2))) == ([0, 1, 2], [0, 2]),
    "gen_ret_finally": gen_ret_finally_run() == ("done", ["fin"]),
    "walker_run": walker_run() == (
        [1, 2, 3], [(1, "a"), (2, "b"), (3, "c")], [1, 2], "generator", "Walker.walk", "walk",
        [1, 2], [1]),
    "async_run": async_run() == (
        (5, 2), (8, 0), (6, 3), (["aenter", 7, "aexit:None"], 1),
        (["aenter", "aexit:ValueError", "caught"], 1), (16, 2), ([0, 1, 2], 3),
        ("done", 1), ["fin"], "coroutine", "co_add", (3, 2)),
}

ALL_OK = all(RESULTS.values())

print("ir_codegen_smoke RESULTS:", RESULTS)
print("ir_codegen_smoke ALL_OK:", ALL_OK)
