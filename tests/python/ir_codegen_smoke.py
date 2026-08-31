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
}

ALL_OK = all(RESULTS.values())

print("ir_codegen_smoke RESULTS:", RESULTS)
print("ir_codegen_smoke ALL_OK:", ALL_OK)
