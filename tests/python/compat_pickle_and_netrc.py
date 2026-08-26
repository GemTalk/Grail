"""Two small stdlib modules Grail was missing, and what they buy.

``_compat_pickle`` is pure data: the four tables pickle uses to rewrite names
across the Python 2/3 boundary when ``fix_imports`` is on (protocols 0-2).
Grail's pickle.py carried a TWO-ENTRY subset of them inline -- exactly the
entries its own reductions happened to reach -- with a comment pointing at the
module as where CPython keeps the real thing.  It is now vendored and wired up,
so a pickle written by or for Python 2 code round-trips names Grail never
produces itself.

``netrc`` parses ~/.netrc.  Nothing in Grail needed it; test.test_netrc did,
and could not even import.

The pickle half is the part worth guarding: fix_imports is silent when it is
wrong.  A name that fails to map does not raise -- it just pickles under a name
the other side will not find, and only a cross-version load notices.

Every expectation below was checked against CPython 3.14.
"""

import io
import pickle
import os
import _compat_pickle

# Per-gem directory, stable across reloads; see _parse for why a fixed path was
# a race.  Same pid-keyed shape as fileio_constructor.py and for the same reason.
_NETRC_DIR = '/tmp/grail_netrc_%d' % os.getpid()
try:
    os.mkdir(_NETRC_DIR)
except OSError:
    pass

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- the tables themselves

# Four tables, two directions each: module names and (module, name) pairs.
check('import_mapping_py2_to_py3',
      lambda: _compat_pickle.IMPORT_MAPPING['__builtin__'], 'builtins')
check('reverse_import_mapping_py3_to_py2',
      lambda: _compat_pickle.REVERSE_IMPORT_MAPPING['builtins'], '__builtin__')
check('name_mapping_py2_to_py3',
      lambda: _compat_pickle.NAME_MAPPING[('__builtin__', 'xrange')],
      ('builtins', 'range'))
check('reverse_name_mapping_py3_to_py2',
      lambda: _compat_pickle.REVERSE_NAME_MAPPING[('builtins', 'range')],
      ('__builtin__', 'xrange'))

# They are substantially larger than the two entries Grail carried inline --
# the point of vendoring them rather than growing the subset by hand.
check('tables_are_the_full_ones',
      lambda: (len(_compat_pickle.IMPORT_MAPPING) > 40
               and len(_compat_pickle.NAME_MAPPING) > 40), True)

# A few entries Grail's own reductions never reach, so they can only come from
# the vendored table.
check('queue_module_maps',
      lambda: _compat_pickle.IMPORT_MAPPING['Queue'], 'queue')
check('copyreg_module_maps',
      lambda: _compat_pickle.IMPORT_MAPPING['copy_reg'], 'copyreg')


# ------------------------------------------- fix_imports, both directions

def _dump_p2(obj):
    """Pickle at protocol 2 with fix_imports on -- the Python-2 wire form."""
    return pickle.dumps(obj, protocol=2, fix_imports=True)


def _names_in(data):
    """The module/name strings a protocol-2 GLOBAL opcode wrote."""
    return [p for p in data.split(b'\n') if p]


# range is the canonical case: it is 'xrange' on the Python 2 side.
check('range_pickles_as_xrange',
      lambda: b'xrange' in _dump_p2(range), True)
check('range_pickles_under_builtin_module',
      lambda: b'__builtin__' in _dump_p2(range), True)


# ...and comes back as range.
check('xrange_loads_back_as_range',
      lambda: pickle.loads(_dump_p2(range)) is range, True)


# A protocol-2 round trip of ordinary data is unaffected by any of this.
check('ordinary_roundtrip_p2',
      lambda: pickle.loads(_dump_p2({'a': [1, 2, 3]}))['a'][2], 3)
check('ordinary_roundtrip_default_protocol',
      lambda: pickle.loads(pickle.dumps({'a': (1, 2)}))['a'][1], 2)

# Protocol 4 does NOT rewrite names -- fix_imports only applies to 0-2.
check('protocol_4_keeps_builtins',
      lambda: b'xrange' in pickle.dumps(range, protocol=4), False)


# ------------------------------------------------------------- netrc

NETRC_TEXT = """\
machine example.com login alice password secret
machine other.org login bob password hunter2
default login anon password anon@
"""


def _parse(text):
    """Parse text as a .netrc, through a real file.

    A plain open() rather than tempfile.mkstemp(), which Grail does not
    support -- but mkdtemp IS real, and the directory has to be private.  This
    used a fixed /tmp path, and the file is written AND UNLINKED on every call:
    with several checkouts running against one stone on the dev host as separate
    users, a concurrent run's os.unlink could delete this one's file between the
    open() and netrc's read of it.  The failure surfaced as a spurious netrc
    error in whichever suite lost the race, and never reproduced alone.

    The permission check netrc does on a world-readable file applies only to the
    DEFAULT ~/.netrc, not to an explicitly named path, so the file's mode does
    not matter here.
    """
    import netrc
    import os
    path = _NETRC_DIR + '/netrc'
    f = open(path, 'w')
    try:
        f.write(text)
    finally:
        f.close()
    try:
        return netrc.netrc(path)
    finally:
        os.unlink(path)


check('netrc_finds_a_machine',
      lambda: _parse(NETRC_TEXT).authenticators('example.com'),
      ('alice', '', 'secret'))
check('netrc_finds_the_second_machine',
      lambda: _parse(NETRC_TEXT).authenticators('other.org'),
      ('bob', '', 'hunter2'))
check('netrc_falls_back_to_default',
      lambda: _parse(NETRC_TEXT).authenticators('unlisted.example'),
      ('anon', '', 'anon@'))
# ``default'' is an entry in .hosts like any other -- it is the fallback the
# lookup above uses, not a separate mechanism.
check('netrc_lists_its_hosts',
      lambda: sorted(_parse(NETRC_TEXT).hosts),
      ['default', 'example.com', 'other.org'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
