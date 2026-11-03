"""Fixture: str's methods called through the type work on a lone-surrogate str.

``str.islower(s)'' is ``s.islower()'' in CPython: the type's method_descriptor
takes any str as its first argument, lone surrogates included, and
test_str's test_surrogates calls the case predicates exactly that way.

Grail ran str's compiled method on the receiver, and a str holding a lone
surrogate is no Character string, so the method died on a
MessageNotUnderstood no Python code can catch -- or refused with
NotImplementedError where the bound call answered.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return ascii(thunk())
    except Exception as e:
        return type(e).__name__


LOWER = ('a\uD800b\uDFFF', 'a\uDFFFb\uD800', 'a\uD800b\uDFFFa', 'a\uDFFFb\uD800a')
UPPER = ('A\uD800B\uDFFF', 'A\uDFFFB\uD800', 'A\uD800B\uDFFFA', 'A\uDFFFB\uD800A')
ALONE = ('\uD800', '\uDFFF', '\uD800\uD800', '\uDFFF\uDFFF')
CASE = ('islower', 'isupper', 'istitle')
CLASSES = ('isalpha', 'isalnum', 'isdigit', 'isspace', 'isdecimal', 'isnumeric',
           'isidentifier', 'isprintable', 'isascii')

r['case_of_lowercase'] = [[outcome(lambda: getattr(str, m)(s)) for m in CASE] for s in LOWER]
r['case_of_uppercase'] = [[outcome(lambda: getattr(str, m)(s)) for m in CASE] for s in UPPER]
r['case_of_surrogates_alone'] = [[outcome(lambda: getattr(str, m)(s)) for m in CASE] for s in ALONE]
r['classes_of_surrogates'] = [outcome(lambda: getattr(str, m)(s)) for m in CLASSES for s in ALONE + LOWER]

s = 'a\uD800 b'
r['the_rest_through_the_type'] = [
    outcome(lambda: str.upper(s)), outcome(lambda: str.replace(s, 'a', 'x')),
    outcome(lambda: str.split(s)), outcome(lambda: str.title(s)),
    outcome(lambda: str.find(s, 'b')), outcome(lambda: str.encode(s, 'utf-8', 'surrogatepass'))]
r['the_same_as_bound'] = r['the_rest_through_the_type'] == [
    outcome(lambda: s.upper()), outcome(lambda: s.replace('a', 'x')), outcome(lambda: s.split()),
    outcome(lambda: s.title()), outcome(lambda: s.find('b')),
    outcome(lambda: s.encode('utf-8', 'surrogatepass'))]


class Shouting(str):
    def upper(self):
        return 'shouted'


r['a_subclass_def_still_runs'] = outcome(lambda: Shouting.upper('quiet'))

EXPECTED = {
    'case_of_lowercase': [['True', 'False', 'False']] * 4,
    'case_of_uppercase': [['False', 'True', 'True']] * 4,
    'case_of_surrogates_alone': [['False', 'False', 'False']] * 4,
    'classes_of_surrogates': ['False'] * 72,
    'the_rest_through_the_type': ["'A\\ud800 B'", "'x\\ud800 b'", "['a\\ud800', 'b']",
                                  "'A\\ud800 B'", '3', "b'a\\xed\\xa0\\x80 b'"],
    'the_same_as_bound': True,
    'a_subclass_def_still_runs': "'shouted'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
