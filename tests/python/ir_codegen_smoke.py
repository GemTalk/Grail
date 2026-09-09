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
    # text-calls-IR traceback check below.  A frame-sensitive ``dir()'' call is
    # the opt-out (cut 30 made a function-level import eligible on its own,
    # cut 69 a ``global'' declaration; ``eval'' would pre-create a module slot
    # per module variable and trip GemStone's 255-dynamic-instVar limit on a
    # module this large).
    _ = dir()
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
    # x is bound on one branch only, so the read can raise UnboundLocalError.
    # Refused by the flow analysis until cut 72; since then the IR builds it
    # with the text's unbound guard on the read, and the RESULTS entry below
    # asserts that guard fires on both paths.
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
    # x is read after ``del x''.  The flow analysis drops the name at the del;
    # since cut 72 the IR builds the def with the unbound guard on the read (a
    # deleted parameter is guarded like a body local), raising
    # UnboundLocalError as CPython does.
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


# --- cut 60: the receiver parameter need not be named self ---

class Rect:
    def __init__(this, w, h):
        this.w = w
        this.h = h

    def area(me):
        return me.w * me.h

    def scale(rect, k):
        rect.w = rect.w * k
        rect.h = rect.h * k
        return rect.area()

    def describe(self_, tag="r"):
        return "%s:%dx%d" % (tag, self_.w, self_.h)

    def same(s, other):
        return s.w == other.w and s.h == other.h


def rect_run():
    r = Rect(2, 3)
    a = r.area()
    b = r.scale(2)
    return a, b, r.describe(), r.describe(tag="big"), r.same(Rect(4, 6)), r.same(Rect(1, 1))


# --- cut 61: @classmethod bodies built onto the metaclass ---

class Maker:
    n = 3

    def __init__(self, v):
        self.v = v

    @classmethod
    def make(cls, v):
        return cls(v * 2)

    @classmethod
    def count(cls):
        return cls.n + 1

    @classmethod
    def tagged(cls, tag="t"):
        return tag + ":" + cls.__name__

    def via(self):
        return self.tagged("i").upper()


class SubMaker(Maker):
    n = 10


def maker_run():
    m = Maker.make(4)
    s = SubMaker.make(1)
    return (m.v, type(m).__name__, s.v, type(s).__name__, Maker.count(), SubMaker.count(),
            Maker.tagged(), SubMaker.tagged(tag="x"), m.tagged(), s.via())


# --- cut 62: augmented assignment to attribute and subscript targets ---

class Tally:
    def __init__(self):
        self.n = 0
        self.items = []

    def bump(self, k):
        self.n += k
        self.items += [k]
        return self.n, list(self.items)

    def poke(self, other, d, lst):
        other.n -= 1
        d["k"] += 10
        lst[1] *= 3
        return other.n, d["k"], lst


class SlotAcc:
    __slots__ = ("total",)

    def __init__(self):
        self.total = 5

    def add(self, v):
        self.total += v
        return self.total


def aug_targets():
    c = Tally()
    o = Tally()
    a = c.bump(2)
    b = c.bump(3)
    o.n = 7
    p = c.poke(o, {"k": 1}, [1, 2, 3])
    s = SlotAcc()
    s.add(4)
    return a, b, p, s.add(1)


# --- cut 63: chained assignment ---

class Linked:
    def __init__(self):
        self.x = self.y = 0

    def set_all(self, v, d, lst):
        self.x = d["k"] = lst[0] = v
        a = b = self.y = v + 1
        (p, q) = r = (a, b)
        return self.x, self.y, d["k"], lst, a, b, p, q, r


class SlotChain:
    __slots__ = ("m", "n")

    def __init__(self, v):
        self.m = self.n = v

    def both(self):
        return self.m + self.n


def chain_run():
    l = Linked()
    d = {"k": 0}
    lst = [9, 9]
    res = l.set_all(5, d, lst)
    other = Linked()
    l.x = other.y = 42
    return res, (l.x, other.y), SlotChain(3).both()
# --- cut 57: list comprehensions -- the text's accumulator block over
# ComprehensionAst's clause blocks (hoisted outer iterable, per-clause block
# temps for the iterator and targets, chained if-filters, tuple targets, the
# traceback-frame wrapper), module-level and inside class-body methods.


def lc_squares(xs):
    return [x * x for x in xs]


def lc_filtered(n):
    return [i for i in range(n) if i % 2 == 0 if i > 0]


def lc_nested_for(xs, ys):
    return [(a, b) for a in xs for b in ys if a != b]


def lc_inner_reads_outer(xs):
    return [b for a in xs for b in range(a)]


def lc_unpack(items):
    return [k + v for k, v in items]


def lc_nested_unpack(items):
    return [a + b + c for (a, b), c in items]


def lc_shadow_local(xs):
    x = 100
    ys = [x + 1 for x in xs]
    return (x, ys)


def lc_shadow_param(x):
    return [x * 2 for x in x]


def lc_shadow_builtin(xs):
    return [dir + 1 for dir in xs]


def lc_wildcard(n):
    return [0 for _ in range(n)]


def lc_nested_comp(xs, ys):
    return [[x * y for y in ys] for x in xs]


def lc_inner_iter_from_outer(rows):
    return [[cell for cell in row] for row in rows]


def lc_in_call(xs):
    return len([x for x in xs if x]) + sum([x for x in xs])


def lc_after_target_read(xs):
    total = 0
    x = -1
    for x in xs:
        total += x
    doubled = [x * 2 for x in xs]
    return (x, total, doubled)


def lc_bad_iter():
    try:
        return [x for x in None]
    except TypeError as e:
        return str(e)


def lc_bad_body(xs):
    try:
        return [x + "a" for x in xs]
    except TypeError:
        return "body-error"


class Comp:
    def __init__(self, items):
        self.items = items
        self.factor = 3

    def scale(self, x):
        return x * self.factor

    def scaled(self):
        return [self.scale(x) for x in self.items]

    def pairs(self, other):
        return [(a, b) for a in self.items for b in other.items if a < b]

    def keyed(self):
        return [k for k, v in enumerate(self.items) if v]


def comp_run():
    c = Comp([1, 0, 2])
    d = Comp([2, 3])
    return (c.scaled(), c.pairs(d), c.keyed())


# --- cut 58: set and dict comprehensions -- the same accumulator block over
# ``set new'' / ``PyDict new'' with ``add:'' / ``at:put:'' as the innermost
# statement.


def sc_mods(xs):
    return {x % 3 for x in xs}


def sc_pairs(xs):
    return {(a, b) for a in xs for b in xs if a < b}


