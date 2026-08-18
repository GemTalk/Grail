# Fixture for ModuleDictItemTestCase.
#
# A module's ``__dict__`` (PyModuleDict) is CPython's ordinary mutable dict,
# but Grail's is a view over the module's dynamic instance variables.  Two
# gaps followed from that:
#
# 1. No ``__delitem__`` at all, so ``del mod.__dict__[name]`` -- and
#    ``del builtins.__dict__['iter']``, the first statement of CPython's
#    test_iter test_reduce_mutating_builtins_iter -- raised the generic
#    "'PyModuleDict' object does not support item deletion".
#
# 2. Dynamic instance variables are keyed by SYMBOL, so a non-string key sent
#    ``asSymbol`` to whatever it was given: "a CustomStr does not understand
#    #asSymbol", a Smalltalk MNU that Python's ``except`` cannot catch and
#    that can kill the session from inside a builtin callback.
#
#    That was first fixed by REFUSING such a key as a catchable TypeError, and
#    the three ``non_string_key`` checks below pinned the refusal.  They now
#    expect "no raise", which is what CPython answers: a module or instance dict
#    is an ordinary dict there and takes any hashable key.  Grail stores them in
#    a side table now -- see PyInstanceDict >> ___overflowSlot___ -- so the
#    catchable-TypeError property these checks were written for is still what
#    they cover, just for the case that remains: a non-string ATTRIBUTE NAME.
#
# THIS FIXTURE CANNOT BE GATED, and that is why the drift above went unnoticed
# for as long as it did.  ``scripts/check_python_fixtures.sh`` only runs fixtures
# with a column-zero ``__main__`` block, and adding one here would falsify two
# checks: ``del_own_module_key`` and ``string_keys_still_work`` reach their own
# module through ``sys.modules[__name__]``, which is "__main__" when the file is
# run as a script.  So the expectations have to be re-derived BY HAND:
#
#     python3 -c "import runpy; m = runpy.run_path('tests/python/module_dict_items.py'); \
#                 print(m['set_non_string_key']())"
#
#  -- bearing in mind that runpy names the module "<run_path>", so the two
#  name-dependent checks are not meaningful under it either.

import builtins
import sys


def _caught(fn):
    try:
        return fn()
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)


def _caught_kind(fn):
    """As _caught, but naming only the exception TYPE.

    For the pair of checks that compare a non-string key against the string it
    equals: a KeyError names the key it was given, so the two messages differ by
    construction even when the behaviour is identical -- which is the thing under
    test."""
    try:
        fn()
        return "no raise"
    except BaseException as e:
        return type(e).__name__


class CustomStr:
    """Hashes and compares equal to a string, but is not one."""

    def __init__(self, name):
        self.name = name

    def __hash__(self):
        return hash(self.name)

    def __eq__(self, other):
        return other == self.name


def del_own_module_key():
    """set / read / del a key on THIS module's __dict__."""
    d = sys.modules[__name__].__dict__
    d["probe_attr"] = 7
    got = d["probe_attr"]
    del d["probe_attr"]
    return (got, "probe_attr" in d)


def del_builtins_key():
    d = builtins.__dict__
    d["grail_probe_tmp"] = 1
    got = d["grail_probe_tmp"]
    del d["grail_probe_tmp"]
    return (got, "grail_probe_tmp" in d)


def del_missing_key():
    return _caught(lambda: builtins.__dict__.__delitem__("grail_no_such_key_xyz"))


def del_statement_missing_key():
    def go():
        del sys.modules[__name__].__dict__["grail_no_such_key_xyz"]
        return "no raise"

    return _caught(go)


def set_non_string_key():
    """Must be a CATCHABLE TypeError -- an MNU here escapes Python entirely."""

    def go():
        builtins.__dict__[CustomStr("iter")] = 1
        return "no raise"

    return _caught(go)


def del_non_string_key():
    """Paired with del_string_key_cold below -- compare the two, do not pin either.

    ``del builtins.__dict__['iter']'' with no prior READ of ``iter'' fails in Grail
    for a reason that has nothing to do with the key's type: a builtin FUNCTION is
    resolvable and appears in dir(), but is only materialised as a deletable
    binding by the first read of it.  The string spelling fails the same way, which
    is the point -- what a non-string key must do is behave exactly like the string
    it equals, and that is what the driver asserts."""

    def go():
        del builtins.__dict__[CustomStr("iter")]

    return _caught_kind(go)


def del_string_key_cold():
    """The STRING control for del_non_string_key: same key, same coldness."""

    def go():
        del builtins.__dict__["iter"]

    return _caught_kind(go)


def set_non_string_key_on_instance():
    class C:
        pass

    def go():
        C().__dict__[CustomStr("x")] = 1
        return "no raise"

    return _caught(go)


def string_keys_still_work():
    """The guard must not disturb ordinary string-keyed traffic."""
    d = sys.modules[__name__].__dict__
    d["probe_str_key"] = "v"
    got = (d["probe_str_key"], "probe_str_key" in d, d.get("probe_str_key"))
    del d["probe_str_key"]
    return got
