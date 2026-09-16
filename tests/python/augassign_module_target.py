"""Fixture: ``global c; c += 1`` -- an augmented assignment to a MODULE name.

An augmented assignment is a read AND a write, and both halves have to land in
the same place.  With ``global`` in force there is no local to augment: the
parser strips a declared global from the scope's variables, so the IR path's
simple-local branch saw no local, its attribute/subscript branch saw no
attribute, and the statement fell through both and refused.

THE READ IS GUARDED AND THE WRITE IS NOT, which is the asymmetry that makes an
unbound global raise NameError instead of answering nil -- the one shape of
this statement that is an error rather than a value, and the reason the emit
cannot simply be "read it, apply the operator, store it".

THE RECEIVER DIFFERS BY SCOPE and is the other thing worth pinning: a top-level
def compiles to a method ON THE MODULE, so its ``self`` IS the module, while a
class method's is not.  Both shapes are here, and both must reach the same
binding -- ``module_sees_the_change`` reads it back from module scope after a
method has bumped it.

The two sites in the corpus are ``abc._bump_invalidation_counter``, whose whole
job is to invalidate caches by bumping a module counter, and ``test_sort``'s
``check``, which counts errors in a module global.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

counter = 0
total = 10
tag = 'a'
items = [1]
missing_later = 1


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def bump():
    global counter
    counter += 1
    return counter


def subtract():
    global total
    total -= 3
    return total


def concat():
    global tag
    tag += 'b'
    return tag


def in_place_extend():
    global items
    items += [2]
    return items


def unbound_global():
    global never_set_anywhere
    never_set_anywhere += 1
    return never_set_anywhere


class H:
    def a_method_bumping_a_global(self):
        global counter
        counter += 10
        return counter


record('bump_once', bump)
record('bump_twice', bump)
record('subtract', subtract)
record('concat', concat)
record('in_place_extend', in_place_extend)
record('a_method_bumping_a_global', H().a_method_bumping_a_global)
record('unbound_global', unbound_global)
record('module_sees_the_change', lambda: counter)

EXPECTED = {
    'bump_once': 1,
    'bump_twice': 2,
    'subtract': 7,
    'concat': 'ab',
    'in_place_extend': [1, 2],
    'a_method_bumping_a_global': 12,
    'unbound_global': "NameError: name 'never_set_anywhere' is not defined",
    'module_sees_the_change': 12,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-28s is not in EXPECTED' % ('FAIL', extra))