def sc_unpack(items):
    return {k for k, v in items if v}


def dc_index(xs):
    return {x: i for i, x in enumerate(xs)}


def dc_filtered(d):
    return {k: v * 2 for k, v in d.items() if v}


def dc_nested(xs):
    return {x: [y for y in range(x)] for x in xs}


def dc_shadow(k):
    d = {k: 0}
    e = {k: k + 1 for k in range(2)}
    return (d, e, k)


class CompBag:
    def __init__(self, items):
        self.items = items

    def uniq(self):
        return {x for x in self.items if x}

    def index(self):
        return {x: i for i, x in enumerate(self.items)}

    def counts(self):
        return {x: self.count_of(x) for x in self.items}

    def count_of(self, x):
        return len([y for y in self.items if y == x])


def compbag_run():
    b = CompBag([2, 0, 2, 1])
    return (sorted(b.uniq()), b.index(), b.counts())


# --- cut 59: generator expressions -- the text's lazy shape: a PythonGenerator
# over the clause blocks, the outermost iterable __iter__'d at construction
# through the ___gxsrcN___ wrapper-block parameter, each element yielded to the
# expression's own ___gen___.


def ge_doubled(xs):
    return (x * 2 for x in xs)


def ge_sum(xs):
    return sum(x for x in xs if x)


def ge_any_short(log, xs):
    def_seen = any(log.append(x) or x > 1 for x in xs)
    return (def_seen, log)


def ge_lazy_consume(xs):
    g = (x * x for x in xs)
    first = next(g)
    rest = list(g)
    return (first, rest)


def ge_construction_iter():
    try:
        (x for x in None)
        return "no error"
    except TypeError as e:
        return str(e)


def ge_meta(xs):
    g = (x for x in xs)
    return (type(g).__name__, g.__name__, g.__qualname__)


def ge_nested(xs):
    return list(list(y for y in range(x)) for x in xs)


def ge_unpack(items):
    return list(k * v for k, v in items)


def ge_in_generator(xs):
    yield sum(x for x in xs)
    yield list(x + 1 for x in xs)


def ge_shadow(x):
    g = (x for x in range(x))
    return (list(g), x)


class GenExpr:
    def __init__(self, items):
        self.items = items

    def lazy(self):
        return (x for x in self.items)

    def total(self):
        return sum(self.weight(x) for x in self.items)

    def weight(self, x):
        return x * 10


def genexpr_run():
    g = GenExpr([1, 2, 3])
    lz = g.lazy()
    return (next(lz), list(lz), g.total(), lz.__qualname__)


# --- cut 67: @staticmethod bodies built onto the metaclass, module form ---

STATIC_SCALE = 10


class Util:
    base = 5

    @staticmethod
    def add(a, b):
        return a + b

    @staticmethod
    def scaled(x, k=STATIC_SCALE):
        return x * k

    @staticmethod
    def pack(*args, **kw):
        return list(args), sorted(kw)

    def via(self, v):
        return self.add(v, Util.base) + Util.scaled(1)


def util_run():
    u = Util()
    return (Util.add(1, 2), u.add(3, 4), Util.scaled(2), Util.scaled(2, k=3),
            Util.pack(1, 2, z=1), u.via(1), Util.add(*[5, 6]))


# --- cut 68: long tail -- Ellipsis, builtins as values, raise Cls(kw=...), loop else ---

class Tagged(Exception):
    def __init__(self, msg, code=0):
        super().__init__(msg)
        self.code = code


def tail_ellipsis(x=...):
    return x is Ellipsis, ... is Ellipsis, type(...).__name__


def tail_builtin_values(xs):
    f = len
    g = sorted
    return f(xs), list(map(len, ["a", "bb"])), g(xs, reverse=True), f is len


def tail_raise_kw(kind):
    try:
        if kind == "kw":
            raise Tagged("bad", code=7)
        if kind == "splat":
            raise Tagged(*["worse", 9])
        raise KeyError("k")
    except Tagged as e:
        return "tagged", str(e), e.code
    except KeyError as e:
        return "key", str(e)


def tail_loop_else(xs, stop):
    seen = []
    for x in xs:
        if x == stop:
            break
        seen.append(x)
    else:
        seen.append("for-else")
    n = 0
    while n < 3:
        n += 1
        if n == stop:
            break
    else:
        seen.append("while-else")
    return seen


class TailUser:
    def scan(self, xs):
        for x in xs:
            if x < 0:
                return "neg"
        else:
            return "all-nonneg"


def tail_run():
    u = TailUser()
    return (tail_ellipsis(), tail_ellipsis(1), tail_builtin_values([3, 1, 2]),
            tail_raise_kw("kw"), tail_raise_kw("splat"), tail_raise_kw("other"),
            tail_loop_else([1, 2, 3], 9), tail_loop_else([1, 2, 3], 2),
            u.scan([1, 2]), u.scan([1, -2]))


# --- cut 69: global declarations and the walrus ---

TALLY = 0
_LOG = []


def bump_global(k):
    global TALLY
    TALLY = TALLY + k
    return TALLY


def read_global():
    return TALLY + len(_LOG)


class GlobalUser:
    def poke(self, k):
        global TALLY
        TALLY = TALLY * k
        return TALLY


def walrus_if(xs):
    if (n := len(xs)) > 2:
        return "long", n
    return "short", n


def walrus_while(xs):
    it = iter(xs)
    out = []
    while (v := next(it, None)) is not None:
        out.append(v * 2)
    return out, v


def walrus_compare(a, b):
    if not (d := a - b):
        return "same", d
    return "diff", d


def global_walrus_run():
    r1 = bump_global(2)
    r2 = bump_global(3)
    r3 = GlobalUser().poke(2)
    r4 = read_global()
    return (r1, r2, r3, r4, walrus_if([1, 2, 3]), walrus_if([1]),
            walrus_while([1, 2]), walrus_compare(3, 3), walrus_compare(4, 3))


# --- cut 70: parameters and locals spelled like Smalltalk pseudo-variables ---

def pv_add(self, true, nil=2):
    thisContext = self + true
    return thisContext + nil


def pv_run():
    # Not exercised: ``*super`` / ``**false`` star parameters and a METHOD
    # parameter spelled like a pseudo-variable (``def combine(me, nil)``) --
    # both compile through IR but the TEXT path cannot compile them (recorded
    # in MIGRATION, cut 70), and this fixture must pass with the flag off too.
    # Nor ``pv_add(1, 2, nil=5)``: the text path answers 5 (the default) for a
    # KEYWORD spelled like a pseudo-variable, CPython and the IR answer 8.
    return pv_add(1, 2), pv_add(1, 2, 5)


