# Fixture for PosonlyAndReflectedEqTestCase.
#
# Three independent roots found while greening CPython's test_userdict, none of
# them specific to UserDict:
#
# 1. POSITIONAL-ONLY parameters (``def f(dict=None, /, **kw)'') were bound by
#    keyword AND left in **kwargs, so a keyword matching such a parameter was
#    applied TWICE.  ``UserDict(dict=[('one', 1)])'' built
#    {'one': 1, 'dict': [('one', 1)]} instead of {'dict': [('one', 1)]}.
#    Two emitters had to be fixed -- the closure/module form and the class-body
#    method forwarder -- which is why methods and plain functions behaved
#    differently for a while.
#
# 2. ``dict.__eq__(non_dict)'' answered False instead of punting with
#    NotImplemented, so the REFLECTED __eq__ never ran: ``UserDict() == {}''
#    was True but ``{} == UserDict()'' was False.  Not UserDict-specific -- any
#    class with an __eq__ compared from the right of a dict.  list/int/str
#    already punted; dict was the odd one out.
#
# 3. A function lifted off one class and stored in another class body
#    (``f = OtherClass.f'', verbatim upstream in test_userdict) stayed UNBOUND,
#    so calling it through an instance raised "unbound method ... must be called
#    with an instance as the first argument".  Functions are descriptors in
#    Python; UnboundMethod now binds on instance access and stays unbound on
#    class access.

import collections

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


# --- 1. positional-only parameters ------------------------------------------


def posonly_fn(dict=None, /, **kw):
    return (dict, kw)


class PosonlyMethods:
    def __init__(self, dict=None, /, **kw):
        self.got = (dict, kw)

    def m(self, a=None, /, **kw):
        return (a, kw)


class NoSlash:
    """Without ``/`` the parameter IS keyword-bindable -- must not change."""

    def __init__(self, dict=None, **kw):
        self.got = (dict, kw)


_run("fn_kw_matching_posonly", lambda: posonly_fn(dict=42))
_run("fn_positional", lambda: posonly_fn({"x": 1}))
_run("fn_both", lambda: posonly_fn({"x": 1}, dict=42))
_run("method_kw_matching_posonly", lambda: PosonlyMethods(dict=42).got)
_run("method_positional", lambda: PosonlyMethods({"x": 1}).got)
_run("method_both", lambda: PosonlyMethods({"x": 1}, dict=42).got)
_run("method_self_as_key", lambda: PosonlyMethods(self=42).got)
_run("plain_method_kw", lambda: PosonlyMethods().m(a=1))
_run("plain_method_positional", lambda: PosonlyMethods().m(5))
_run("no_slash_still_binds", lambda: NoSlash(dict=42).got)

# UserDict is the concrete case that motivated it.
def _update_self():
    d = collections.UserDict()
    d.update(self=42)
    return list(d.items())


_run("userdict_dict_key", lambda: sorted(collections.UserDict(dict=[("one", 1)]).items()))
_run("userdict_self_key", lambda: list(collections.UserDict(self=42).items()))
_run("userdict_update_self_key", _update_self)


# --- 2. reflected __eq__ from the right of a dict ---------------------------


class EqToDict:
    def __eq__(self, other):
        return other == {"k": 1}

    __hash__ = None


_run("dict_eq_userdict", lambda: {"one": 1} == collections.UserDict({"one": 1}))
_run("userdict_eq_dict", lambda: collections.UserDict({"one": 1}) == {"one": 1})
_run("dict_ne_userdict", lambda: {"one": 1} != collections.UserDict({"one": 1}))
_run("dict_eq_plain_class", lambda: {"k": 1} == EqToDict())
_run("plain_class_eq_dict", lambda: EqToDict() == {"k": 1})
_run("dict_eq_dict_still_true", lambda: {"a": 1} == {"a": 1})
_run("dict_eq_dict_still_false", lambda: {"a": 1} == {"a": 2})
_run("dict_ne_dict_still_true", lambda: {"a": 1} != {"a": 2})
_run("dict_eq_unrelated_is_false", lambda: {"a": 1} == 42)
_run("dict_ne_unrelated_is_true", lambda: {"a": 1} != 42)
# The dunder itself must PUNT, not answer False -- that is what the operator
# layer needs in order to try the reflected side.
_run("dunder_punts", lambda: {"a": 1}.__eq__(collections.UserDict()) is not False)

# PEP 584 union, added to UserDict at the same time.
_run("userdict_or_userdict", lambda: dict((collections.UserDict({0: "a"}) | collections.UserDict({1: "b"})).items()))
_run("dict_or_userdict_type", lambda: type({0: "a"} | collections.UserDict({1: "b"})).__name__)
def _ior():
    u = collections.UserDict({0: "a"})
    u |= {1: "b"}
    return (dict(u.items()), type(u).__name__)


_run("userdict_ior", _ior)


# --- 3. a function lifted off another class binds on instance access --------


class Donor:
    def describe(self):
        return "donor-method on %s" % type(self).__name__


class Recipient(Donor):
    # Verbatim shape of test_userdict.py's
    # ``test_repr_deep = mapping_tests.TestHashMappingProtocol.test_repr_deep''
    describe_copy = Donor.describe


_run("lifted_method_binds", lambda: Recipient().describe_copy())
_run("class_access_stays_unbound", lambda: Donor.describe(Recipient()))
_run("normal_inherited_still_works", lambda: Recipient().describe())

RESULTS = out
