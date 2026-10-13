"""``from M import *`` skips a name M only declares ``global`` (#1416).

With no ``__all__``, a star import binds every public name in M's namespace.
A name that a function in M declares ``global`` but has not yet assigned is
not in that namespace, so CPython skips it.  Grail raised ``cannot import
name`` for it instead, because it lists M's names at parse time and that list
counts such a declaration.  python-dateutil's ``dateutil/tz/__init__.py``
(``from .tz import *``, with ``global parser`` inside ``tzstr.__init__``) died
on it.

The rows also pin what must not change: a name the module did bind during
import -- even through ``global`` -- is imported; underscore names are not;
a name bound later by calling the function is then visible on the module; an
``__all__`` that lists a missing name still raises; and an explicit ``from M
import name`` for an unbound name still raises ImportError.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

from pkg_star_global.guessed import *
import pkg_star_global.guessed as guessed

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


g = globals()
t('the star import succeeded', lambda: True)
t('a public name is imported', lambda: visible)
t('a global bound during import is imported', lambda: made)
t('the module and functions are imported', lambda: (Parser.__name__, load_rrule.__name__))
t('an unbound global is not imported (parser)', lambda: 'parser' in g)
t('an unbound global is not imported (rrule)', lambda: 'rrule' in g)
t('an underscore name is not imported', lambda: '_private' in g)
t('the module itself has no such attribute', lambda: hasattr(guessed, 'rrule'))
t('binding it later puts it on the module', lambda: (guessed.load_rrule(), guessed.rrule)[1])
t('...but not into the importer', lambda: 'rrule' in g)


def _listed_star():
    import pkg_star_global.uses_listed  # noqa: F401
    return 'imported'


def _explicit_unbound():
    try:
        from pkg_star_global.guessed import parser  # noqa: F401
    except ImportError as e:
        # The message ends with the module's path, which differs per checkout.
        return 'ImportError: ' + str(e).split(' (')[0]
    return 'imported'


t('an __all__ naming a missing name still raises', _listed_star)
t('an explicit import of an unbound global still raises', _explicit_unbound)


EXPECTED = {
    'the star import succeeded': 'True',
    'a public name is imported': "'visible'",
    'a global bound during import is imported': "'made during import'",
    'the module and functions are imported': "('Parser', 'load_rrule')",
    'an unbound global is not imported (parser)': 'False',
    'an unbound global is not imported (rrule)': 'False',
    'an underscore name is not imported': 'False',
    'the module itself has no such attribute': 'False',
    'binding it later puts it on the module': "'rrule'",
    '...but not into the importer': 'False',
    'an __all__ naming a missing name still raises': "AttributeError: module 'pkg_star_global.listed' has no attribute 'never_bound'",
    'an explicit import of an unbound global still raises': '"ImportError: cannot import name \'parser\' from \'pkg_star_global.guessed\'"',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
