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
#    that can kill the session from inside a builtin callback.  Grail cannot
#    STORE a non-string key, but it must refuse one as a catchable TypeError.

import builtins
import sys


def _caught(fn):
    try:
        return fn()
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)


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
    def go():
        del builtins.__dict__[CustomStr("iter")]
        return "no raise"

    return _caught(go)


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