# --- cut 71: flow -- what a ``while True`` loop leaves bound ---

def scan_tokens(items):
    while True:
        if not items:
            return "empty"
        op, av = items[0]
        if op != "sub":
            break
        items = av
    for extra in av:
        if extra == "stop":
            break
    return op, av


def first_even_loop(xs):
    i = 0
    while 1:
        v = xs[i]
        if v % 2 == 0:
            break
        i += 1
    return v, i


def flow_run():
    return (scan_tokens([("lit", [1, 2])]), scan_tokens([("sub", [("lit", ["stop", 3])])]),
            scan_tokens([]), first_even_loop([1, 3, 4, 5]))


# --- cut 72: reads the flow analysis cannot prove bound carry the unbound guard ---

class Gate:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def guarded_with(flag):
    with Gate():
        if flag:
            log = []
        else:
            log = None
    return log


def guarded_unbound(flag):
    if flag:
        v = 1
    try:
        return v
    except UnboundLocalError as e:
        return "unbound: " + str(e)


def guarded_del(x):
    del x
    try:
        return x
    except UnboundLocalError:
        return "deleted"


def guard_run():
    return guarded_with(True), guarded_with(False), guarded_unbound(True), guarded_unbound(False), guarded_del(5)

# --- cut 64: nested defs -- the text's closure block, built inside the enclosing IR method ---

def nd_plain(x):
    def inner(a):
        return a + 1
    return inner(x)


def nd_capture(x, y):
    def inner(a):
        return a + x + y
    return inner(1)


def nd_defaults(x):
    def inner(a, b=10, /, c=100):
        return a + b + c + x
    return (inner(1), inner(1, 2), inner(1, 2, 3), inner(1, c=5))


def nd_star(x):
    def inner(*args, **kw):
        return (len(args), sorted(kw), x)
    return inner(1, 2, k=3)


def nd_returned(n):
    def add(v):
        return v + n
    return add


def nd_deep(x):
    def mid(y):
        def inner(z):
            return x + y + z
        return inner
    return mid(2)(3)


def nd_recursive(n):
    def fact(k):
        if k <= 1:
            return 1
        return k * fact(k - 1)
    return fact(n)


def nd_loop_default(xs):
    fns = []
    for v in xs:
        def f(m=v):
            return m * 2
        fns.append(f)
    return [fn() for fn in fns]


def nd_docd(x):
    def inner(a):
        """Doc here."""
        return a + x
    return (inner(1), inner.__doc__)


def nd_meta():
    def inner(a, b=2, /, c=3, *rest, **kw):
        return a
    code = inner.__code__
    return (inner.__name__, inner.__qualname__, inner.__module__ == __name__, code.co_name, code.co_argcount,
            code.co_posonlyargcount, code.co_kwonlyargcount, code.co_freevars, inner.__closure__ is None)


def nd_closure(x):
    def inner():
        return x
    c = inner.__closure__
    return (len(c), c[0].cell_contents, inner.__code__.co_freevars)


def nd_cell_setter(x):
    x = x + 1
    def inner():
        return x
    inner.__closure__[0].cell_contents = 50
    return (x, inner())


def nd_errors(x):
    def inner(a, b=1):
        return a + b + x
    out = []
    for args, kw in (((), {}), ((1, 2, 3), {}), ((1,), {"z": 2})):
        try:
            inner(*args, **kw)
        except TypeError as e:
            out.append(str(e))
    return out


def nd_posonly_error(x):
    def inner(a, /, b):
        return a + b + x
    try:
        inner(a=1, b=2)
    except TypeError as e:
        return str(e)


def nd_distinct():
    def inner():
        pass
    return inner


def nd_stamp(tag):
    def inner(v):
        pass
    seen = getattr(inner, "stamp", "ABSENT")
    inner.stamp = tag
    return seen


def nd_generator(x):
    def g(n):
        for i in range(n):
            yield i + x
    it = g(3)
    return (type(it).__name__, it.__qualname__, list(it))


def nd_deco(x):
    log = []
    def d1(f):
        log.append("d1")
        return f
    def d2(f):
        log.append("d2")
        return f
    @d1
    def one():
        return x
    @d1
    @d2
    def two():
        return x + 1
    return (one(), two(), log)


def nd_module_deco_helper(f):
    return f


def nd_module_deco(x):
    @nd_module_deco_helper
    def inner():
        return x
    return inner()


def nd_shadow(x):
    def inner(x):
        return x * 10
    return (inner(2), x)


def nd_shadow_local(x):
    def inner():
        x = 5
        return x
    return (inner(), x)


def nd_early_return(x):
    def inner(a):
        if a > x:
            return "big"
        return "small"
    return (inner(0), inner(10))


def nd_try_in_inner(log):
    def inner(a):
        try:
            return 10 // a
        except ZeroDivisionError:
            return "zero"
        finally:
            log.append("fin")
    return (inner(2), inner(0), log)


def nd_in_branch(flag):
    if flag:
        def pick():
            return "yes"
    else:
        def pick():
            return "no"
    return pick()


def nd_interleaved_loops(xs):
    def inner(ys):
        acc = 0
        for y in ys:
            acc += y
        return acc
    out = []
    for x in xs:
        out.append(inner([x, x]))
    return out


def nd_gen_interleaved(n):
    def g(k):
        for i in range(k):
            yield i
    out = []
    for v in g(n):
        for w in g(2):
            out.append((v, w))
    return out


def nd_unpack_interleaved(pairs):
    def swap(p):
        a, b = p
        return (b, a)
    out = []
    for a, b in pairs:
        out.append((swap((a, b)), a, b))
    return out


def nd_async_gen_loop(n):
    async def main():
        async def ticker(k):
            for i in range(k):
                await Suspend(0)
                yield i
        out = []
        async for v in ticker(n):
            out.append(v)
        return out
    return drive(main())



class Nester:
    def __init__(self, v):
        self.v = v

    def m(self, x):
        def inner(a):
            return a + x + self.v
        return inner(1)

    def closure_over_self(self):
        def inner():
            return self.v * 2
        return (inner(), inner.__code__.co_freevars, inner.__qualname__)

    def deco_method(self):
        def wrap(f):
            def wrapped(a):
                return f(a) + self.v
            return wrapped
        @wrap
        def inner(a):
            return a
        return inner(5)

    def gen_method(self):
        def g():
            yield self.v
            yield self.v + 1
        return list(g())

    def nested_super(self):
        def inner():
            return super().__init__
        try:
            inner()
        except RuntimeError as e:
            return str(e)


def nester_run():
    n = Nester(2)
    return (n.m(1), n.closure_over_self(), n.deco_method(), n.gen_method(), n.nested_super())



