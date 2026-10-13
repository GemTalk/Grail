# Regression fixture: os.environ is an os._Environ, and a MutableMapping.
#
# CPython's os.environ is an instance of os._Environ, a MutableMapping
# subclass.  Grail's is a Smalltalk class (os_Environ) that had no name in
# the os module, so ``os._Environ'' was an AttributeError.  rich's pretty
# printer names it at import time, and every rich module failed: 17 of pip's
# submodules in the package census.  The same class also lacked part of the
# MutableMapping protocol: update() with keywords or pairs, popitem(), the
# PEP 584 operators, and an __eq__ that compares by items.
# Expected values are what CPython 3.14 answers.

import collections.abc
import os

RESULTS = {}


def check(name, fn):
    """RESULTS[name] = fn(), or False when fn raises."""
    try:
        RESULTS[name] = fn()
    except Exception:
        RESULTS[name] = False


check('type_is_exported', lambda: type(os.environ) is os._Environ)
check('type_names', lambda: (
    os._Environ.__name__ == '_Environ' and os._Environ.__module__ == 'os'))
check('is_mutable_mapping', lambda: (
    isinstance(os.environ, collections.abc.MutableMapping)
    and isinstance(os.environ, collections.abc.Mapping)))
check('rich_style_type_test', lambda: (
    isinstance(os.environ, (dict, os._Environ))
    and not isinstance({}, os._Environ)))


def update_forms():
    os.environ.update(GRAIL_ENVM_KW='kw')
    os.environ.update([('GRAIL_ENVM_PAIR', 'pair')])
    os.environ.update({'GRAIL_ENVM_MAP': 'map'}, GRAIL_ENVM_BOTH='both')
    os.environ.update()
    return (os.environ['GRAIL_ENVM_KW'], os.environ['GRAIL_ENVM_PAIR'],
            os.environ['GRAIL_ENVM_MAP'], os.environ['GRAIL_ENVM_BOTH']) == (
                'kw', 'pair', 'map', 'both')


check('update_forms', update_forms)


def merge_operators():
    os.environ['GRAIL_ENVM_OR'] = 'mine'
    left = os.environ | {'GRAIL_ENVM_OR': 'theirs', 'GRAIL_ENVM_NEW': 'n'}
    right = {'GRAIL_ENVM_OR': 'theirs'} | os.environ
    return (type(left) is dict and type(right) is dict
            and left['GRAIL_ENVM_OR'] == 'theirs'
            and right['GRAIL_ENVM_OR'] == 'mine'
            and 'GRAIL_ENVM_NEW' not in os.environ)


check('merge_operators', merge_operators)


def merge_with_a_non_mapping():
    try:
        os.environ | [('A', 'b')]
    except TypeError:
        return os.environ.__or__([('A', 'b')]) is NotImplemented
    return False


check('merge_with_a_non_mapping', merge_with_a_non_mapping)


def inplace_merge():
    env = os.environ
    env |= {'GRAIL_ENVM_IOR': 'ior'}
    return env is os.environ and os.environ['GRAIL_ENVM_IOR'] == 'ior'


check('inplace_merge', inplace_merge)


def popitem():
    saved = dict(os.environ)
    name, value = os.environ.popitem()
    gone = name not in os.environ and saved[name] == value
    os.environ[name] = value
    return gone and name in os.environ


check('popitem', popitem)
check('equality', lambda: (
    os.environ == dict(os.environ)
    and not (os.environ != dict(os.environ))
    and os.environ != {}
    and (os.environ == 3) is False))

for _name in ('GRAIL_ENVM_KW', 'GRAIL_ENVM_PAIR', 'GRAIL_ENVM_MAP',
              'GRAIL_ENVM_BOTH', 'GRAIL_ENVM_OR', 'GRAIL_ENVM_IOR'):
    os.environ.pop(_name, None)

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
