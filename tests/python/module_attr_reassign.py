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
# The rows below are the Python-visible half and are checked against CPython
# by scripts/check_python_fixtures.sh; the Smalltalk half is
# ModuleAttrReassignTestCase, which drives the functions at the bottom.

import sys
import _sre
import cmath
import enum
import fractions
import hashlib
import html
import html.entities
import math
import mimetypes
import numbers
import os

# Python name of the module -> the data attributes its Smalltalk class answers
# through a one-line accessor.
ACCESSORS = {
    '_sre': ['CODESIZE', 'MAGIC', 'MAXGROUPS', 'MAXREPEAT'],
    'cmath': ['e', 'inf', 'infj', 'nan', 'nanj', 'pi', 'tau'],
    'enum': ['Enum', 'Flag', 'IntEnum', 'IntFlag', 'KEEP', 'StrEnum'],
    'fractions': ['Fraction'],
    'hashlib': ['algorithms_available', 'algorithms_guaranteed'],
    'html': ['entities'],
    'html.entities': ['codepoint2name', 'entitydefs', 'html5', 'name2codepoint'],
    'math': ['e', 'inf', 'nan', 'pi', 'tau'],
    'mimetypes': ['common_types', 'encodings_map', 'inited', 'suffix_map',
                  'types_map'],
    'numbers': ['Complex', 'Integral', 'Number', 'Rational', 'Real'],
    'os': ['_walk_symlinks_as_files', 'linesep', 'path', 'pathsep', 'sep'],
    'sys': ['__breakpointhook__', '__displayhook__', '__excepthook__',
            '__unraisablehook__', 'api_version', 'argv', 'audit',
            'base_exec_prefix', 'base_prefix', 'builtin_module_names',
            'byteorder', 'call_tracing', 'copyright', 'dont_write_bytecode',
            'excepthook', 'exec_prefix', 'executable', 'flags', 'float_info',
            'float_repr_style', 'getrefcount', 'getsizeof', 'hash_info',
            'hexversion', 'implementation', 'int_info'],
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


r = {}
for _modname in sorted(ACCESSORS):
    r[_modname] = outcome(lambda: _round_trips(_modname))

EXPECTED = {modname: 'ok -> []' for modname in ACCESSORS}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


# --- driven from Smalltalk (ModuleAttrReassignTestCase) -----------------------
# Each leaves the module changed on purpose, so the Smalltalk side can look; the
# test puts both of the module's stores back itself.


def module_named(modname):
    return sys.modules[modname]


def reassign(modname, name, kind):
    new = new_value(kind)
    setattr(sys.modules[modname], name, new)
    return new


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-16s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
