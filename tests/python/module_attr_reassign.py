# A Python assignment to a data attribute of a module written in Smalltalk has
# to be what SMALLTALK reads back through the module's accessor too (issues
# #1953 and #1954).
#
# These modules keep their data attributes (math.pi, enum.Enum, os.sep,
# mimetypes.types_map, ...) as DICTIONARY ENTRIES behind one-line accessors.
# A Python assignment stores a DYNAMIC INSTVAR, which Python's own read probes
# first, so Python always read back what it wrote.  Two things went wrong on
# the Smalltalk side:
#
#   * the accessors read the entry alone, so they kept answering the value
#     Python had replaced (#1953 -- the defect #1933 fixed for sys);
#   * assigning a FUNCTION installed a monkey-patch dispatcher over the
#     accessor, as if the accessor were a module function, so reading it CALLED
#     the function with no arguments and answered its result.  That is how
#     ``sys.excepthook = hook'' made the accessor answer None (#1954).
#
# Issue #1973 extends this to the accessors that do not read an entry but
# compute or import their value: datetime's and io's types, copyreg's helpers
# and tables, functools' and zlib's constants, os.environ and sys.modules.
# Their Python reads always saw an assignment too; the extra rows at the end
# are the places where something READS one of these names and CPython says
# whether it follows the assignment (copyreg.pickle does; update_wrapper's
# defaults and zlib.ZLIB_VERSION do not).
#
# The rows below are the Python-visible half and are checked against CPython
# by scripts/check_python_fixtures.sh; the Smalltalk half is
# ModuleAttrReassignTestCase, which drives the functions at the bottom.

import sys
import _sre
import cmath
import copyreg
import datetime
import enum
import fractions
import functools
import hashlib
import html
import html.entities
import io
import math
import mimetypes
import numbers
import os
import zlib

# Python name of the module -> the data attributes its Smalltalk class answers
# through a one-line accessor.
ACCESSORS = {
    '_sre': ['CODESIZE', 'MAGIC', 'MAXGROUPS', 'MAXREPEAT'],
    'cmath': ['e', 'inf', 'infj', 'nan', 'nanj', 'pi', 'tau'],
    'copyreg': ['__newobj__', '__newobj_ex__', '_extension_cache',
                '_extension_registry', '_inverted_registry', '_reconstructor',
                '_reduce_ex', '_slotnames', 'dispatch_table', 'pickle_union'],
    'datetime': ['date', 'datetime', 'MAXYEAR', 'MINYEAR', 'time', 'timedelta',
                 'timezone', 'tzinfo', 'UTC'],
    'enum': ['Enum', 'Flag', 'IntEnum', 'IntFlag', 'KEEP', 'StrEnum'],
    'fractions': ['Fraction'],
    'functools': ['WRAPPER_ASSIGNMENTS', 'WRAPPER_UPDATES'],
    'hashlib': ['algorithms_available', 'algorithms_guaranteed'],
    'html': ['entities'],
    'html.entities': ['codepoint2name', 'entitydefs', 'html5', 'name2codepoint'],
    'io': ['BufferedIOBase', 'BufferedRandom', 'BufferedReader', 'BufferedRWPair',
           'BufferedWriter', 'IncrementalNewlineDecoder', 'IOBase', 'RawIOBase',
           'Reader', 'TextIOBase', 'Writer'],
    'math': ['e', 'inf', 'nan', 'pi', 'tau'],
    'mimetypes': ['common_types', 'encodings_map', 'inited', 'suffix_map',
                  'types_map'],
    'numbers': ['Complex', 'Integral', 'Number', 'Rational', 'Real'],
    'os': ['_walk_symlinks_as_files', 'environ', 'linesep', 'path', 'pathsep',
           'sep'],
    'sys': ['__breakpointhook__', '__displayhook__', '__excepthook__',
            '__unraisablehook__', 'api_version', 'argv', 'audit',
            'base_exec_prefix', 'base_prefix', 'builtin_module_names',
            'byteorder', 'call_tracing', 'copyright', 'dont_write_bytecode',
            'excepthook', 'exec_prefix', 'executable', 'flags', 'float_info',
            'float_repr_style', 'getrefcount', 'getsizeof', 'hash_info',
            'hexversion', 'implementation', 'int_info', 'modules'],
    'zlib': ['ZLIB_RUNTIME_VERSION', 'ZLIB_VERSION'],
}


