"""Fixture: a FileIO's repr, mode and read-only attributes are CPython's.

fileio_repr (Modules/_io/fileio.c) prints the type, the name -- or the
descriptor once ``del f.name'' has removed it -- the mode and closefd, or
only ``[closed]'', and raises RuntimeError rather than recursing when the
name is the file itself.  mode_string reports the mode by what the file can
do: 'w+b' is 'rb+'.  mode and closed are getsets with no setter.  A text
file's repr is textiowrapper_repr's (Modules/_io/textio.c), and its mode is
an ordinary attribute.

Grail printed the default ``<_io.FileIO object at 0x...>'', kept 'wb+' as
given, and let ``f.mode = ...'' succeed silently (test_fileio testRepr,
testRecursiveRepr, testModeStrings, testAttributes).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import _io
import os
import tempfile

r = {}
directory = tempfile.mkdtemp()
path = os.path.join(directory, 'fileio_repr_and_mode.bin')


def refusal(thunk):
    try:
        thunk()
        return 'allowed'
    except AttributeError as e:
        return 'AttributeError: %s' % e


f = _io.FileIO(path, 'w')
r['named'] = repr(f) == "<_io.FileIO name=%r mode='wb' closefd=True>" % path
del f.name
r['unnamed_shows_the_descriptor'] = (
    repr(f) == "<_io.FileIO fd=%d mode='wb' closefd=True>" % f.fileno())
r['the_name_is_gone'] = hasattr(f, 'name')
f.name = f
try:
    repr(f)
    r['a_name_that_is_the_file'] = 'no error'
except RuntimeError as e:
    r['a_name_that_is_the_file'] = 'RuntimeError: %s' % e
f.name = path


def assign_mode():
    f.mode = 'oops'


def assign_closed():
    f.closed = 'oops'


def delete_mode():
    del f.mode


r['mode_assigned'] = refusal(assign_mode)
r['closed_assigned'] = refusal(assign_closed)
r['mode_deleted'] = refusal(delete_mode)
f.other = 1
r['another_attribute_assigned'] = f.other
f.close()
r['closed'] = repr(f)


class Subclass(_io.FileIO):
    pass


with Subclass(path, 'r') as s:
    r['a_subclass'] = repr(s) == "<Subclass name=%r mode='rb' closefd=True>" % path

modes = []
for given in ('w', 'wb', 'wb+', 'w+b', 'a', 'ab', 'ab+', 'a+b', 'r', 'rb', 'rb+', 'r+b'):
    with _io.FileIO(path, given) as g:
        modes.append(g.mode)
r['constructor_modes'] = modes

opened = []
for given in ('wb', 'w+b', 'ab', 'a+b', 'rb', 'r+b'):
    with open(path, given) as g:
        opened.append(g.mode)
r['binary_open_modes'] = opened

with open(path, 'r+', encoding='utf-8') as t:
    r['text_mode_kept'] = t.mode
    r['text_repr'] = repr(t) == "<_io.TextIOWrapper name=%r mode='r+' encoding='utf-8'>" % path
    t.mode = 'changed'
    r['text_mode_assigned'] = t.mode

os.remove(path)
os.rmdir(directory)

EXPECTED = {
    'named': True,
    'unnamed_shows_the_descriptor': True,
    'the_name_is_gone': False,
    'a_name_that_is_the_file': 'RuntimeError: reentrant call inside _io.FileIO.__repr__',
    'mode_assigned': "AttributeError: attribute 'mode' of '_io.FileIO' objects is not writable",
    'closed_assigned': "AttributeError: attribute 'closed' of '_io.FileIO' objects is not writable",
    'mode_deleted': "AttributeError: attribute 'mode' of '_io.FileIO' objects is not writable",
    'another_attribute_assigned': 1,
    'closed': '<_io.FileIO [closed]>',
    'a_subclass': True,
    'constructor_modes': ['wb', 'wb', 'rb+', 'rb+', 'ab', 'ab', 'ab+', 'ab+', 'rb', 'rb', 'rb+', 'rb+'],
    'binary_open_modes': ['wb', 'rb+', 'ab', 'ab+', 'rb', 'rb+'],
    'text_mode_kept': 'r+',
    'text_repr': True,
    'text_mode_assigned': 'changed',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