# --- cut 65: lambdas -- the same closure block with an expression body ---

def lam_plain(x):
    f = lambda a: a + x
    return f(1)


def lam_call_arg(xs):
    return sorted(xs, key=lambda v: -v)


def lam_defaults(x):
    f = lambda a, b=2, *rest, **kw: (a + b + x, len(rest), sorted(kw))
    return (f(1), f(1, 3, 4, k=5), f(b=7, a=1))


def lam_kwonly(x):
    f = lambda a, *, k, j=10: a + k + j + x
    return (f(1, k=2), f(1, k=2, j=3))


def lam_posonly(x):
    f = lambda a, /, b: a * b + x
    return (f(2, 3), f(2, b=3))


def lam_meta(x):
    f = lambda a: a
    g = lambda: 0
    return (f.__name__, f.__qualname__, f.__module__ == __name__, f.__code__.co_name,
            f.__code__.co_argcount, g.__code__.co_argcount, g())


def lam_loop_capture(xs):
    fns = [lambda m=v: m * 10 for v in xs]
    late = [lambda: v for v in xs]
    return ([fn() for fn in fns], [fn() for fn in late])


def lam_nested(x):
    outer = lambda a: (lambda b: a + b + x)
    return outer(1)(2)


def lam_as_default(x):
    def inner(a, key=lambda v: v * 2):
        return key(a) + x
    return (inner(3), inner(3, key=lambda v: v + 100))


def lam_errors(x):
    f = lambda a, b=1: a + b + x
    out = []
    for args, kw in (((), {}), ((), {"b": 2})):
        try:
            f(*args, **kw)
        except TypeError as e:
            out.append(str(e).split(") ", 1)[1])
    g = lambda *, k: k
    try:
        g()
    except TypeError as e:
        out.append(str(e).split(") ", 1)[1])
    return out


def lam_conditional(x):
    pick = lambda a: "big" if a > x else "small"
    return (pick(0), pick(10))


def lam_immediate(x):
    return (lambda a, b: a * b)(x, 3)


class Lammer:
    def __init__(self, v):
        self.v = v

    def scaled(self, xs):
        return [(lambda a: a * self.v)(x) for x in xs]

    def keyed(self, pairs):
        return sorted(pairs, key=lambda p: (p[1], -p[0]))

    def meta(self):
        f = lambda: self.v
        return (f(), f.__qualname__, f.__code__.co_argcount)


def lammer_run():
    l = Lammer(3)
    return (l.scaled([1, 2]), l.keyed([(1, "b"), (2, "a"), (3, "a")]), l.meta())



# --- cut 66: nonlocal (the closure writes the enclosing temp) and annotated nested defs ---

def nl_counter():
    n = 0
    def bump():
        nonlocal n
        n += 1
        return n
    bump()
    bump()
    return (n, bump())


def nl_two_levels():
    total = 0
    def mid():
        def leaf(k):
            nonlocal total
            total += k
        leaf(1)
        leaf(2)
        return total
    return (mid(), total)


def nl_mid_owner():
    def mid():
        acc = 10
        def leaf():
            nonlocal acc
            acc *= 2
        leaf()
        leaf()
        return acc
    return mid()


def nl_cell_view(x):
    y = x
    def bump():
        nonlocal y
        y += 1
    c = bump.__closure__[0].cell_contents
    bump()
    return (c, y, bump.__closure__[0].cell_contents)


def nl_annotated(x):
    def inner(a: int, b: "str" = "z") -> str:
        return str(a + x) + b
    ann = inner.__annotations__
    return (inner(1), sorted(ann), ann["a"] is int, ann["return"] is str, ann["b"])


def nl_annotated_docd(x):
    def inner(a: int) -> int:
        """Adds x."""
        return a + x
    return (inner(2), inner.__doc__, sorted(inner.__annotations__))


class Nonlocaler:
    def __init__(self, v):
        self.v = v

    def tally(self, xs):
        n = 0
        def add(k):
            nonlocal n
            n += k * self.v
        for k in xs:
            add(k)
        return n

    def annotated(self):
        def inner(a: int) -> int:
            return a * self.v
        return (inner(3), sorted(inner.__annotations__))


def nonlocaler_run():
    n = Nonlocaler(2)
    return (n.tally([1, 2, 3]), n.annotated())


# --- cut 73: nested defs whose parameters or locals are spelled like
# Smalltalk pseudo-variables ---

def npv_synth(fields):
    # dataclasses._make_synthesized_init's shape: a nested ``__init__`` whose
    # first parameter is ``self``, with *args and **kwargs beside it.
    def init(self, *args, **kwargs):
        i = 0
        for name in fields:
            if i < len(args):
                setattr(self, name, args[i])
            elif name in kwargs:
                setattr(self, name, kwargs[name])
            i = i + 1
        return self
    return init


class NpvBox:
    pass


def npv_synth_run():
    init = npv_synth(["a", "b"])
    box = NpvBox()
    init(box, 1, b=2)
    return (box.a, box.b, init.__qualname__)


def npv_locals(x):
    # A body local spelled like a pseudo-variable -- django View.as_view's
    # ``self = cls(**initkwargs)`` -- beside a parameter that is one.  The
    # DEFAULT is on ``k``, not on ``nil``: a defaulted pseudo-variable
    # parameter of a NESTED def is a CompileError on the text path (it
    # declares ``___default_nil___`` and reads ``___default__nil___``), and
    # this fixture must pass with the flag off too.  See MIGRATION, cut 73.
    def inner(nil, k=2):
        true = x + nil
        false = true * k
        return (nil, true, false)
    return inner(2), inner(10, 3)


def npv_deco(v):
    # reprlib.recursive_repr's shape: a decorator factory whose wrapper takes
    # ``self``, applied to a nested def that also takes ``self``.
    def deco(fn):
        def wrapper(self, *rest):
            return "<" + fn(self, *rest) + ">"
        return wrapper

    @deco
    def render(self, tag):
        return tag + str(self)
    return render(v, "t")


def npv_free(v):
    # The pseudo-variable name is the CLOSURE's, not the enclosing scope's:
    # ``nil`` shadows nothing, ``v`` is the free variable.
    def inner(nil):
        return nil + v
    return inner(1), inner.__code__.co_freevars


class NpvNester:
    def __init__(self, v):
        self.v = v

    def make(self):
        # The nested def's own ``self`` SHADOWS the method's receiver -- the
        # werkzeug ``_ProxyIOp.__init__`` shape.  ``outer`` is the receiver.
        outer = self

        def i_op(self, other):
            return (self, other, outer.v)
        return i_op(9, 8)

    def cell(self):
        # The receiver is captured while the closure binds a pseudo-variable
        # of its own.
        def inner(nil):
            return self.v + nil
        return inner(1)


