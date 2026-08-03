"""Generate tests/python/pickle_oracle.py: exact CPython wire bytes per (case, protocol).

Run with the SAME CPython the vendored suite targets (3.14.4).  Each entry is
(name, expression-source, {protocol: bytes}); the expression is re-evaluated on
the Grail side so both sides build the value the same way.
"""
import pickle, sys

CASES = [
    # --- singletons -------------------------------------------------------
    ("none",            "None"),
    ("true",            "True"),
    ("false",           "False"),
    # --- ints: every width boundary that switches opcode ------------------
    ("int_0",           "0"),
    ("int_1",           "1"),
    ("int_neg1",        "-1"),
    ("int_255",         "255"),
    ("int_256",         "256"),
    ("int_65535",       "65535"),
    ("int_65536",       "65536"),
    ("int_2_31",        "2**31"),
    ("int_neg_2_31",    "-(2**31)"),
    ("int_2_64",        "2**64"),
    ("int_big",         "10**40"),
    # --- floats -----------------------------------------------------------
    ("float_0",         "0.0"),
    ("float_1_5",       "1.5"),
    ("float_neg",       "-2.75"),
    # --- str --------------------------------------------------------------
    ("str_empty",       "''"),
    ("str_ascii",       "'abc'"),
    ("str_unicode",     "'\\u00e9\\u3000x'"),
    ("str_long",        "'z' * 300"),
    # --- bytes / bytearray ------------------------------------------------
    ("bytes_empty",     "b''"),
    ("bytes_abc",       "b'abc'"),
    ("bytearray_abc",   "bytearray(b'abc')"),
    # --- tuples: TUPLE1/2/3 vs MARK+TUPLE ---------------------------------
    ("tuple_empty",     "()"),
    ("tuple_1",         "(1,)"),
    ("tuple_2",         "(1, 2)"),
    ("tuple_3",         "(1, 2, 3)"),
    ("tuple_4",         "(1, 2, 3, 4)"),
    ("tuple_nested",    "((1, 2), (3, 4))"),
    # --- list / dict ------------------------------------------------------
    ("list_empty",      "[]"),
    ("list_123",        "[1, 2, 3]"),
    ("list_nested",     "[[1], [2]]"),
    ("dict_empty",      "{}"),
    ("dict_1",          "{1: 2}"),
    ("dict_str",        "{'a': 1, 'b': 2}"),
    # --- set / frozenset --------------------------------------------------
    ("set_123",         "{1, 2, 3}"),
    ("frozenset_123",   "frozenset({1, 2, 3})"),
    # --- mixed / bool inside containers (the nesting that defeats a
    #     bool-only special case) -------------------------------------------
    ("tuple_bools",     "(True, False)"),
    ("list_bools",      "[True, False, None]"),
    ("dict_bool",       "{True: False}"),
    # --- shared reference: memo must emit GET the second time -------------
    ("shared",          "(lambda x: (x, x))([1, 2])"),
    # --- global reference by module+name ----------------------------------
    ("global_len",      "len"),
    # --- range / slice: their reductions name a builtin TYPE, and fix_imports
    #     rewrites range -> xrange for protocols < 3
    ("range_simple",    "range(10)"),
    ("range_step",      "range(0, 10, 2)"),
    ("range_iter_src",  "range(3)"),
    ("slice_full",      "slice(1, 9, 2)"),
]

PROTOCOLS = [0, 1, 2, 3, 4, 5]


def main():
    out = []
    out.append('"""CPython %s pickle wire-format oracle -- GENERATED, do not edit by hand.\n'
               % sys.version.split()[0])
    out.append("Regenerate with scratchpad/gen_oracle.py under the reference CPython.\n")
    out.append('Each entry: name -> (source, {protocol: expected_bytes}).\n"""\n\n')
    out.append("CPYTHON_VERSION = %r\n\n" % sys.version.split()[0])
    out.append("ORACLE = {\n")
    for name, src in CASES:
        value = eval(src)
        out.append("    %r: (%r, {\n" % (name, src))
        for proto in PROTOCOLS:
            try:
                data = pickle.dumps(value, proto)
            except Exception as e:
                out.append("        # protocol %d: %s: %s\n" % (proto, type(e).__name__, e))
                continue
            out.append("        %d: %r,\n" % (proto, data))
        out.append("    }),\n")
    out.append("}\n")
    sys.stdout.write("".join(out))


main()
