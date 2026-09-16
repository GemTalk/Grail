"""Fixture: a nested def whose NAME lands at module scope.

``global f`` followed by ``def f(): ...`` inside a function does not bind a
local at all: the def STATEMENT stores the closure on the module, and every
other scope sees it from then on.  The closure itself is ordinary -- what
differs is only where its name is put.

THE IR PATH REFUSED IT TWICE OVER, and the second refusal is the interesting
one.  Dropping the ``moduleScopeTarget`` guard alone moved all three corpus
sites to ``nestedDef:nameNotLocal`` and gained nothing: the def's name is not a
local precisely BECAUSE it is a module name, so the very next guard caught it.
A +0 net that only a row-by-row diff makes visible.

A DECORATED module-scope def is deliberately still refused, under its own
census row.  printSmalltalkOn: re-stores the module binding for each decorator
step and reads it back between them, which is a different emit from the
leaf-based decorator tail -- a separate shape rather than a harder one, and
none of the corpus's four sites is decorated.  It is here so the fixture covers
what still refuses as well as what no longer does; both paths answer the same
thing for it.

``the_module_sees_*`` call the created functions from MODULE scope afterwards,
which is the check a store into a method temp could not pass.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def defines_a_global_function():
    global made_global

    def made_global():
        return 'from the global def'

    return made_global()


def redefines_it():
    global made_global

    def made_global():
        return 'second definition'

    return made_global()


def _tag(fn):
    fn.tagged = True
    return fn


def defines_a_decorated_global():
    global decorated_global

    @_tag
    def decorated_global():
        return 'decorated'

    return decorated_global(), decorated_global.tagged


class H:
    def a_method_defining_a_global(self):
        global from_a_method

        def from_a_method():
            return 'defined in a method'

        return from_a_method()


record('defines_a_global_function', defines_a_global_function)
record('the_module_sees_it', lambda: made_global())
record('redefines_it', redefines_it)
record('the_module_sees_the_redefinition', lambda: made_global())
record('defines_a_decorated_global', defines_a_decorated_global)
record('a_method_defining_a_global', H().a_method_defining_a_global)
record('the_module_sees_the_method_one', lambda: from_a_method())
record('the_name_is_in_globals', lambda: 'made_global' in globals())

EXPECTED = {
    'defines_a_global_function': 'from the global def',
    'the_module_sees_it': 'from the global def',
    'redefines_it': 'second definition',
    'the_module_sees_the_redefinition': 'second definition',
    'defines_a_decorated_global': ('decorated', True),
    'a_method_defining_a_global': 'defined in a method',
    'the_module_sees_the_method_one': 'defined in a method',
    'the_name_is_in_globals': True,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-34s is not in EXPECTED' % ('FAIL', extra))
