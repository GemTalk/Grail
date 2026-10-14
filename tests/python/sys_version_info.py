"""sys.version_info is a struct sequence: a tuple with named fields.

Grail stored a plain tuple, so ``sys.version_info.major`` raised
AttributeError -- which alone stopped beautifulsoup4 and soupsieve from
importing (bs4/__init__.py reads ``sys.version_info.major``) (#1420).

The rows cover the named half (major, minor, micro, releaselevel, serial),
the repr, the type's name and module, and refusing to build another one; and
the tuple half code relies on: isinstance tuple, comparison with a tuple,
slicing, indexing, unpacking, len, equality and hash with the plain tuple.
The values are compared against the tuple Grail reports, not CPython's own
version, so the fixture does not pin a patch level.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import sys

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


v = sys.version_info
plain = tuple(v)

t('major and minor', lambda: (v.major, v.minor))
t('fields match the tuple', lambda: (v.major, v.minor, v.micro, v.releaselevel, v.serial) == plain)
t('releaselevel is a str', lambda: type(v.releaselevel).__name__)
t('repr shape', lambda: repr(v) == 'sys.version_info(major=%d, minor=%d, micro=%d, releaselevel=%r, serial=%d)' % plain)
t('type name', lambda: (type(v).__name__, type(v).__qualname__, type(v).__module__))
t('isinstance tuple', lambda: isinstance(v, tuple))
t('compare with a tuple', lambda: (v >= (3, 8), v < (4,), v > (3, 13, 99)))
t('slice', lambda: (v[:2], type(v[:2]).__name__))
t('index', lambda: (v[0], v[-1] == v.serial))
t('unpack', lambda: (lambda a, b, c, d, e: (a, b))(*v))
t('len', lambda: len(v))
t('equal to the plain tuple', lambda: v == plain)
t('hash of the plain tuple', lambda: hash(v) == hash(plain))
t('n_fields', lambda: (v.n_fields, v.n_sequence_fields, v.n_unnamed_fields))
t('cannot build another', lambda: type(v)((3, 14, 0, 'final', 0)))
t('read-only field', lambda: setattr(v, 'major', 4))
t('bs4 check', lambda: 'py3' if not v.major < 3 else 'py2')


EXPECTED = {
    'major and minor': '(3, 14)',
    'fields match the tuple': 'True',
    'releaselevel is a str': "'str'",
    'repr shape': 'True',
    'type name': "('version_info', 'version_info', 'sys')",
    'isinstance tuple': 'True',
    'compare with a tuple': '(True, True, True)',
    'slice': "((3, 14), 'tuple')",
    'index': '(3, True)',
    'unpack': '(3, 14)',
    'len': '5',
    'equal to the plain tuple': 'True',
    'hash of the plain tuple': 'True',
    'n_fields': '(5, 5, 0)',
    'cannot build another': "TypeError: cannot create 'sys.version_info' instances",
    'read-only field': 'AttributeError: readonly attribute',
    'bs4 check': "'py3'",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