def npv_run():
    n = NpvNester(3)
    return (n.make(), n.cell())



# --- cut 74: a lambda parameter spelled like a Smalltalk pseudo-variable ---

def lpv_plain(x):
    # NOT exercised: ``lambda *self: ...`` / ``lambda **nil: ...``.  The text
    # declares a star parameter's temp under its RAW name, so a star parameter
    # spelled like a pseudo-variable is a CompileError there (the def-level
    # twin cut 70 recorded); both compile through IR.
    f = lambda self: self + x
    return f(1), f(self=2)


def lpv_defaults(x):
    f = lambda self, nil=2, *, true=3: (self, nil, true, x)
    return f(1), f(1, 5, true=7)


def lpv_key(pairs):
    return sorted(pairs, key=lambda nil: nil[1])


def lpv_meta():
    f = lambda self: self
    return (f.__name__, f.__qualname__, f(9))


class LpvHolder:
    def __init__(self, v):
        self.v = v

    def scaled(self, xs):
        # The lambda's own ``self`` shadows the method's receiver; ``outer``
        # keeps the receiver reachable.
        outer = self
        return [(lambda self: self * outer.v)(x) for x in xs]


def lpv_run():
    return LpvHolder(3).scaled([1, 2])





# ---------------------------------------------------------------------------
# cut 76: a ``class`` statement inside a def -- the method-local class.
# The class emit travels as a compiled-text helper method on the same class the
# enclosing IR method is built on; these pin what that must preserve.
# ---------------------------------------------------------------------------


def mlc_plain():
    class Simple:
        pass
    return (Simple.__name__, Simple.__qualname__, Simple.__module__ == __name__)


def mlc_fresh():
    class F:
        pass
    return F


def mlc_attrs():
    class A:
        """Docs."""
        tag = "t"
        n = 3
    return (A.tag, A.n, A.__doc__, A.__name__)


def mlc_methods(v):
    class P:
        def __init__(self, a):
            self.a = a

        def get(self):
            return self.a

        def plus(self, b):
            return self.a + b
    p = P(v)
    return (p.get(), p.plus(2), P.__qualname__)


def mlc_based():
    class MyErr(ValueError):
        pass
    try:
        raise MyErr("boom")
    except ValueError as ex:
        return (type(ex).__name__, str(ex), isinstance(ex, MyErr), MyErr.__mro__[1] is ValueError)


def mlc_two_classes():
    class Base:
        def f(self):
            return "base"

    class Sub(Base):
        def f(self):
            return "sub+" + super().f()
    s = Sub()
    return (s.f(), isinstance(s, Base), Sub.__mro__[1] is Base)


def mlc_slots():
    class S:
        __slots__ = ("x",)

        def __init__(self):
            self.x = 5
    return (S().x, S.__slots__)


def mlc_decorated_members():
    class T:
        @staticmethod
        def s():
            return "s"

        @classmethod
        def c(cls):
            return cls.__name__

        @property
        def p(self):
            return "p"
    return (T.s(), T.c(), T().p)


def mlc_nested_class():
    class Outer:
        class Inner:
            v = 1

        def get(self):
            return Outer.Inner.v
    return (Outer().get(), Outer.Inner.__name__)


def mlc_in_branch(flag):
    if flag:
        class C:
            kind = "yes"
    else:
        class C:
            kind = "no"
    return C.kind


def mlc_in_loop(n):
    made = []
    for _i in range(n):
        class L:
            pass
        made.append(L)
    return (len(made), made[0] is not made[-1] if n > 1 else True)


def mlc_body_error():
    try:
        class Bad:
            v = 1 // 0
        return Bad
    except ZeroDivisionError as ex:
        return str(ex)


def mlc_after(n):
    class C:
        pass
    total = n + 1
    return (C.__name__, total)


# NEGATIVE CONTROL -- a class that captures an enclosing local reads that local
# through a closure cell the helper's frame cannot see, so the def stays on the
# TEXT path (census ``classDef:capturesLocal'').  It must still be correct.
def mlc_captures(tag):
    class Cap:
        def label(self):
            return tag
    return Cap().label()


class Mlcer:
    """A class METHOD that defines a class of its own."""

    def build(self):
        class Inner:
            kind = "inner"

            def who(self):
                return "inner:" + Inner.kind
        return (Inner().who(), Inner.__qualname__)

    def counted(self, n):
        class Ctr:
            def __init__(self, k):
                self.k = k

            def doubled(self):
                return self.k * 2
        return Ctr(n).doubled()


def mlcer_run():
    m = Mlcer()
    return (m.build(), m.counted(4))




# ---------------------------------------------------------------------------
# cut 77: a method-local class that CAPTURES.  The enclosing receiver needs no
# marshalling at all (the helper shares it); an enclosing PARAMETER the def
# never reassigns is carried by value, which is sound exactly because it cannot
# change after the class statement.  A body local, or a reassigned parameter,
# still refuses -- the text's cell is by REFERENCE.
# ---------------------------------------------------------------------------


def mlc_cap_attr(tag):
    class A:
        kind = tag

        def get(inner):
            return tag
    return (A.kind, A().get())


def mlc_cap_base(base):
    class D(base):
        def who(inner):
            return "d+" + super().who()
    return (D().who(), D.__mro__[1] is base, isinstance(D(), base))


def mlc_cap_two(a, b):
    class T:
        def total(inner):
            return a + b
    return T().total()


def mlc_cap_default(n=5):
    class N:
        def get(inner):
            return n
    return N().get()


def mlc_cap_pseudo(self, nil):
    class P:
        def get(inner):
            return (self, nil)
    return P().get()


# NEGATIVE CONTROL -- the enclosing def REBINDS the captured parameter after
# the class statement, and CPython's cell (like the text's block) sees the new
# value.  Carrying it by value would freeze the old one, so it refuses.
def mlc_cap_reassigned(x):
    class R:
        def get(inner):
            return x
    r = R()
    x = x + 1
    return (r.get(), x)


class MlcerCap:
    def __init__(self):
        self.v = 41

    def from_receiver(self):
        class R:
            def get(inner):
                return self.v
        return R().get()

    def from_body(self):
        class B:
            val = 1
        return B.val + self.v

    def from_param(self, tag):
        class P:
            def label(inner):
                return tag + str(self.v)
        return P().label()


class MlcBase:
    def who(self):
        return "base"


def mlccap_run():
    m = MlcerCap()
    return (m.from_receiver(), m.from_body(), m.from_param("t"))




