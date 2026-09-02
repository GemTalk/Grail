# Exercise weakref under real Grail module loading.
#
# Each top-level binding becomes a module attribute the Smalltalk test
# inspects through `@env1:name`.

import weakref


# --- ref: live referent --------------------------------------------------

def _make_alive_ref():
    L = [1, 2, 3]
    return L, weakref.ref(L)


_alive_L, _alive_ref = _make_alive_ref()
ref_value_while_alive_is_referent = _alive_ref() is _alive_L


# --- ref: death triggers callback ---------------------------------------

_callback_log = []


def _register_callback_ref():
    L = [1, 2, 3]
    return weakref.ref(L, lambda r: _callback_log.append(r() is None))


_dying_ref = _register_callback_ref()
weakref._collect()

callback_fired_once = len(_callback_log) == 1
callback_saw_dead_referent = _callback_log == [True]
ref_is_none_after_collection = _dying_ref() is None


# --- ref: equality / hash while alive ----------------------------------

_pair_a = [7]
_pair_b = [7]
_ref_a = weakref.ref(_pair_a)
_ref_b = weakref.ref(_pair_b)
refs_equal_while_alive = _ref_a == _ref_b
ref_is_hashable_as_dict_key = {_ref_a: 99}[_ref_a] == 99


# --- WeakValueDictionary -----------------------------------------------

def _populate_wvd_and_drop():
    d = weakref.WeakValueDictionary()
    d["k"] = [1, 2, 3]
    return d


_wvd = _populate_wvd_and_drop()
weakref._collect()

wvd_entry_vanishes_when_value_collected = "k" not in _wvd and len(_wvd) == 0
wvd_get_missing_returns_default = (
    weakref.WeakValueDictionary().get("nope", "fallback") == "fallback"
)


# --- WeakSet -----------------------------------------------------------

def _populate_weakset_and_drop():
    s = weakref.WeakSet()
    s.add([1, 2, 3])
    return s


_ws = _populate_weakset_and_drop()
weakref._collect()

weakset_member_vanishes_when_collected = len(_ws) == 0


# --- finalize ----------------------------------------------------------

_finalize_log = []


def _register_finalizer():
    L = [1, 2, 3]
    return weakref.finalize(L, lambda: _finalize_log.append("done"))


_finalizer = _register_finalizer()
finalize_alive_before_collect = _finalizer.alive

weakref._collect()

finalize_fired_on_collection = _finalize_log == ["done"]
finalize_not_alive_after_fire = not _finalizer.alive

# Explicit-call form: runs the block early, returns its result, marks dead.
# ``_explicit_target'' is a NAME, not a temporary: what is under test here is
# calling a finalizer while its referent is ALIVE, and an unreferenced literal
# leaves that to the collector's timing -- the referent could be reclaimed
# between the two lines, firing the finalizer first and turning this into a
# measurement of GC cadence.  (It did: CI once errored inside __call__ on a
# payload the ref callback had already claimed.)
_explicit_log = []
_explicit_target = [1, 2, 3]
_explicit = weakref.finalize(_explicit_target, lambda: 17)
finalize_explicit_call_returns = _explicit() == 17
finalize_inert_after_explicit_call = not _explicit.alive


# A finalizer's payload is CLAIMED, in one step, by whichever of its callers
# gets there first -- an explicit call, the ref callback when the referent is
# reclaimed, or detach().  Held as separate ``alive'' and payload slots and
# cleared one statement at a time, the two callers could interleave and leave a
# finalizer that still reported alive with its payload already taken; calling it
# then raised ``TypeError: 'NoneType' object is not iterable'' out of ``f(*a)''.
# That state is now unrepresentable -- there is one slot -- and these check the
# property that makes it so: after ANY claimer has run, every other one is inert
# and agrees with ``alive''.
_claim_target = [1, 2, 3]
_claimed = weakref.finalize(_claim_target, lambda: 17)
_claimed()
finalize_second_call_is_inert = (
    _claimed() is None and _claimed.alive is False
    and _claimed.peek() is None and _claimed.detach() is None)

_detach_target = [1, 2, 3]
_detached = weakref.finalize(_detach_target, lambda: 17)
_detach_info = _detached.detach()
finalize_call_after_detach_is_inert = (
    _detach_info is not None and _detached() is None
    and _detached.alive is False)

_fired_target = [1, 2, 3]
_fired = weakref.finalize(_fired_target, lambda: 17)
_fired._fire()
finalize_call_after_fire_is_inert = (
    _fired() is None and _fired.alive is False)


# --- proxy: attribute / method / item forwarding -------------------------
# weakref.proxy delegates every operation to the live referent.  Its
# internal ``_Proxy.__get`` reads the mangled slot ``_Proxy__ref`` that
# ``__init__`` set; Grail doesn't implement ``__name`` name mangling, so a
# bare ``self.__ref`` read missed and recursed into ``__getattr__`` ->
# ``__get`` forever (a stack overflow that surfaced via flask.jsonify ->
# current_app proxying).  These must round-trip without blowing the stack.


class _ProxyTarget:
    def __init__(self):
        self.value = 42

    def greet(self):
        return "hi"


def proxy_forwards_attr_and_method():
    t = _ProxyTarget()
    p = weakref.proxy(t)
    return [p.value, p.greet()]


def proxy_forwards_container_ops():
    d = {"a": 1, "b": 2}
    p = weakref.proxy(d)
    return [p["a"], len(p), "b" in p]
