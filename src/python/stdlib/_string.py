"""string helper module

GRAIL: CPython implements this module in C, in
Objects/stringlib/unicode_format.h, for string.Formatter.  This is a direct
port of the four routines it uses -- MarkupIterator_next, parse_field,
field_name_split and FieldNameIterator_next -- with the same results and the
same ValueError messages, so CPython's pure-Python string.Formatter runs
unchanged over it.  Errors surface lazily, while iterating, as they do there.
"""

__all__ = ['formatter_field_name_split', 'formatter_parser']

_PY_SSIZE_T_MAX = 2 ** 63 - 1


def formatter_parser(format_string):
    """Iterate over the parts of a format string.

    Each item is (literal_text, field_name, format_spec, conversion).
    field_name and format_spec are None for a part without a replacement
    field, format_spec is '' for a field that has none, and conversion is
    None unless given.
    """
    if not isinstance(format_string, str):
        raise TypeError('expected str, got %s' % type(format_string).__name__)
    return _formatter_iterator(format_string)


def _formatter_iterator(s):
    end = len(s)
    pos = 0
    while pos < end:
        part, pos = _markup_next(s, pos, end)
        yield part


def _markup_next(s, pos, end):
    # MarkupIterator_next: literal text up to the end of the string, an
    # escaped brace, or an unescaped '{'.  An escaped brace ends the literal
    # WITH one brace in it and no field; the next call resumes after the pair.
    start = pos
    c = ''
    markup_follows = False
    while pos < end:
        c = s[pos]
        pos += 1
        if c == '{' or c == '}':
            markup_follows = True
            break
    at_end = pos >= end
    length = pos - start
    if c == '}' and (at_end or s[pos] != c):
        raise ValueError("Single '}' encountered in format string")
    if at_end and c == '{':
        raise ValueError("Single '{' encountered in format string")
    if not at_end:
        if s[pos] == c:
            pos += 1
            markup_follows = False
        else:
            length -= 1
    literal = s[start:start + length]
    if not markup_follows:
        return (literal, None, None, None), pos
    field_name, format_spec, conversion, pos = _parse_field(s, pos, end)
    return (literal, field_name, format_spec, conversion), pos


def _parse_field(s, pos, end):
    # parse_field: the name runs to '}', ':' or '!' (a '[...]' may hold any of
    # those); then an optional conversion, then a format spec whose nested
    # braces are counted.
    c = ''
    name_start = pos
    while pos < end:
        c = s[pos]
        pos += 1
        if c == '{':
            raise ValueError("unexpected '{' in field name")
        if c == '[':
            while pos < end and s[pos] != ']':
                pos += 1
            continue
        if c == '}' or c == ':' or c == '!':
            break
    field_name = s[name_start:pos - 1]
    conversion = None
    if c == '!' or c == ':':
        if c == '!':
            if pos >= end:
                raise ValueError('end of string while looking for conversion '
                                 'specifier')
            conversion = s[pos]
            pos += 1
            if pos < end:
                c = s[pos]
                pos += 1
                if c == '}':
                    return field_name, '', conversion, pos
                if c != ':':
                    raise ValueError("expected ':' after conversion specifier")
        spec_start = pos
        count = 1
        while pos < end:
            c = s[pos]
            pos += 1
            if c == '{':
                count += 1
            elif c == '}':
                count -= 1
                if count == 0:
                    return field_name, s[spec_start:pos - 1], conversion, pos
        raise ValueError("unmatched '{' in format spec")
    if c != '}':
        raise ValueError("expected '}' before end of string")
    return field_name, '', conversion, pos


def _get_integer(text):
    # get_integer: -1 unless every character is a decimal digit.
    if not text:
        return -1
    accumulator = 0
    for ch in text:
        if not ch.isdecimal():
            return -1
        digit = int(ch)
        if accumulator > (_PY_SSIZE_T_MAX - digit) // 10:
            raise ValueError('Too many decimal digits in format string')
        accumulator = accumulator * 10 + digit
    return accumulator


def formatter_field_name_split(field_name):
    """Split a field name into its first part and an iterator of the rest.

    The first part is an int when it is all decimal digits.  Each later item
    is (is_attribute, key): True and a name for ``.name``, False and an index
    or key for ``[key]`` (an int when all decimal digits).
    """
    if not isinstance(field_name, str):
        raise TypeError('expected str, got %s' % type(field_name).__name__)
    end = len(field_name)
    i = 0
    while i < end and field_name[i] != '.' and field_name[i] != '[':
        i += 1
    first = field_name[:i]
    first_idx = _get_integer(first)
    return (first if first_idx == -1 else first_idx,
            _field_name_iterator(field_name, i, end))


def _field_name_iterator(s, i, end):
    # FieldNameIterator_next.
    while i < end:
        c = s[i]
        i += 1
        if c == '.':
            start = i
            while i < end and s[i] != '.' and s[i] != '[':
                i += 1
            name = s[start:i]
            is_attribute = True
            index = -1
        elif c == '[':
            start = i
            bracket_seen = False
            while i < end:
                ch = s[i]
                i += 1
                if ch == ']':
                    bracket_seen = True
                    break
            if not bracket_seen:
                raise ValueError("Missing ']' in format string")
            name = s[start:i - 1]
            is_attribute = False
            index = _get_integer(name)
        else:
            raise ValueError("Only '.' or '[' may follow ']' in format field "
                             "specifier")
        if not name:
            raise ValueError('Empty attribute in format string')
        yield (is_attribute, name if index == -1 else index)