# ---------------------------------------------------------------------------
# cut 78: the captured local is carried BY REFERENCE -- the helper is handed
# the enclosing frame's own reader block, so the class's cell reads what the
# binding holds at READ time.  These are the shapes that tell by-reference
# from by-value, and every one of them is a value CPython and the text path
# agree on.
# ---------------------------------------------------------------------------


def mlc_loop_classes(n):
    made = []
    for i in range(n):
        class L:
            def get(inner):
                return i
        made.append(L)
    return [c().get() for c in made]


def mlc_late_bound():
    class C:
        def get(inner):
            return later
    c = C()
    later = 7
    return c.get()


def mlc_mutated():
    calls = []
    class M:
        def note(inner):
            calls.append(1)
            return len(calls)
    m = M()
    a = m.note()
    calls.append(9)
    return (a, m.note(), calls)


def mlc_rebound():
    xs = [1]
    class K:
        def get(inner):
            return xs
    k = K()
    xs = [2, 3]
    return k.get()


def mlc_body_and_cell(v):
    class B:
        seed = v

        def get(inner):
            return (B.seed, v)
    return B().get()


def mlc_two_levels(a):
    def mid():
        class Q:
            def get(inner):
                return a
        return Q().get()
    return mid()


# ---------------------------------------------------------------------------
# cut 79: the METHOD-LOCAL CLASS'S OWN METHOD BODIES go through IR.  Each of
# these is about something the shared build could get wrong and nothing else
# in the file would notice: a fresh class per call getting its own method, a
# @property whose getter/setter pair must still look like one class's, the
# decorated and varargs forms, and a traceback through such a method.
# ---------------------------------------------------------------------------


def mlc_body_twice(a, b):
    """Two calls, two classes, two instances -- neither seeing the other's."""

    def mk(v):
        class Box:
            def __init__(self, x):
                self.x = x

            def get(self):
                return self.x

            def scaled(self, k=3):
                return self.x * k
        return Box(v)

    p, q = mk(a), mk(b)
    return (p.get(), q.get(), p.scaled(), q.scaled(2), type(p) is not type(q))


def mlc_body_property():
    """A @property on a method-local class answers its VALUE, not the method.

    The regression this pins: the getter is built through IR and the read-only
    setter stub is text, so a build that gave the getter another class's inClass
    made the pair look like it spanned two classes and the read answered a bound
    method instead.
    """

    class W:
        def __init__(self, v):
            self.v = v

        @property
        def doubled(self):
            return self.v * 2

        def plain(self):
            return self.v
    w = W(4)
    return (w.doubled, w.plain(), W(5).doubled)


def mlc_body_decorated():
    class D:
        tag = "d"

        @staticmethod
        def s(x):
            return x + 1

        @classmethod
        def named(cls):
            return cls.tag + cls.__name__
    return (D.s(1), D.named(), D().s(2))


def mlc_body_varargs():
    class V:
        def __init__(self, *parts, sep="-"):
            self.parts = parts
            self.sep = sep

        def joined(self):
            return self.sep.join(self.parts)

        def with_default(self, a, b=10, *rest):
            return (a, b, rest)
    v = V("a", "b", sep="+")
    return (v.joined(), v.with_default(1), v.with_default(1, 2, 3))


def mlc_body_generator():
    class G:
        def upto(self, n):
            i = 0
            while i < n:
                yield i
                i = i + 1
    return list(G().upto(3))


def mlc_body_raises():
    """A raise from inside a method-local class's method unwinds to the caller."""

    class R:
        def boom(self):
            return 1 // 0
    try:
        R().boom()
    except ZeroDivisionError as ex:
        return ("caught", str(ex))


class Mlcer79:
    """A class inside a class-body METHOD -- the corpus's dominant shape."""

    base = 100

    def build(self, n):
        class Acc:
            def __init__(self, k):
                self.k = k

            def total(self):
                return self.k * 2
        return Acc(n).total()

    def build_prop(self):
        class Pr:
            @property
            def five(self):
                return 5
        return Pr().five


def mlcer79_run():
    m = Mlcer79()
    return (m.build(3), m.build(4), m.build_prop())


