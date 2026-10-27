"""Fixture: a function's __annotations__ list its parameters in CPython's order.

CPython's __annotate__ for a function adds the regular parameters, then the
positional-only ones, then ``*args``, the keyword-only ones, ``**kwargs`` and
the return (Python/codegen.c, codegen_annotations_in_scope) -- regular before
positional-only, which is not the order they are written in.  Grail listed the
keyword-only parameters before ``*args``, and the positional-only ones first.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def everything(a: int, /, b: str, *args: float, c: bytes, **kw: list) -> None:
    pass


def keyword_only(x: int, *, y: str, z: float) -> bool:
    pass


def unannotated_mixed(a, /, b: int, *args, c, d: str, **kw: bytes):
    pass


r['everything'] = list(everything.__annotations__)
r['keyword_only'] = list(keyword_only.__annotations__)
r['unannotated_mixed'] = list(unannotated_mixed.__annotations__)
r['lambda_free'] = list((lambda a, b: None).__annotations__)

EXPECTED = {
    'everything': ['b', 'a', 'args', 'c', 'kw', 'return'],
    'keyword_only': ['x', 'y', 'z', 'return'],
    'unannotated_mixed': ['b', 'd', 'kw'],
    'lambda_free': [],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
