"""Fixture: an instance of a str subclass may hold a lone surrogate.

``surrogateescape`` decoding maps undecodable bytes to U+DC80..U+DCFF, and a
str subclass built from such a string has to carry them like any other code
point.  email's header parser does exactly that: it decodes 8-bit header
bytes that way and builds its tokens as ``class Terminal(str)`` instances,
so in Grail reading any non-ASCII header of a bytes-parsed message raised
NotImplementedError -- a Grail str subclass is a kernel string class, and no
kernel string can hold D800..DFFF.

The instance must still be the subclass in every way Python can ask:
type(), isinstance, its methods, properties and class attributes, super(),
and the str operations, which answer plain strs.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import io
import pickle
from email import message_from_bytes, policy
from email.generator import BytesGenerator

r = {}

S = b'pr\xc3\xa9'.decode('ascii', 'surrogateescape')


class Mixin:
    def tag(self):
        return 'mixin'


class T(str, Mixin):
    kind = 'class attr'

    def __new__(cls, value, label='t'):
        self = super().__new__(cls, value)
        self.label = label
        return self

    def __repr__(self):
        return 'T(%s)' % super().__repr__()

    @property
    def shouted(self):
        return self.upper() + '!'

    def describe(self):
        return '%s/%s/%s' % (self.label, self.kind, self.tag())


class Plain(str):
    pass


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return '%s: %s' % (type(exception).__name__, exception)


t = T(S, 'x')
p = Plain(S)

r['it_is_the_subclass'] = [type(t) is T, t.__class__ is T, isinstance(t, T), isinstance(t, str),
                           isinstance(t, Mixin), type(p) is Plain, isinstance(p, Plain)]
r['its_value_is_the_surrogate_string'] = [t == S, S == t, hash(t) == hash(S), len(t), t[2], list(t)]
r['its_own_attributes_methods_and_property'] = [t.label, t.kind, t.describe(), t.shouted,
                                                hasattr(t, 'nope'), attempt(lambda: t.nope)]
r['super_reaches_strs_own_method'] = [repr(t), repr(p)]
r['str_methods_answer_plain_strs'] = [
    [type(x).__name__ for x in (str(t), t + 'x', 'x' + t, t[0:2], t.upper(), t.replace('p', 'q'))],
    t + 'x', t.upper(), 'r' in t, t.startswith('pr'), t.encode('ascii', 'surrogateescape')]
r['every_constructor_spelling'] = [
    type(str.__new__(Plain, S)).__name__, str.__new__(Plain, S) == S,
    type(Plain(b'pr\xc3\xa9', 'ascii', 'surrogateescape')).__name__,
    Plain(b'pr\xc3\xa9', 'ascii', 'surrogateescape') == S,
    type(Plain('plain')).__name__]
r['copy_and_pickle_keep_the_subclass'] = [
    [type(c).__name__ for c in (copy.copy(p), copy.deepcopy(p), pickle.loads(pickle.dumps(p)))],
    [c == S for c in (copy.copy(p), pickle.loads(pickle.dumps(p)))]]

message = message_from_bytes('Subject: café\n\nbody\n'.encode('utf-8'), policy=policy.default)
out = io.BytesIO()
BytesGenerator(out, policy=policy.default.clone(cte_type='7bit')).flatten(message)
r['an_8bit_header_parses_and_flattens'] = [str(message['Subject']), out.getvalue()]

EXPECTED = {
    'it_is_the_subclass': [True] * 7,
    'its_value_is_the_surrogate_string': [True, True, True, 4, '\udcc3',
                                          ['p', 'r', '\udcc3', '\udca9']],
    'its_own_attributes_methods_and_property': [
        'x', 'class attr', 'x/class attr/mixin', 'PR\udcc3\udca9!', False,
        "AttributeError: 'T' object has no attribute 'nope'"],
    'super_reaches_strs_own_method': ["T('pr\\udcc3\\udca9')", "'pr\\udcc3\\udca9'"],
    'str_methods_answer_plain_strs': [['str'] * 6, 'pr\udcc3\udca9x', 'PR\udcc3\udca9', True,
                                      True, b'pr\xc3\xa9'],
    'every_constructor_spelling': ['Plain', True, 'Plain', True, 'Plain'],
    'copy_and_pickle_keep_the_subclass': [['Plain'] * 3, [True, True]],
    'an_8bit_header_parses_and_flattens': [
        'café', b'Subject: =?unknown-8bit?q?caf=C3=A9?=\n\nbody\n'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-50s -> %a' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
