"""Phases for tests/scripts/run_module_globals_test.sh.

A change a program makes to a module that ships with Grail is the program's
own, as in CPython: it is not committed, and the next session sees the module
as shipped (docs/Persistent_Modules_and_Classes.md D14).

    grail session_globals.py change    # change stdlib modules, then commit
    grail session_globals.py check     # a new session sees none of it

Grail-only (gemdb), so this is not a tests/python fixture.
"""
import sys

import csv
import fnmatch
import gc

import durable
import gemdb

failures = []


def check(label, ok):
    print(('  PASS  ' if ok else '  FAIL  ') + label)
    if not ok:
        failures.append(label)


def change():
    # Deploy first, so every store below is to a committed module.
    gemdb.commit()
    original_fnmatchcase = fnmatch.fnmatchcase

    # The incident this guards: a stress script's durable._registry = ...
    # was committed into durable and broke every later gem of the user.
    durable._registry = lambda: {'patched': 'run'}
    durable.session_probe = 'set by the first session'
    fnmatch.fnmatchcase = lambda name, pat: 'patched'
    csv.field_size_limit(777)       # a `global` store inside csv
    gc.disable()                    # likewise, in Grail's gc
    del durable.LEASE_SECONDS       # a delete

    check('the session sees its own attribute',
          durable.session_probe == 'set by the first session')
    check('vars() lists it', 'session_probe' in vars(durable))
    check('the module calls the patched function',
          durable.runs() == ['run'])
    check('a call inside the module sees the patch',
          fnmatch.fnmatch('a.py', '*.py') == 'patched')
    check('a function sees its own global store', csv.field_size_limit() == 777)
    check('gc.disable() holds', not gc.isenabled())
    check('the delete holds', not hasattr(durable, 'LEASE_SECONDS')
          and 'LEASE_SECONDS' not in vars(durable))
    check('none of it needs a commit', not gemdb.needs_commit())

    fnmatch.fnmatchcase = original_fnmatchcase
    check('restoring the patch restores the module',
          fnmatch.fnmatch('a.py', '*.py') is True
          and fnmatch.fnmatchcase is original_fnmatchcase)
    fnmatch.fnmatchcase = lambda name, pat: 'patched'

    # Commit something real, so the session's changes had every chance to go.
    gemdb.root['module_globals_test'] = 1
    gemdb.commit()
    check('the changes survive the commit in this session',
          durable.session_probe == 'set by the first session'
          and csv.field_size_limit() == 777)


def check_fresh():
    check('a new session has no attribute', not hasattr(durable, 'session_probe'))
    check('a new session has the real durable._registry',
          durable._registry.__name__ == '_registry')
    check('a new session calls the real function',
          fnmatch.fnmatch('a.py', '*.py') is True)
    check('a new session has the shipped global', csv.field_size_limit() == 131072)
    check('a new session has gc enabled', gc.isenabled())
    check('a new session still has the deleted global',
          durable.LEASE_SECONDS == 30.0)
    # The first session deployed durable, and importlib stamped builtins'
    # __dict__ into it as __builtins__.  That must be this session's
    # builtins.__dict__ too, not the deploying session's view.
    import builtins
    check("a deployed module's __builtins__ is this session's builtins.__dict__",
          durable.__builtins__ is builtins.__dict__)
    gemdb.root.pop('module_globals_test', None)
    gemdb.commit()


if __name__ == '__main__':
    {'change': change, 'check': check_fresh}[sys.argv[1]]()
    print('module-globals %s: %s' % (sys.argv[1],
                                     'FAIL' if failures else 'PASS'))
    sys.exit(1 if failures else 0)
