"""Fixture: two name-resolution rules in code an exec() compiled.

  * ``global x; x = v`` writes the globals dict the exec was handed, and a
    function the exec defines can run long after the exec returned.  Grail
    wrote only the exec's own scope, so ``ns['x']`` kept its old value until a
    later exec reflected the scope back.
  * A comprehension's iteration variable is its own, even when the method
    around it can see an enclosing binding of the same name -- an enclosing
    function's local, or a generic class's type parameter.  Grail read that
    binding through the class's closure cell for every element.

Both were what test_type_params' name-collision tests hit (run_code is an
exec), and neither is specific to type parameters.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def run(source):
    namespace = {}
    exec(source, namespace)
    return namespace


after = run("""
x = 1
def outer():
    x = 'local'
    def inner():
        global x
        x = 2
    return inner
""")
after['outer']()()
r['global_store_after_exec'] = after['x']

generic = run("""
x = 1
def outer():
    def inner[x]():
        global x
        x = 2
    return inner
""")
generic['outer']()()
r['global_store_past_type_param'] = generic['x']

during = run("""
y = 1
def bump():
    global y
    y = y + 1
bump()
seen = y
""")
r['global_store_during_exec'] = [during['seen'], during['y']]

shared = run("""
def setter():
    global z
    z = 'set'
def getter():
    return z
""")
shared['setter']()
r['global_store_read_by_sibling'] = [shared['z'], shared['getter']()]

cell = run("""
def make():
    x = 0
    class C:
        def items(self):
            return [x for x in [1, 2]]
    return C
""")
r['comprehension_target_over_cell'] = cell['make']()().items()

type_param = run("""
class C[x]:
    def items(self):
        return [x for x in [1, 2]]

    def parameter(self):
        return [x for _ in [0]]
""")
r['comprehension_target_over_type_param'] = [
    type_param['C']().items(), type_param['C']().parameter() == [type_param['C'].__type_params__[0]]]

EXPECTED = {
    'global_store_after_exec': 2,
    'global_store_past_type_param': 2,
    'global_store_during_exec': [2, 2],
    'global_store_read_by_sibling': ['set', 'set'],
    'comprehension_target_over_cell': [1, 2],
    'comprehension_target_over_type_param': [[1, 2], True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
