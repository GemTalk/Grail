# A raise from inside an f-string REPLACEMENT FIELD must be blamed on the
# failing expression, not on the whole literal.
#
# CPython gives ``f"value is {boom()} ok"'' the span of ``boom()''.  Grail
# re-parses each replacement field with a CHILD PythonParser over the field text
# alone -- that is what makes nested quotes and PEP 701 line breaks work -- so
# every node in the field reported a position relative to that snippet: line 1,
# column 1.  Those positions were therefore MARKED and excluded from the
# position map (AbstractNode>>___markFragmentPositions___), because a line-1
# span nested inside a true one wins the map's innermost-range contest and would
# blame line 1 of the file.  The frame fell back to the f-string node's own
# span: the whole literal.
#
# The positions were never wrong, only UNTRANSLATED.  The tokenizer now records,
# for each field, where it begins in BOTH coordinate systems (PythonToken >>
# fieldStarts) and the parser rebases the child parse onto the module. That is
# sound because inside a field the tokenizer keeps the text VERBATIM -- escapes
# are not decoded -- so value indices and source offsets differ by a constant
# across it; between fields they do not, which is why the anchor is recorded as
# each field is scanned rather than derived afterwards.
#
# Every case below is measured from CPython.

import traceback


def boom():
    raise ValueError("boom")


def simple():
    try:
        return f"value is {boom()} ok"                       # line 33
    except Exception as e:
        return e


def two_fields():
    try:
        return f"{1} and {boom()} and {3}"                   # line 40
    except Exception as e:
        return e


def escaped_before():
    # A decoded escape BEFORE the field shifts value indices against source
    # offsets -- the anchor is recorded during the scan, so it is unaffected.
    try:
        return f"a\tb\n{boom()} tail"                        # line 49
    except Exception as e:
        return e


def nested_quotes():
    try:
        return f"{' '.join([boom()])}"                       # line 56
    except Exception as e:
        return e


def adjacent_concat():
    try:
        return f"one {1}" f"two {boom()}"                    # line 63
    except Exception as e:
        return e


def with_format_spec():
    try:
        return f"{boom():>10}"                               # line 70
    except Exception as e:
        return e


def nested_field_in_spec():
    w = 4
    try:
        return f"{boom():{w}}"                               # line 78
    except Exception as e:
        return e


def debug_equals():
    try:
        return f"{boom()=}"                                  # line 85
    except Exception as e:
        return e


def raw_fstring():
    try:
        return rf"\d {boom()}"                               # line 92
    except Exception as e:
        return e


def _span(fn):
    f = traceback.extract_tb(fn().__traceback__)[0]
    return repr([f.lineno, f.colno, f.end_colno])


r = {}
r['simple'] = _span(simple)
r['two_fields'] = _span(two_fields)
r['escaped_before'] = _span(escaped_before)
r['nested_quotes'] = _span(nested_quotes)
r['adjacent_concat'] = _span(adjacent_concat)
r['with_format_spec'] = _span(with_format_spec)
r['nested_field_in_spec'] = _span(nested_field_in_spec)
r['debug_equals'] = _span(debug_equals)
r['raw_fstring'] = _span(raw_fstring)


EXPECTED = {
    'adjacent_concat': '[63, 33, 39]',
    'debug_equals': '[85, 18, 24]',
    'escaped_before': '[49, 24, 30]',
    'nested_field_in_spec': '[78, 18, 24]',
    'nested_quotes': '[56, 28, 34]',
    'raw_fstring': '[92, 22, 28]',
    'simple': '[33, 27, 33]',
    'two_fields': '[40, 26, 32]',
    'with_format_spec': '[70, 18, 24]',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
