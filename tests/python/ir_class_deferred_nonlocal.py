"""Fixture: a class body that declares ``nonlocal`` and reads the name LATER.

Inside an IR-built def, a class statement runs as a compiled-text helper, and
a ``nonlocal`` name reaches it as a reader block.  Methods read through that
block, by reference.  The helper ALSO copies the name into a temp once, on
entry, for the reads a class makes eagerly -- a base, an attribute's value.
Class-level code that runs LATER read that copy too: a lambda, a lazy
generator expression, and since PEP 649 every annotation.  So it saw the
binding as it was when the class statement ran.

``write_then_read`` has no deferred read and is the control: it must still be
compiled through IR, so the fix cannot pass by refusing every such class.
"""

from annotationlib import get_annotations, Format

r = {}


def write_then_read():
    x = 1

    class C:
        nonlocal x
        x = 2
        y = x
    return C.y, x


def lambda_after_enclosing_changes():
    x = 1

    class C:
        nonlocal x

        def get(self):
            return x
        grab = lambda: x
    x = 5
    return C().get(), C.grab()


def lambda_bound_only_after():
    class C:
        nonlocal later
        grab = lambda: later
    later = 'set after'
    return C.grab()


def genexp_after_enclosing_changes():
    x = 1

    class C:
        nonlocal x
        lazy = (x for _ in range(1))
    x = 7
    return list(C.lazy)


def annotation_forward_ref():
    class Demo:
        nonlocal later
        x: later
    refs = get_annotations(Demo, format=Format.FORWARDREF)
    later = list
    return refs['x'].__forward_arg__, refs['x'].evaluate()


for _name, _fn in [('write_then_read', write_then_read),
                   ('lambda_after_enclosing_changes', lambda_after_enclosing_changes),
                   ('lambda_bound_only_after', lambda_bound_only_after),
                   ('genexp_after_enclosing_changes', genexp_after_enclosing_changes),
                   ('annotation_forward_ref', annotation_forward_ref)]:
    try:
        r[_name] = repr(_fn())
    except BaseException as e:
        r[_name] = type(e).__name__ + ': ' + str(e)


EXPECTED = {
    'write_then_read': '(2, 2)',
    'lambda_after_enclosing_changes': '(5, 5)',
    'lambda_bound_only_after': "'set after'",
    'genexp_after_enclosing_changes': '[7]',
    'annotation_forward_ref': "('later', <class 'list'>)",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        print('%-32s %s %r' % (k, 'OK ' if r[k] == EXPECTED[k] else 'DIFF', r[k]))
