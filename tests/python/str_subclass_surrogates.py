"""Fixture: a str subclass whose value holds a lone surrogate.

PEP 383's surrogateescape smuggles undecodable bytes into a str as
U+DC80..U+DCFF, and the email package builds its header tokens -- str
subclasses, Terminal and its kin -- straight from such text.  Grail stores a
str subclass in a kernel string, which cannot hold a surrogate, so
``S('a\\udcacb')'' raised NotImplementedError: test_email's
_header_value_parser, headerregistry, generator and parser rows.

Grail now gives such an instance a twin class (PyStrSurrogate class >>
___twinFor___:) that holds code points and carries S's behaviour.  Everything
below is what CPython answers, so each check is about S, not the twin: the
twin must never show.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import pickle

r = {}
s = 'a\udcacb'


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__


class Tag(str):
    kind = 'plain'
    count = 0

    def __new__(cls, value, label):
        self = super().__new__(cls, value)
        self.label = label
        return self

    def __repr__(self):
        return '{}({})'.format(self.__class__.__name__, super().__repr__())

    def shout(self):
        return self.upper() + '!'

    @property
    def described(self):
        return '%s:%s' % (self.label, len(self))

    @classmethod
    def make(cls, value):
        return cls(value, 'made')

    @staticmethod
    def helper():
        return 'static'

    def __getnewargs__(self):
        return (str(self), self.label)


class SubTag(Tag):
    kind = 'sub'

    def shout(self):
        return 'sub ' + super().shout()


class Plain(str):
    pass


class Empty(str):
    def __str__(self):
        return ''


t = Tag(s, 'x')
sub = SubTag(s, 'y')
plain = Plain(s)

r['construction'] = [t, plain, str.__new__(Plain, s), Plain(b'a\xacb', 'ascii', 'surrogateescape'),
                     Plain(s.encode('utf-8', 'surrogateescape'), 'utf-8', 'surrogateescape')]
r['the_type_is_the_subclass'] = [type(t) is Tag, t.__class__ is Tag, type(sub) is SubTag,
                                 type(plain) is Plain, type(t).__name__, type(t).__mro__ == Tag.__mro__]
r['isinstance'] = [isinstance(t, Tag), isinstance(t, str), isinstance(sub, Tag), isinstance(t, SubTag),
                   issubclass(type(sub), Tag), isinstance(plain, Tag)]
r['repr'] = [repr(t), repr(sub), repr(plain)]
r['str_is_exact'] = [type(str(t)) is str, str(t) == s, type(str(plain)) is str, str(Empty(s)),
                     type('%s' % plain) is str]
r['str_methods_answer_str'] = [[type(v).__name__ for v in (t + 'c', t[1:], t.upper(), t * 2, t.replace('a', 'z'))],
                               t.split('\udcac'), t.startswith('a'), t.endswith('\udcacb'), '\udcac' in t,
                               len(t), list(t), t.encode('ascii', 'surrogateescape')]
r['equality_and_hashing'] = [t == s, s == t, t == plain, hash(t) == hash(s), {s: 1}[t], {t: 2}[s],
                             t != 'ab', sorted([t, 'a', 'b'])]
r['own_methods'] = [t.shout(), sub.shout(), t.described, t.label, Tag.make(s).label, t.helper(), Tag.helper()]
r['class_attributes'] = [t.kind, sub.kind, t.count, plain.__class__.__name__]
Tag.count = 5
r['a_class_attribute_set_later_is_seen'] = [t.count, sub.count]
r['instance_attributes'] = [outcome(lambda: setattr(t, 'extra', 1)), getattr(t, 'extra', None),
                            sorted(k for k in vars(t) if not k.startswith('__'))]
r['copy_and_pickle'] = [copy.copy(t), copy.copy(t).label, type(copy.copy(t)) is Tag,
                        pickle.loads(pickle.dumps(t)), pickle.loads(pickle.dumps(t)).label,
                        type(pickle.loads(pickle.dumps(plain))) is Plain]
r['without_a_surrogate_nothing_changes'] = [Tag('ab', 'z'), type(Tag('ab', 'z')) is Tag,
                                            Tag('ab', 'z').described, Tag('ab', 'z') + Tag(s, 'w')]


EXPECTED = {
    'construction': ['a\udcacb'] * 5,
    'the_type_is_the_subclass': [True, True, True, True, 'Tag', True],
    'isinstance': [True, True, True, False, True, False],
    'repr': ["Tag('a\\udcacb')", "SubTag('a\\udcacb')", "'a\\udcacb'"],
    'str_is_exact': [True, True, True, '', True],
    'str_methods_answer_str': [['str'] * 5, ['a', 'b'], True, True, True, 3, ['a', '\udcac', 'b'], b'a\xacb'],
    'equality_and_hashing': [True, True, True, True, 1, 2, True, ['a', 'a\udcacb', 'b']],
    'own_methods': ['A\udcacB!', 'sub A\udcacB!', 'x:3', 'x', 'made', 'static', 'static'],
    'class_attributes': ['plain', 'sub', 0, 'Plain'],
    'a_class_attribute_set_later_is_seen': [5, 5],
    'instance_attributes': [None, 1, ['extra', 'label']],
    'copy_and_pickle': ['a\udcacb', 'x', True, 'a\udcacb', 'x', True],
    'without_a_surrogate_nothing_changes': ['ab', True, 'z:2', 'aba\udcacb'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
