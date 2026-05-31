# Fixture for ReSubCallableTestCase.
#
# `re.sub` / `pattern.sub` with a CALLABLE replacement.  A Grail Python
# callable (lambda / def) compiles to a 2-arg block
# ``[:positional :kwargs | ...]``; the SrePattern expansion helper used
# to call it with ``value: m`` (1 arg) and raised "block evaluated with
# 1 argument when 2 were expected".  werkzeug's cookie quoting does
# exactly this: ``_cookie_slash_re.sub(lambda m: _map[m.group()],
# value.encode())``.

import re


def sub_str_callable():
    return re.compile(r'[",;]').sub(lambda m: "X", 'a"b,c')


def sub_bytes_callable():
    return re.compile(rb'[",;]').sub(lambda m: b"X", b'a"b,c')


def sub_callable_uses_group():
    # The exact werkzeug cookie shape: the replacement reads m.group().
    mapping = {'"': '\\"', "\\": "\\\\"}
    return re.compile(r'["\\]').sub(lambda m: mapping[m.group()], 'a"b\\c')


def sub_named_def_callable():
    def repl(m):
        return m.group().upper()

    return re.compile(r"[a-c]").sub(repl, "abcDEF")


def subn_callable_counts():
    text, n = re.compile(r"\d").subn(lambda m: "#", "a1b2c3")
    return [text, n]