def mlc_body_traceback():
    """The formatted traceback of a raise inside a method-local class's method.

    NOT in RESULTS, and deliberately: ``import traceback'' drags in a few
    hundred stdlib defs, and testIRPathWasActuallyTaken asserts an exact
    compiled count -- one that would then depend on whether some earlier test
    had already imported the module.  IRCodegenSmokeTestCase calls this from a
    test of its own, the way text_caller is called.
    """

    import traceback

    class R:
        def boom(self):
            return 1 // 0
    try:
        R().boom()
    except ZeroDivisionError:
        return traceback.format_exc()


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
    "rect_run": rect_run() == (6, 24, "r:4x6", "big:4x6", True, False),
    "pv_run": pv_run() == (5, 8),
    "guard_run": guard_run() == ([], None, 1, "unbound: cannot access local variable 'v' where it is not associated with a value", "deleted"),
    "flow_run": flow_run() == (("lit", [1, 2]), ("lit", ["stop", 3]), "empty", (4, 2)),
    "global_walrus_run": global_walrus_run() == (
        2, 5, 10, 10, ("long", 3), ("short", 1), ([2, 4], None), ("same", 0), ("diff", 1)),
    "tail_run": tail_run() == (
        (True, True, "ellipsis"), (False, True, "ellipsis"),
        (3, [1, 2], [3, 2, 1], True),
        ("tagged", "bad", 7), ("tagged", "worse", 9), ("key", "'k'"),
        [1, 2, 3, "for-else", "while-else"], [1],
        "all-nonneg", "neg"),
    "util_run": util_run() == (3, 7, 20, 6, ([1, 2], ["z"]), 16, 11),
    "chain_run": chain_run() == ((5, 6, 5, [5, 9], 6, 6, 6, 6, (6, 6)), (42, 42), 6),
    "aug_targets": aug_targets() == ((2, [2]), (5, [2, 3]), (6, 11, [1, 6, 3]), 10),
    "maker_run": maker_run() == (8, "Maker", 2, "SubMaker", 4, 11, "t:Maker", "x:SubMaker", "t:Maker", "I:SUBMAKER"),
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
    "lc_squares": lc_squares([1, 2, 3]) == [1, 4, 9],
    "lc_filtered": lc_filtered(7) == [2, 4, 6],
    "lc_nested_for": lc_nested_for([1, 2], [2, 3]) == [(1, 2), (1, 3), (2, 3)],
    "lc_inner_reads_outer": lc_inner_reads_outer([1, 3]) == [0, 0, 1, 2],
    "lc_unpack": lc_unpack([(1, 2), (3, 4)]) == [3, 7],
    "lc_nested_unpack": lc_nested_unpack([((1, 2), 3), ((4, 5), 6)]) == [6, 15],
    "lc_shadow_local": lc_shadow_local([1, 2]) == (100, [2, 3]),
    "lc_shadow_param": lc_shadow_param([1, 2]) == [2, 4],
    "lc_shadow_builtin": lc_shadow_builtin([1, 2]) == [2, 3],
    "lc_wildcard": lc_wildcard(3) == [0, 0, 0],
    "lc_nested_comp": lc_nested_comp([1, 2], [10, 20]) == [[10, 20], [20, 40]],
    "lc_inner_iter_from_outer": lc_inner_iter_from_outer([[1, 2], [3]]) == [[1, 2], [3]],
    "lc_in_call": lc_in_call([0, 1, 2]) == 5,
    "lc_after_target_read": lc_after_target_read([1, 2]) == (2, 3, [2, 4]),
    "lc_bad_iter": lc_bad_iter() == "'NoneType' object is not iterable",
    "lc_bad_body": lc_bad_body([1]) == "body-error",
    "comp_run": comp_run() == ([3, 0, 6], [(1, 2), (1, 3), (0, 2), (0, 3), (2, 3)], [0, 2]),
    "sc_mods": sorted(sc_mods([1, 4, 5])) == [1, 2],
    "sc_pairs": sorted(sc_pairs([1, 2, 3])) == [(1, 2), (1, 3), (2, 3)],
    "sc_unpack": sorted(sc_unpack([("a", 1), ("b", 0), ("c", 2)])) == ["a", "c"],
    "dc_index": dc_index("ab") == {"a": 0, "b": 1},
    "dc_filtered": dc_filtered({"a": 1, "b": 0, "c": 3}) == {"a": 2, "c": 6},
    "dc_nested": dc_nested([0, 2]) == {0: [], 2: [0, 1]},
    "dc_shadow": dc_shadow("k") == ({"k": 0}, {0: 1, 1: 2}, "k"),
    "compbag_run": compbag_run() == ([1, 2], {2: 2, 0: 1, 1: 3}, {2: 2, 0: 1, 1: 1}),
    "ge_doubled": list(ge_doubled([1, 2])) == [2, 4],
    "ge_sum": ge_sum([0, 1, 2]) == 3,
    "ge_any_short": ge_any_short([], [1, 2, 3]) == (True, [1, 2]),
    "ge_lazy_consume": ge_lazy_consume([2, 3, 4]) == (4, [9, 16]),
    "ge_construction_iter": ge_construction_iter() == "'NoneType' object is not iterable",
    "ge_meta": ge_meta([1]) == ("generator", "<genexpr>", "ge_meta.<locals>.<genexpr>"),
    "ge_nested": ge_nested([1, 2]) == [[0], [0, 1]],
    "ge_unpack": ge_unpack([(2, 3), (4, 5)]) == [6, 20],
    "ge_in_generator": list(ge_in_generator([1, 2])) == [3, [2, 3]],
    "ge_shadow": ge_shadow(3) == ([0, 1, 2], 3),
    "genexpr_run": genexpr_run() == (1, [2, 3], 60, "GenExpr.lazy.<locals>.<genexpr>"),
    "nd_plain": nd_plain(1) == 2,
    "nd_capture": nd_capture(1, 2) == 4,
    "nd_defaults": nd_defaults(1) == (112, 104, 7, 17),
    "nd_star": nd_star(1) == (2, ["k"], 1),
    "nd_returned": nd_returned(5)(1) == 6,
    "nd_deep": nd_deep(1) == 6,
    "nd_recursive": nd_recursive(4) == 24,
    "nd_loop_default": nd_loop_default([1, 2]) == [2, 4],
    "nd_docd": nd_docd(1) == (2, "Doc here."),
    "nd_meta": nd_meta() == ("inner", "nd_meta.<locals>.inner", True, "inner", 3, 2, 0, (), True),
    "nd_closure": nd_closure(3) == (1, 3, ("x",)),
    "nd_cell_setter": nd_cell_setter(1) == (50, 50),
    "nd_errors": nd_errors(1) == [
        "nd_errors.<locals>.inner() missing 1 required positional argument: 'a'",
        "nd_errors.<locals>.inner() takes from 1 to 2 positional arguments but 3 were given",
        "nd_errors.<locals>.inner() got an unexpected keyword argument 'z'"],
    "nd_posonly_error": nd_posonly_error(1) == "nd_posonly_error.<locals>.inner() got some positional-only arguments passed as keyword arguments: 'a'",
    "nd_distinct": nd_distinct() is not nd_distinct(),
    "nd_stamp": (nd_stamp("a"), nd_stamp("b")) == ("ABSENT", "ABSENT"),
    "nd_generator": nd_generator(10) == ("generator", "nd_generator.<locals>.g", [10, 11, 12]),
    "nd_deco": nd_deco(1) == (1, 2, ["d1", "d2", "d1"]),
    "nd_module_deco": nd_module_deco(7) == 7,
    "nd_shadow": nd_shadow(1) == (20, 1),
    "nd_shadow_local": nd_shadow_local(1) == (5, 1),
    "nd_early_return": nd_early_return(5) == ("small", "big"),
    "nd_try_in_inner": nd_try_in_inner([]) == (5, "zero", ["fin", "fin"]),
    "nd_in_branch": (nd_in_branch(True), nd_in_branch(False)) == ("yes", "no"),
    "nd_interleaved_loops": nd_interleaved_loops([1, 2, 3]) == [2, 4, 6],
    "nd_gen_interleaved": nd_gen_interleaved(2) == [(0, 0), (0, 1), (1, 0), (1, 1)],
    "nd_unpack_interleaved": nd_unpack_interleaved([(1, 2), (3, 4)]) == [((2, 1), 1, 2), ((4, 3), 3, 4)],
    "nd_async_gen_loop": nd_async_gen_loop(3) == ([0, 1, 2], 3),
    "nester_run": nester_run() == (4, (4, ("self",), "Nester.closure_over_self.<locals>.inner"), 7, [2, 3], "super(): no arguments"),
    "lam_plain": lam_plain(1) == 2,
    "lam_call_arg": lam_call_arg([1, 3, 2]) == [3, 2, 1],
    "lam_defaults": lam_defaults(1) == ((4, 0, []), (5, 1, ["k"]), (9, 0, [])),
    "lam_kwonly": lam_kwonly(1) == (14, 7),
    "lam_posonly": lam_posonly(1) == (7, 7),
    "lam_meta": lam_meta(1) == ("<lambda>", "lam_meta.<locals>.<lambda>", True, "<lambda>", 1, 0, 0),
    "lam_loop_capture": lam_loop_capture([1, 2]) == ([10, 20], [2, 2]),
    "lam_nested": lam_nested(1) == 4,
    "lam_as_default": lam_as_default(1) == (7, 104),
    "lam_errors": lam_errors(1) == [
        "missing 1 required positional argument: 'a'",
        "missing 1 required positional argument: 'a'",
        "missing 1 required keyword-only argument: 'k'"],
    "lam_conditional": lam_conditional(5) == ("small", "big"),
    "lam_immediate": lam_immediate(4) == 12,
    "lammer_run": lammer_run() == ([3, 6], [(3, "a"), (2, "a"), (1, "b")], (3, "Lammer.meta.<locals>.<lambda>", 0)),
    "nl_counter": nl_counter() == (2, 3),
    "nl_two_levels": nl_two_levels() == (3, 3),
    "nl_mid_owner": nl_mid_owner() == 40,
    "nl_cell_view": nl_cell_view(5) == (5, 6, 6),
    "nl_annotated": nl_annotated(1) == ("2z", ["a", "b", "return"], True, True, "str"),
    "nl_annotated_docd": nl_annotated_docd(1) == (3, "Adds x.", ["a", "return"]),
    "nonlocaler_run": nonlocaler_run() == (12, (6, ["a", "return"])),
    # cut 73: a nested def whose parameters or locals are Smalltalk
    # pseudo-variables.  NOT exercised (the fixture must pass with the flag off
    # too, and these are TEXT gaps recorded in MIGRATION): passing such a
    # parameter BY KEYWORD (``inner(nil=5)``) reads ``_nil`` from the kwargs
    # dict on the text path and so binds the default; and the text's
    # missing-argument report names the transport spelling (``'_self'``) where
    # CPython and the IR name ``'self'``.
    "npv_synth_run": npv_synth_run() == (1, 2, "npv_synth.<locals>.init"),
    "npv_locals": npv_locals(1) == ((2, 3, 6), (10, 11, 33)),
    "npv_deco": npv_deco(3) == "<t3>",
    "npv_free": npv_free(4) == (5, ("v",)),
    "npv_run": npv_run() == ((9, 8, 3), 4),
    "lpv_plain": lpv_plain(10) == (11, 12),
    "lpv_defaults": lpv_defaults(4) == ((1, 2, 3, 4), (1, 5, 7, 4)),
    "lpv_key": lpv_key([("a", 3), ("b", 1)]) == [("b", 1), ("a", 3)],
    "lpv_meta": lpv_meta() == ("<lambda>", "lpv_meta.<locals>.<lambda>", 9),
    "lpv_run": lpv_run() == [3, 6],
    # cut 76: method-local classes.  (``mlc_two_classes'' and ``mlc_captures''
    # were cut 76's negative controls -- a locally-defined base class and a
    # captured parameter -- and both compile through IR since cuts 77-78.)
    "mlc_plain": mlc_plain() == ("Simple", "mlc_plain.<locals>.Simple", True),
    "mlc_fresh": mlc_fresh() is not mlc_fresh(),
    "mlc_attrs": mlc_attrs() == ("t", 3, "Docs.", "A"),
    "mlc_methods": mlc_methods(5) == (5, 7, "mlc_methods.<locals>.P"),
    "mlc_based": mlc_based() == ("MyErr", "boom", True, True),
    "mlc_two_classes": mlc_two_classes() == ("sub+base", True, True),
    "mlc_slots": mlc_slots() == (5, ("x",)),
    "mlc_decorated_members": mlc_decorated_members() == ("s", "T", "p"),
    "mlc_nested_class": mlc_nested_class() == (1, "Inner"),
    "mlc_in_branch": (mlc_in_branch(True), mlc_in_branch(False)) == ("yes", "no"),
    "mlc_in_loop": mlc_in_loop(3) == (3, True),
    "mlc_body_error": mlc_body_error() == "division by zero",
    "mlc_after": mlc_after(1) == ("C", 2),
    "mlc_captures": mlc_captures("z") == "z",
    "mlcer_run": mlcer_run() == (("inner:inner", "Mlcer.build.<locals>.Inner"), 8),
    # cut 77: captures of the enclosing receiver and of parameters.  (Cut 77's
    # negative control ``mlc_cap_reassigned'' -- the def rebinds the captured
    # parameter after the class statement -- is now CARRIED, and asserts the
    # by-reference answer: (2, 2), which is what CPython and the text give.)
    "mlc_cap_attr": mlc_cap_attr("t") == ("t", "t"),
    "mlc_cap_base": mlc_cap_base(MlcBase) == ("d+base", True, True),
    "mlc_cap_two": mlc_cap_two(1, 2) == 3,
    "mlc_cap_default": mlc_cap_default() == 5,
    "mlc_cap_pseudo": mlc_cap_pseudo("S", "N") == ("S", "N"),
    "mlc_cap_reassigned": mlc_cap_reassigned(1) == (2, 2),
    "mlccap_run": mlccap_run() == (41, 42, "t41"),
    # cut 78: by-reference capture.  Every one of these is a DIFFERENT value
    # under by-value marshalling, which is why they are here.
    "mlc_loop_classes": mlc_loop_classes(3) == [2, 2, 2],
    "mlc_late_bound": mlc_late_bound() == 7,
    "mlc_mutated": mlc_mutated() == (1, 3, [1, 9, 1]),
    "mlc_rebound": mlc_rebound() == [2, 3],
    "mlc_body_and_cell": mlc_body_and_cell(5) == (5, 5),
    "mlc_two_levels": mlc_two_levels(9) == 9,

    # cut 79: the inner class's own method bodies.
    "mlc_body_twice": mlc_body_twice(2, 5) == (2, 5, 6, 10, True),
    "mlc_body_property": mlc_body_property() == (8, 4, 10),
    "mlc_body_decorated": mlc_body_decorated() == (2, "dD", 3),
    "mlc_body_varargs": mlc_body_varargs()
        == ("a+b", (1, 10, ()), (1, 2, (3,))),
    "mlc_body_generator": mlc_body_generator() == [0, 1, 2],
    "mlc_body_raises": mlc_body_raises() == ("caught", "division by zero"),
    "mlcer79_run": mlcer79_run() == (6, 8, 5),
}

ALL_OK = all(RESULTS.values())

print("ir_codegen_smoke RESULTS:", RESULTS)
print("ir_codegen_smoke ALL_OK:", ALL_OK)
