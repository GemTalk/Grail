"""Fixture: a built-in function refuses a keyword it does not take, as CPython's does.

CPython's built-ins check their keywords against their signatures: one that
takes none says so (``getattr() takes no keyword arguments``), and one that
takes some names the stranger (``sum() got an unexpected keyword argument
'x'``).  Grail's keyword-taking built-ins read the keywords they knew and
DROPPED the rest, so a misspelt keyword was an ignored argument: ``sum([],
x=1)`` answered 0, ``print(x=1)`` printed an empty line, ``getattr(1, 'real',
default=0)`` ignored its default and ``input(prompt='> ')`` read a line with
no prompt.

Each refusal is checked by type and message, and each built-in also still
takes the keywords its signature does name.  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

import os

r = {}


def refusal(call):
    try:
        call()
    except TypeError as exc:
        return str(exc)
    return 'no TypeError'


r['no_keyword_at_all'] = [
    refusal(lambda: getattr(1, 'real', x=1)),
    refusal(lambda: getattr(1, 'real', default=0)),
    refusal(lambda: input(x=1)),
    refusal(lambda: input(prompt='')),
]
r['unexpected_keyword'] = [
    refusal(lambda: sum([], x=1)),
    refusal(lambda: sorted([], x=1)),
    refusal(lambda: round(1.5, x=1)),
    refusal(lambda: pow(2, 3, x=1)),
    refusal(lambda: print(x=1)),
    refusal(lambda: eval('1', x=1)),
    refusal(lambda: exec('1', x=1)),
    refusal(lambda: compile('1', 'f', 'eval', x=1)),
    refusal(lambda: open(os.devnull, x=1)),
]
r['positional_only_by_name'] = [
    refusal(lambda: sum([1], iterable=1)),
    refusal(lambda: eval('1', source='x')),
    refusal(lambda: sorted([1], iterable=1)),
]
r['refusals_that_already_held'] = [
    refusal(lambda: dir(x=1)),
    refusal(lambda: vars(x=1)),
    refusal(lambda: filter(None, [], x=1)),
]

namespace = {}
exec('a = 1', globals=namespace)
with open(os.devnull, mode='rb', buffering=0) as devnull:
    opened = devnull.read()
r['named_keywords_still_taken'] = [
    sum([1], start=1),
    sorted([2, 1, 3], key=None, reverse=True),
    round(number=1.25, ndigits=1),
    pow(base=2, exp=5, mod=10),
    eval('a', globals={'a': 3}),
    namespace['a'],
    type(compile(source='1', filename='f', mode='eval', _feature_version=-1)).__name__,
    opened,
]

EXPECTED = {
    'no_keyword_at_all': [
        'getattr() takes no keyword arguments',
        'getattr() takes no keyword arguments',
        'input() takes no keyword arguments',
        'input() takes no keyword arguments',
    ],
    'unexpected_keyword': [
        "sum() got an unexpected keyword argument 'x'",
        "sort() got an unexpected keyword argument 'x'",
        "round() got an unexpected keyword argument 'x'",
        "pow() got an unexpected keyword argument 'x'",
        "print() got an unexpected keyword argument 'x'",
        "eval() got an unexpected keyword argument 'x'",
        "exec() got an unexpected keyword argument 'x'",
        "compile() got an unexpected keyword argument 'x'",
        "open() got an unexpected keyword argument 'x'",
    ],
    'positional_only_by_name': [
        "sum() got an unexpected keyword argument 'iterable'",
        "eval() got an unexpected keyword argument 'source'",
        "sort() got an unexpected keyword argument 'iterable'",
    ],
    'refusals_that_already_held': [
        'dir() takes no keyword arguments',
        'vars() takes no keyword arguments',
        'filter() takes no keyword arguments',
    ],
    'named_keywords_still_taken': [2, [3, 2, 1], 1.2, 2, 3, 1, 'code', b''],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-27s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
