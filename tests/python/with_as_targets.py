# ``with EXPR as TARGET'' where TARGET is not a plain name.
#
# A with-as clause is an assignment, so TARGET may be anything that can be
# assigned to: a name, an attribute, a subscript, or a nested / starred
# tuple.  Grail's WithAst handled only the bare NameAst and emitted every
# other shape through the target's own printSmalltalkOn: -- which is a LOAD
# emit of a STORE-context node.  So an attribute or subscript target died at
# compile time on ``Expression Context should be <Load> but is <Store>'', and
# a tuple target emitted ``(tuple withAll: {a. b}) := val'', which is not
# Smalltalk at all.  Everything except the plain name was broken, and because
# it failed inside the emit it took the whole enclosing module down: that is
# what made test.test_with score IMPORTERROR with nothing measured.
#
# ``for TARGET in ...'' had the same hole from the other direction --
# printSmalltalkOn: routed every non-tuple target to a Name-only store, which
# sent isModuleVariableName: to an AttributeAst and died with a
# doesNotUnderstand, again at compile time.
#
# Both now go through one shared emitter, so with/for targets get the same
# iterable coercion, ValueError value-count check, PEP 3132 star support and
# @property setter dispatch that a plain ``a, b = ...'' has always had.

r = {}


class CM:
    """Yields whatever it was constructed with."""

    def __init__(self, v):
        self.v = v

    def __enter__(self):
        return self.v

    def __exit__(self, *a):
        return False


class Holder:
    pass


# --- module scope -------------------------------------------------------------
# The module-scope routing is the part that is easy to get half right: names
# bound at module level live in the module instance's storage, not in a block
# temp, so a store and the later load have to agree on which.

h = Holder()
d = {}

with CM(1) as name_target:
    r['name'] = name_target

with CM((1, 2)) as (ma, mb):
    r['tuple_module'] = (ma, mb)

with CM(5) as h.slot:
    r['attribute'] = h.slot

with CM(7) as d['k']:
    r['subscript'] = d['k']


# --- function scope -----------------------------------------------------------


def in_function():
    out = {}
    with CM((1, 2)) as (a, b):
        out['tuple'] = (a, b)
    with CM([1, 2, 3, 4]) as (p, *q, s):
        out['star'] = (p, q, s)
    with CM((1, (2, 3))) as (a, (b, c)):
        out['nested'] = (a, b, c)
    with CM([9, 8]) as [x, y]:
        out['list_target'] = (x, y)
    return out


r.update(in_function())


# --- several items in one with ------------------------------------------------


def multi():
    with CM(1) as a, CM((2, 3)) as (b, c):
        return (a, b, c)


r['multi_item'] = multi()


# --- the target is an assignment, so it gets assignment's error checking -------


def wrong_count():
    try:
        with CM((1, 2, 3)) as (a, b):
            return 'no error'
    except ValueError as e:
        # CPython 3.14 appends ``, got 3'' when the source is a sized
        # sequence and omits it when the values came from an iterator it
        # cannot measure.  Grail omits it in both cases -- a separate,
        # pre-existing gap in the shared unpack check (matching it needs
        # ___unpackSequence___ to tell ___unpackCheck___ whether it had to
        # materialise), and not what this case is here to show.  Normalise
        # it away so both sides compare on the part that matters: that a
        # with-target gets the value-count check at all.
        return 'ValueError: %s' % str(e).replace(', got 3', '')


r['wrong_count'] = wrong_count()


# --- an attribute target must go through the property setter ------------------


class WithProperty:
    def __init__(self):
        self.log = []
        self._v = None

    @property
    def v(self):
        return self._v

    @v.setter
    def v(self, value):
        self.log.append(value)
        self._v = value


def property_target():
    wp = WithProperty()
    with CM(42) as wp.v:
        pass
    return (wp.v, wp.log)


r['property_setter'] = property_target()


# --- for-loop targets, the same shapes ----------------------------------------

for h.slot in [1, 2, 3]:
    pass
r['for_attribute'] = h.slot

for d['j'] in [7, 8]:
    pass
r['for_subscript'] = d['j']


def for_list_target():
    out = []
    for [a, b] in [(1, 2), (3, 4)]:
        out.append(a + b)
    return out


r['for_list_target'] = for_list_target()


# --- PEP 3132 / nesting inside a for target still works -----------------------


def for_nested():
    out = []
    for a, (b, *c) in [(1, (2, 3, 4)), (5, (6,))]:
        out.append((a, b, c))
    return out


r['for_nested'] = for_nested()


# --- a constant can never be an assignment target -----------------------------
# CPython rejects these at COMPILE time.  Grail's parser accepted every one of
# them and emitted code that silently did the wrong thing; test_with has three
# tests on exactly this (testAssignmentToNoneError and friends).


def _syntax(code):
    try:
        compile(code, '', 'single')
        return 'no error'
    except SyntaxError:
        return 'SyntaxError'


r['none_target'] = _syntax('with mock as None:\n  pass')
r['none_parenthesized'] = _syntax('with mock as (None):\n  pass')
r['none_tuple'] = _syntax('with mock as None,:\n  pass')
r['none_tuple_paren'] = _syntax('with mock as (None,):\n  pass')
r['none_in_tuple'] = _syntax('with mock as (foo, None, bar):\n  pass')
r['none_assign'] = _syntax('None = 1')
r['true_assign'] = _syntax('True = 1')
r['literal_assign'] = _syntax('1 = 2')
r['none_for_target'] = _syntax('for None in x:\n  pass')
# ...and the legal shapes must still compile.
r['legal_attribute'] = _syntax('with mock as h.slot:\n  pass')
r['legal_subscript'] = _syntax("with mock as d['k']:\n  pass")
r['legal_tuple'] = _syntax('with mock as (foo, bar):\n  pass')


# --- ``with obj:'' on something that is not a context manager -----------------
# CPython names WHICH half of the protocol is missing, and reports a missing
# __exit__ before a missing __enter__ -- its SETUP_WITH looks __exit__ up
# first.  Grail reported neither, so the message could not distinguish the
# three cases.


class LacksEnter:
    def __exit__(self, t, v, tb):
        return False


class LacksExit:
    def __enter__(self):
        return self


def _protocol(obj):
    try:
        with obj:
            return 'no error'
    except TypeError as e:
        msg = str(e)
        # CPython 3.14 QUALIFIES the type name (``'mod.Cls' object ...''),
        # Grail uses the bare class name.  That difference is real but it is
        # not what these cases are about -- and test_with does not test it
        # either, since it matches the message as a substring -- so normalise
        # the prefix away rather than pin it here.
        head, sep, tail = msg.partition(' object does not support')
        return '<TYPE>' + sep + tail if sep else msg


r['missing_enter'] = _protocol(LacksEnter())
r['missing_exit'] = _protocol(LacksExit())
# Neither half: the __exit__ complaint wins.
r['missing_both'] = _protocol(object())


# An object with only the ASYNC half gets told so.  Written with setattr
# because Grail drops ``async def'' bodies entirely today -- the class-level
# `async def __aenter__` form does not reach the class at all, so it cannot
# reach this message either (test_with's testWithForAsyncManager still fails
# on that, and will keep failing until async defs are compiled).
class OnlyAsync:
    pass


OnlyAsync.__aenter__ = lambda self: None
OnlyAsync.__aexit__ = lambda self, t, v, tb: None

r['async_only'] = _protocol(OnlyAsync())

RESULTS = r
# Flat repr view, so the Smalltalk test compares one table of strings against
# CPython's own repr output instead of walking nested tuples and lists.
RESULTS_REPR = {k: repr(v) for k, v in r.items()}
