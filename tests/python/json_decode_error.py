"""Fixture for JsonDecodeErrorTestCase.

``json.JSONDecodeError`` used to be an ALIAS for ValueError:

    self at: #JSONDecodeError put: ValueError

so ``except json.JSONDecodeError`` caught every ValueError in the program,
and the five documented attributes (msg, doc, pos, lineno, colno) did not
exist at all.

Worse, truncated input did not raise a Python exception of any kind.  The
parser indexed past the end of the document and raised a raw Smalltalk
OffsetError -- invisible to ``except json.JSONDecodeError``, to
``except ValueError``, and even to ``except Exception``.  ``'{'``, ``'['``,
``'nul'`` and ``'{"a"'`` all did this, which is exactly the shape of a
truncated HTTP response body.  ``'-'`` reached Number>>fromString: and
raised an ImproperOperation the same way.

CASES is the whole contract: every msg/pos/lineno/colno below is CPython
3.14's own answer, read off the interpreter.  report() evaluates it here, so
the test compares like with like and names the offending input on failure.
"""

import json
import json.decoder

CASES = [
    ("", "Expecting value", 0, 1, 1),
    ("   ", "Expecting value", 3, 1, 4),
    # Truncated containers -- these used to raise Smalltalk OffsetError.
    ("{", "Expecting property name enclosed in double quotes", 1, 1, 2),
    ("[", "Expecting value", 1, 1, 2),
    ("{\"a\"", "Expecting ':' delimiter", 4, 1, 5),
    ("[1,2", "Expecting ',' delimiter", 4, 1, 5),
    ("{\"a\":1", "Expecting ',' delimiter", 6, 1, 7),
    # Truncated literals -- also OffsetError before.
    ("nul", "Expecting value", 0, 1, 1),
    ("tru", "Expecting value", 0, 1, 1),
    ("fals", "Expecting value", 0, 1, 1),
    # A sign with no digits -- ImproperOperation before.
    ("-", "Expecting value", 0, 1, 1),
    ("[--1]", "Expecting value", 1, 1, 2),
    # Ordinary syntax errors.
    ("xx", "Expecting value", 0, 1, 1),
    ("{\"a\" 1}", "Expecting ':' delimiter", 5, 1, 6),
    ("{\"a\":}", "Expecting value", 5, 1, 6),
    ("{,}", "Expecting property name enclosed in double quotes", 1, 1, 2),
    ("{1:2}", "Expecting property name enclosed in double quotes", 1, 1, 2),
    ("[1 2]", "Expecting ',' delimiter", 3, 1, 4),
    ("1 2", "Extra data", 2, 1, 3),
    ("{} {}", "Extra data", 3, 1, 4),
    # Trailing commas are reported AT the comma.
    ("[1,]", "Illegal trailing comma before end of array", 2, 1, 3),
    ("[1,]  ", "Illegal trailing comma before end of array", 2, 1, 3),
    ("{\"a\":1,}", "Illegal trailing comma before end of object", 6, 1, 7),
    # Strings: unterminated is reported at the OPENING quote.
    ('"abc', "Unterminated string starting at", 0, 1, 1),
    ('"a\\q"', "Invalid \\escape", 2, 1, 3),
    ('"a\\u12"', "Invalid \\uXXXX escape", 3, 1, 4),
    # Multi-line documents exercise lineno/colno.
    ("  \n  {\"x\": tru}", "Expecting value", 11, 2, 9),
    ("[1, 2\n, ]", "Illegal trailing comma before end of array", 6, 2, 1),
]


def report():
    """'src|msg|pos|lineno|colno' per case -- compared against expected()."""
    lines = []
    for src, _, _, _, _ in CASES:
        try:
            json.loads(src)
            lines.append("%r|PARSED-OK" % src)
        except json.JSONDecodeError as e:
            lines.append("%r|%s|%s|%s|%s" % (src, e.msg, e.pos, e.lineno, e.colno))
        except Exception as e:
            lines.append("%r|WRONG-TYPE:%s" % (src, type(e).__name__))
    return "\n".join(lines)


def expected():
    return "\n".join("%r|%s|%s|%s|%s" % row for row in CASES)


def _valid_still_parses():
    return (
        json.loads('{"a": [1, 2.5, true, null, "x\\u0041"]}')
        == {"a": [1, 2.5, True, None, "xA"]}
    )


def probe():
    E = json.JSONDecodeError
    caught = None
    try:
        json.loads('{"a": }')
    except E as e:
        caught = e

    # A plain ValueError must NOT be caught by ``except JSONDecodeError``.
    overcaught = False
    try:
        try:
            raise ValueError("plain")
        except E:
            overcaught = True
    except ValueError:
        pass

    # ...but a JSONDecodeError IS still a ValueError.
    as_valueerror = None
    try:
        json.loads("nope")
    except ValueError as e:
        as_valueerror = type(e).__name__

    return {
        "matches_expected": report() == expected(),
        "report": report(),
        "is_not_valueerror": E is not ValueError,
        "is_valueerror_subclass": issubclass(E, ValueError),
        "name": E.__name__,
        "module": E.__module__,
        "decoder_is_same_class": json.decoder.JSONDecodeError is E,
        "str": str(caught),
        "args": caught.args,
        "doc": caught.doc,
        "overcaught_plain_valueerror": overcaught,
        "caught_as_valueerror": as_valueerror,
        "valid_json_still_parses": _valid_still_parses(),
    }
