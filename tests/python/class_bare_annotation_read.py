"""Fixture: a bare ``x: int`` in a class body binds nothing, so a later read is the enclosing scope's.

CPython's class body looks every name up in its own namespace and then in
globals.  A bare annotation stores nothing, so reading the name afterwards
finds the module global when there is one and is a NameError otherwise.
Grail declared the name as one of the class body's own variables, so the
read compiled to a temp the class body did not have: the class failed to
compile with ``undefined symbol x`` (a SystemError) instead.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses

r = {}


def outcome(source):
    ns = {}
    try:
        exec(source, ns)
        return ns.get('result', 'no error')
    except NameError as e:
        return 'NameError: ' + str(e)
    except Exception as e:
        return type(e).__name__


r['no_global'] = [outcome("class D:\n    x: int\n    print(x)\n"),
                  outcome("class D:\n    x: int\n    y = x\n"),
                  outcome("def f():\n    class D:\n        x: int\n        y = x\nf()\n")]
r['global_found'] = outcome("x = 'g'\nclass D:\n    x: int\n    y = x\nresult = D.y\n")
r['bound_later'] = outcome("class D:\n    x: int\n    x = 3\n    y = x\nresult = (D.x, D.y)\n")
r['function_local'] = outcome("def f():\n    x: int\n    return x\nf()\n")


@dataclasses.dataclass
class Point:
    x: int
    y: int = 0


class Annotated:
    a: int
    b: str = 'b'


r['dataclass'] = [Point(1).x, Point(1, 2).y, [f.name for f in dataclasses.fields(Point)]]
r['class_annotations'] = [Annotated.__annotations__, hasattr(Annotated, 'a'), Annotated.b]

EXPECTED = {
    'no_global': ["NameError: name 'x' is not defined"] * 3,
    'global_found': 'g',
    'bound_later': (3, 3),
    'function_local': "NameError: cannot access local variable 'x' where it is not associated with a value",
    'dataclass': [1, 2, ['x', 'y']],
    'class_annotations': [{'a': int, 'b': str}, False, 'b'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-18s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
