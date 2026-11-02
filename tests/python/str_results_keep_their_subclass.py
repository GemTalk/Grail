"""Fixture: str(x) and ascii(x) answer what __str__ / __repr__ answered.

PyObject_Str answers a __str__'s result unchanged once it is a str, so a str
subclass instance stays one (Objects/object.c); str(subclass_instance) is
exact str only because str.__str__ itself answers an exact copy.
PyObject_ASCII answers an all-ASCII repr unchanged too (Objects/object.c:851)
and escapes only code points past 127.  Grail coerced every str() answer of a
str subclass down to exact str -- the overriding __str__'s too -- and ascii()
always rebuilt its answer.  test_str's test_conversion and test_ascii check
both.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class StrSubclass(str):
    pass


class WithStr:
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return self.value


class StrWithStr(str):
    def __new__(cls, value):
        self = str.__new__(cls, '')
        self.value = value
        return self

    def __str__(self):
        return self.value


class WithRepr:
    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return self.value


def described(value):
    return [type(value).__name__, str.__str__(value)]


r['str_of_a_subclass_instance'] = described(str(StrSubclass('abc')))
r['a_str_answering_a_subclass'] = described(str(WithStr(StrSubclass('abc'))))
r['a_str_subclass_answering_a_subclass'] = described(str(StrWithStr(StrSubclass('abc'))))
r['a_str_subclass_answering_str'] = described(str(StrWithStr('abc')))
r['a_subclass_constructor_answers_its_class'] = described(StrSubclass(WithStr(StrSubclass('abc'))))
r['a_subclass_constructor_takes_its_arguments_str'] = described(StrSubclass(StrWithStr('abc')))
r['ascii_of_an_ascii_repr'] = described(ascii(WithRepr(StrSubclass('<abc>'))))
r['ascii_escapes_past_127'] = [ascii(WithRepr('<\x7f\x80€>')), type(ascii(WithRepr(StrSubclass('€')))).__name__]

EXPECTED = {
    'str_of_a_subclass_instance': ['str', 'abc'],
    'a_str_answering_a_subclass': ['StrSubclass', 'abc'],
    'a_str_subclass_answering_a_subclass': ['StrSubclass', 'abc'],
    'a_str_subclass_answering_str': ['str', 'abc'],
    'a_subclass_constructor_answers_its_class': ['StrSubclass', 'abc'],
    'a_subclass_constructor_takes_its_arguments_str': ['StrSubclass', 'abc'],
    'ascii_of_an_ascii_repr': ['StrSubclass', '<abc>'],
    'ascii_escapes_past_127': ['<\x7f\\x80\\u20ac>', 'str'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
