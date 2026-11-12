"""Fixture: pdb has a Pdb class that click's CliRunner can patch.

click.testing.CliRunner.isolation() saves ``pdb.Pdb.__init__``, replaces it
with a wrapper that defaults ``stdin`` and ``stdout`` to the real terminal
streams, constructs nothing itself, and restores the original afterwards.
Flask's FlaskCliRunner is built on it.

Grail's pdb had no Pdb at all, so every ``CliRunner.invoke()`` raised
``AttributeError: module 'pdb' has no attribute 'Pdb'`` (#1633).

These checks cover what click and a Pdb subclass rely on: the class, its
constructor's signature, the attributes it keeps (cmd.Cmd's completekey,
stdin and stdout, bdb.Bdb's skip), and the save/replace/restore of
``__init__``.  Every constructor call passes readrc=False, so CPython does
not read a .pdbrc.  Every check holds under CPython 3.14, which is what
makes it evidence.
"""

import inspect
import io
import pdb
import sys

r = {}

r['pdb_exports_the_class'] = ['Pdb' in pdb.__all__, isinstance(pdb.Pdb, type)]
r['the_constructor_takes_cpythons_parameters'] = str(inspect.signature(pdb.Pdb.__init__))

given_in = io.StringIO()
given_out = io.StringIO()
debugger = pdb.Pdb(stdin=given_in, stdout=given_out, readrc=False)
r['given_streams_are_kept'] = [debugger.stdin is given_in, debugger.stdout is given_out,
                               debugger.completekey]

defaulted = pdb.Pdb(readrc=False)
r['missing_streams_default_to_sys'] = [defaulted.stdin is sys.stdin,
                                       defaulted.stdout is sys.stdout]
r['skip_is_kept_as_a_set'] = [sorted(pdb.Pdb(skip=['django.*', 'flask.*'], readrc=False).skip),
                              defaulted.skip]

calls = []
original_init = pdb.Pdb.__init__


def patched_init(self, completekey='tab', stdin=None, stdout=None, **kwargs):
    calls.append(sorted(kwargs))
    if stdin is None:
        stdin = given_in
    original_init(self, completekey=completekey, stdin=stdin, stdout=stdout, **kwargs)


pdb.Pdb.__init__ = patched_init
try:
    patched = pdb.Pdb(readrc=False)
finally:
    pdb.Pdb.__init__ = original_init
r['clicks_patch_runs_and_is_undone'] = [calls, patched.stdin is given_in,
                                         pdb.Pdb.__init__ is original_init]


class SubclassedDebugger(pdb.Pdb):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extra = 'kept'


subclassed = SubclassedDebugger(stdout=given_out, readrc=False)
r['a_subclass_reaches_the_constructor'] = [subclassed.extra, subclassed.stdout is given_out,
                                           isinstance(subclassed, pdb.Pdb)]

EXPECTED = {
    'pdb_exports_the_class': [True, True],
    'the_constructor_takes_cpythons_parameters':
        "(self, completekey='tab', stdin=None, stdout=None, skip=None, nosigint=False, "
        "readrc=True, mode=None, backend=None, colorize=False)",
    'given_streams_are_kept': [True, True, 'tab'],
    'missing_streams_default_to_sys': [True, True],
    'skip_is_kept_as_a_set': [['django.*', 'flask.*'], None],
    'clicks_patch_runs_and_is_undone': [[['readrc']], True, True],
    'a_subclass_reaches_the_constructor': ['kept', True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-45s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
