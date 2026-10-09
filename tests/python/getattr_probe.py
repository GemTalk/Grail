# Regression fixture for #1214's getattr miss cost.
#
#  * getattr(obj, name, default) and hasattr(obj, name) no longer take a
#    raise-time frame snapshot for the miss they are probing (it is consumed
#    before anything could render it).  Everything a caller can observe must be
#    unchanged: the answers, a __getattr__ hook's answers, a property that
#    raises AttributeError for another name, nested probes, and -- once a probe
#    has returned -- an ordinary miss still carrying its "Did you mean"
#    suggestion and its frame locals.
#  * A class's __name__ / __module__ for the classes Grail names after a module
#    attribute now come from a table rather than a chain of string compares;
#    the answers must not move.
# Expected values are what CPython 3.14 answers.

import functools
import enum
import json
import numbers
import os
import sys
import traceback
import types

RESULTS = {}


class C:
    def __init__(self):
        self.blech = 1


class Hook:
    def __getattr__(self, name):
        if name.startswith('virt_'):
            return name[5:]
        raise AttributeError(name)


class Prop:
    @property
    def broken(self):
        return self.missing_inner      # AttributeError for ANOTHER name

    @property
    def nested(self):
        return getattr(self, 'also_missing', 'inner-default')


o = C()
RESULTS['getattr_default_on_miss'] = getattr(o, 'nope', 'D') == 'D'
RESULTS['getattr_hit'] = getattr(o, 'blech', 'D') == 1
RESULTS['hasattr_answers'] = (hasattr(o, 'blech'), hasattr(o, 'nope')) == (True, False)
RESULTS['getattr_hook'] = (getattr(Hook(), 'virt_x', 'D'), getattr(Hook(), 'zz', 'D'),
                           hasattr(Hook(), 'virt_y'), hasattr(Hook(), 'zz')) == ('x', 'D', True, False)
RESULTS['property_raising_another_name'] = (getattr(Prop(), 'broken', 'D'),
                                            hasattr(Prop(), 'broken')) == ('D', False)
RESULTS['nested_probe'] = getattr(Prop(), 'nested', 'outer') == 'inner-default'


def two_arg_getattr_raises():
    try:
        getattr(o, 'nope')
    except AttributeError as e:
        return (e.name, e.obj is o)
    return None


RESULTS['two_arg_getattr_raises'] = two_arg_getattr_raises() == ('nope', True)


def suggestion_after_probe():
    getattr(o, 'blich', None)          # a probe for the same name first
    hasattr(o, 'blich')
    try:
        o.blich
    except AttributeError as e:
        return traceback.format_exception_only(e)[-1].strip()


RESULTS['suggestion_after_probe'] = suggestion_after_probe() == (
    "AttributeError: 'C' object has no attribute 'blich'. Did you mean: 'blech'?")


def locals_after_probe():
    marker = 42
    getattr(o, 'nope', None)
    try:
        o.nope
    except AttributeError as e:
        tb = e.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        return tb.tb_frame.f_locals.get('marker')


RESULTS['frame_locals_after_probe'] = locals_after_probe() == 42


class U:
    """CPython un-hides an underscored candidate when the failed access came
    from inside the object's own method -- read from the innermost frame's
    ``self'', which Grail takes in the raise-time snapshot.  A probe for the
    same name just before must not leave that snapshot switched off."""

    def __init__(self):
        self._blech_ = 1

    def miss_after_probe(self):
        getattr(self, 'blech_', None)
        try:
            self.blech_
        except AttributeError as e:
            return traceback.format_exception(e)[-1].strip()


RESULTS['own_method_suggestion_after_probe'] = U().miss_after_probe() == (
    "AttributeError: 'U' object has no attribute 'blech_'. Did you mean: '_blech_'?")


def outside_miss():
    try:
        U().blech_
    except AttributeError as e:
        return traceback.format_exception(e)[-1].strip()


RESULTS['outside_miss_hides_underscored'] = outside_miss() == (
    "AttributeError: 'U' object has no attribute 'blech_'")

RESULTS['module_attr_identities'] = [
    (functools.partial.__name__, functools.partial.__module__),
    (enum.Enum.__name__, enum.Enum.__module__),
    (enum.IntFlag.__name__, enum.IntFlag.__module__),
    (json.JSONDecodeError.__name__, json.JSONDecodeError.__module__),
    (numbers.Real.__name__, numbers.Real.__module__),
    (types.TracebackType.__name__, types.CodeType.__name__, types.GenericAlias.__name__),
    (os.path.__name__,),
] == [
    ('partial', 'functools'), ('Enum', 'enum'), ('IntFlag', 'enum'),
    ('JSONDecodeError', 'json.decoder'), ('Real', 'numbers'),
    ('traceback', 'code', 'GenericAlias'), ('posixpath',)]
RESULTS['plain_class_names'] = (C.__name__, type(3).__name__, type([]).__name__,
                                type(sys.flags).__name__) == ('C', 'int', 'list', 'flags')

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
