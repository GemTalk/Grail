"""Reading a module attribute must not run the dict protocol underneath it.

Grail's modules are Smalltalk objects: a module IS a SymbolDictionary, and the
attribute read resolved a unary selector by walking the whole superclass chain --
SymbolDictionary, IdentityDictionary, KeyValueDictionary, AbstractDictionary,
Collection, Object -- and PERFORMING whatever it found.  Those classes carry the
env-1 Python dict protocol, against the module's own storage.

So a plain `hasattr` destroyed a module:

    hasattr(json, 'clear')    -> True, and emptied json for the rest of the
                                 session; json.JSONEncoder then raised
                                 AttributeError, surviving abort and
                                 importlib resetSessionForReinstall
    hasattr(json, 'popitem')  -> deleted an entry, and once clear() had run,
                                 raised KeyError: popitem(): dictionary is empty

and keys/values/items/copy answered the dict's view of the module.  This is
reachable from ordinary introspection: inspect.getmembers and pydoc walk module
namespaces (#1233).

STILL OUTSTANDING, and deliberately not asserted here because Grail and CPython
still disagree: `update`, `pop`, `setdefault` and `get` take arguments, so an
earlier branch of the read answers a function handle for them.  That is wrong --
CPython raises AttributeError -- but it does not perform anything, so it damages
nothing.  Reading `sys.breakpoint` still halts the gem, a module's body still owns
the plain selector `initialize`, and an unlisted module-side category is still
performed by default.

Every expectation here was measured against CPython 3.14.
"""

import json
import textwrap

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


# The dict-protocol names that were PERFORMED against the module's storage.
# Every one of these resolved above `module`, to KeyValueDictionary.
PERFORMED = ['clear', 'popitem', 'keys', 'values', 'items', 'copy']


def _visible(module, names):
    return [n for n in names if hasattr(module, n)]


def _error(fn):
    try:
        return fn()
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ----------------------------------------------------------- the defect

check('no_inherited_dict_method_is_a_module_attribute',
      (_visible(json, PERFORMED), _visible(textwrap, PERFORMED)), ([], []))
check('getattr_raises_attribute_error_for_each',
      [_error(lambda n=n: getattr(json, n))[0] for n in PERFORMED],
      ['AttributeError'] * len(PERFORMED))

# Reading them all, in the order that used to empty the module and then raise
# KeyError on the empty dict, must leave the module whole.
check('the_module_survives_reading_every_one',
      (lambda _: (hasattr(json, 'JSONEncoder'), hasattr(json, 'dumps'),
                  json.dumps({'a': 1})))(_visible(json, PERFORMED)),
      (True, True, '{"a": 1}'))
check('and_textwrap_too',
      (lambda _: (hasattr(textwrap, 'dedent'), textwrap.dedent('  x')))(
          _visible(textwrap, PERFORMED)),
      (True, 'x'))

# ----------------------------------------------------------- unchanged

check('a_modules_own_names_still_read',
      (json.__name__, textwrap.__name__, callable(json.dumps),
       callable(textwrap.dedent)),
      ('json', 'textwrap', True, True))
check('dunder_accessors_still_read',
      (isinstance(json.__name__, str), hasattr(json, '__doc__')), (True, True))
check('a_missing_name_is_still_an_attribute_error',
      _error(lambda: getattr(json, 'no_such_attribute_at_all'))[0],
      'AttributeError')
check('hasattr_is_false_for_a_missing_name',
      hasattr(json, 'no_such_attribute_at_all'), False)
check('the_module_is_still_iterable_by_dir',
      ('dumps' in dir(json), 'dedent' in dir(textwrap)), (True, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