def new_value(kind):
    """A fresh value of each shape the defects split on: a plain object, and a
    FUNCTION -- the shape that installed a dispatcher over the accessor."""
    if kind == 'function':
        def replacement(*args):
            return 'CALLED'
        return replacement
    return object()


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _round_trips(modname):
    """The attributes of modname that do NOT read back what was assigned, for
    either shape of value, through every Python view of the module."""
    mod = sys.modules[modname]
    wrong = []
    for name in ACCESSORS[modname]:
        for kind in ('object', 'function'):
            saved = getattr(mod, name)
            new = new_value(kind)
            try:
                setattr(mod, name, new)
                views = (getattr(mod, name) is new, vars(mod)[name] is new,
                         mod.__dict__.get(name) is new)
            finally:
                setattr(mod, name, saved)
            if views != (True, True, True) or getattr(mod, name) is not saved:
                wrong.append('%s/%s' % (name, kind))
    return wrong


def _copyreg_pickle_writes_the_assigned_table():
    # copyreg.pickle stores into the module global dispatch_table, so an
    # assigned table is the one it fills.
    class C:
        pass
    saved = copyreg.dispatch_table
    mine = {}
    try:
        copyreg.dispatch_table = mine
        copyreg.pickle(C, lambda c: (C, ()))
    finally:
        copyreg.dispatch_table = saved
    return (C in mine, C in saved)


def _functools_defaults_ignore_assignment():
    # update_wrapper's assigned= / updated= defaults are bound when functools
    # is defined, so assigning the module constants does not change them.
    def wrapped():
        "the doc"
    def wrapper():
        pass
    saved = functools.WRAPPER_ASSIGNMENTS, functools.WRAPPER_UPDATES
    try:
        functools.WRAPPER_ASSIGNMENTS = ('__name__',)
        functools.WRAPPER_UPDATES = ()
        functools.update_wrapper(wrapper, wrapped)
    finally:
        functools.WRAPPER_ASSIGNMENTS, functools.WRAPPER_UPDATES = saved
    return (wrapper.__name__, wrapper.__doc__)


def _zlib_version_ignores_runtime_version():
    # ZLIB_VERSION is the version built against, not a read of
    # ZLIB_RUNTIME_VERSION.
    saved = zlib.ZLIB_RUNTIME_VERSION
    before = zlib.ZLIB_VERSION
    try:
        zlib.ZLIB_RUNTIME_VERSION = 'assigned'
        after = zlib.ZLIB_VERSION
    finally:
        zlib.ZLIB_RUNTIME_VERSION = saved
    return after == before


r = {}
for _modname in sorted(ACCESSORS):
    r[_modname] = outcome(lambda: _round_trips(_modname))
r['copyreg.pickle into an assigned dispatch_table'] = outcome(
    _copyreg_pickle_writes_the_assigned_table)
r['functools defaults after assigning the constants'] = outcome(
    _functools_defaults_ignore_assignment)
r['zlib versions after assigning ZLIB_RUNTIME_VERSION'] = outcome(
    _zlib_version_ignores_runtime_version)

EXPECTED = {modname: 'ok -> []' for modname in ACCESSORS}
EXPECTED.update({
    'copyreg.pickle into an assigned dispatch_table': 'ok -> (True, False)',
    'functools defaults after assigning the constants':
        "ok -> ('wrapped', 'the doc')",
    'zlib versions after assigning ZLIB_RUNTIME_VERSION': 'ok -> True',
})

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


# --- driven from Smalltalk (ModuleAttrReassignTestCase) -----------------------
# Each leaves the module changed on purpose, so the Smalltalk side can look; the
# test puts both of the module's stores back itself.


def module_named(modname):
    # None for a module this file does not import (gemstone, which CPython
    # lacks): the test then stores through ___pyAttrStore___:put:.
    return sys.modules.get(modname)


def reassign(modname, name, kind):
    new = new_value(kind)
    setattr(sys.modules[modname], name, new)
    return new


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-50s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
