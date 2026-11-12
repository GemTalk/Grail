"""Fixture: a built-in's default argument does not re-enter a Python override.

Grail compiles each arity of a method as its own selector: ``get(key)`` is
``get:`` and ``get(key, default)`` is ``get:_:``.  Many built-ins supplied a
default by having the short form SEND the long one, and a Python subclass that
overrides ``get`` defines both selectors.  So an override that called the base
with fewer arguments, ``dict.get(self, key)`` or ``super().get(key)``, was sent
straight back to itself by the base, until RecursionError, and sometimes past
it into an uncatchable error that ended the session (#1393).

Every arity of these built-ins now reaches one private implementation that no
Python class defines.  Each check below overrides one method, calls the base
with fewer arguments than the override takes, and records the answer and how
many times the override ran.  It covers each type that had such a forward:
dict, bytes, bytearray, str, int, Fraction, datetime, io, json and socket.

The rest check the Smalltalk classes around those methods.  A class-body
namespace's setdefault and a plain bytearray override them; an instance's
and a module's __dict__ and a bool are a dict and an int without inheriting
from the classes that define them.  The 3-argument searches look in a slice
of the receiver, which has the subclass's class, and a tuple of prefixes is
tried one at a time.  Every check holds under CPython 3.14, which is what
makes it evidence.
"""

import datetime
import fractions
import io
import json
import socket

r = {}


def once(make, call):
    """Run call(instance) on make(record), answering [result, override calls]."""
    calls = []
    try:
        result = call(make(calls))
    except RecursionError:
        result = 'RecursionError'
    return [result, len(calls)]


def dict_with_get(calls):
    class D(dict):
        def get(self, key, default=None):
            calls.append(key)
            return dict.get(self, key)
    return D(a=1)


def dict_with_super_get(calls):
    class D(dict):
        def get(self, key, default=None):
            calls.append(key)
            return super().get(key)
    return D(a=1)


def dict_with_setdefault(calls):
    class D(dict):
        def setdefault(self, key, default=None):
            calls.append(key)
            return super().setdefault(key)
    return D(a=1)


def dict_with_fromkeys(calls):
    class D(dict):
        @classmethod
        def fromkeys(cls, iterable, value=None):
            calls.append(value)
            return super().fromkeys(iterable)
    return D


r['dict_get'] = once(dict_with_get, lambda d: d.get('a'))
r['dict_get_through_super'] = once(dict_with_super_get, lambda d: d.get('a'))
r['dict_setdefault'] = once(dict_with_setdefault, lambda d: [d.setdefault('a'), d.setdefault('b'), sorted(d)])
r['dict_fromkeys'] = once(dict_with_fromkeys, lambda cls: sorted(cls.fromkeys('ab').items()))


def subclass_overriding(base, name, signature, call):
    """A class statement, so the override is compiled as a method of each arity."""
    source = 'class Sub(%s):\n    def %s(self, %s):\n        calls.append(1)\n        return %s\n' % (
        base.__name__, name, signature, call)

    def make(calls):
        namespace = {'calls': calls, base.__name__: base}
        exec(source, namespace)
        return namespace['Sub']
    return make


def bytes_overriding(name, signature, call):
    make_class = subclass_overriding(bytes, name, signature, call)
    return lambda calls: make_class(calls)(b'a\tb a')


BYTES = {
    'find': ('sub, start=None, end=None', 'bytes.find(self, sub, 1)', lambda b: b.find(b'a')),
    'rfind': ('sub, start=None, end=None', 'bytes.rfind(self, sub, 0)', lambda b: b.rfind(b'a')),
    'count': ('sub, start=None, end=None', 'bytes.count(self, sub, 0)', lambda b: b.count(b'a')),
    'startswith': ('prefix, start=None, end=None', 'bytes.startswith(self, prefix, 0)',
                   lambda b: b.startswith(b'a')),
    'endswith': ('suffix, start=None, end=None', 'bytes.endswith(self, suffix, 0)',
                 lambda b: b.endswith(b'a')),
    'center': ('width, fillchar=b"-"', 'bytes.center(self, width)', lambda b: b.center(8)),
    'ljust': ('width, fillchar=b"-"', 'bytes.ljust(self, width)', lambda b: b.ljust(8)),
    'rjust': ('width, fillchar=b"-"', 'bytes.rjust(self, width)', lambda b: b.rjust(8)),
    'decode': ('encoding="utf-8", errors="strict"', 'bytes.decode(self)', lambda b: b.decode()),
    'expandtabs': ('tabsize=8', 'bytes.expandtabs(self)', lambda b: b.expandtabs()),
    'split': ('sep=None, maxsplit=-1', 'bytes.split(self, sep, -1)', lambda b: b.split(b' ')),
    'rsplit': ('sep=None, maxsplit=-1', 'bytes.rsplit(self, sep)', lambda b: b.rsplit(b' ')),
    'replace': ('old, new, count=-1', 'bytes.replace(self, old, new, -1)', lambda b: b.replace(b'a', b'x')),
}
for name, (signature, call, use) in BYTES.items():
    r['bytes_' + name] = once(bytes_overriding(name, signature, call), use)


def bytes_with_decode_errors(calls):
    class B(bytes):
        def decode(self, encoding='utf-8', errors='strict'):
            calls.append(errors)
            return bytes.decode(self, encoding, errors)
    return B(b'ok')


r['bytes_decode_with_both_arguments'] = once(bytes_with_decode_errors, lambda b: b.decode('utf-8', 'strict'))


def bytearray_with_find(calls):
    class A(bytearray):
        def find(self, sub, start=None, end=None):
            calls.append(sub)
            return bytearray.find(self, sub)
    return A(b'xab')


r['bytearray_find'] = once(bytearray_with_find, lambda b: b.find(b'a'))
r['plain_bytearray_still_searches'] = [bytearray(b'abab').find(b'b', 2), bytearray(b'abab').find(b'b'),
                                       bytearray(b'abab').rfind(b'a', 0, 3)]


def str_overriding(name, signature, call):
    make_class = subclass_overriding(str, name, signature, call)
    return lambda calls: make_class(calls)('ab')


r['str_encode'] = once(str_overriding('encode', 'encoding="utf-8", errors="strict"', 'str.encode(self)'),
                       lambda s: s.encode())
r['str_encode_with_encoding'] = once(str_overriding('encode', 'encoding="utf-8", errors="strict"',
                                                    'str.encode(self, encoding)'),
                                     lambda s: s.encode('ascii'))
r['str_startswith'] = once(str_overriding('startswith', 'prefix, start=None, end=None',
                                          'str.startswith(self, prefix, 0)'), lambda s: s.startswith('a'))
r['str_endswith'] = once(str_overriding('endswith', 'suffix, start=None, end=None',
                                        'str.endswith(self, suffix, 0)'), lambda s: s.endswith('b'))
r['str_startswith_a_tuple'] = once(str_overriding('startswith', 'prefix, start=None, end=None',
                                                  'str.startswith(self, prefix)'),
                                   lambda s: s.startswith(('x', 'a')))
r['bytes_endswith_a_tuple'] = once(bytes_overriding('endswith', 'suffix, start=None, end=None',
                                                    'bytes.endswith(self, suffix)'),
                                   lambda b: b.endswith((b'x', b'a')))


def str_with_maketrans(calls):
    class S(str):
        @staticmethod
        def maketrans(x, y=None, z=None):
            calls.append(x)
            return str.maketrans(x, y)
    return S


r['str_maketrans'] = once(str_with_maketrans, lambda cls: sorted(cls.maketrans('ab', 'cd').items()))


def int_with_to_bytes(calls):
    class I(int):
        def to_bytes(self, length=1, byteorder='big', *, signed=False):
            calls.append(length)
            return int.to_bytes(self, length)
    return I(5)


def int_with_from_bytes(calls):
    class I(int):
        @classmethod
        def from_bytes(cls, data, byteorder='big', *, signed=False):
            calls.append(byteorder)
            return int(super().from_bytes(data))
    return I


r['int_to_bytes'] = once(int_with_to_bytes, lambda i: list(i.to_bytes(2)))
r['int_from_bytes'] = once(int_with_from_bytes, lambda cls: cls.from_bytes(b'\x01\x00', 'little'))


def fraction_with_limit(calls):
    class F(fractions.Fraction):
        def limit_denominator(self, max_denominator=1000000):
            calls.append(max_denominator)
            return fractions.Fraction.limit_denominator(self)
    return F(3, 7)


r['fraction_limit_denominator'] = once(fraction_with_limit, lambda f: str(f.limit_denominator(10)))


def datetime_with_classmethods(calls):
    class T(datetime.datetime):
        @classmethod
        def fromtimestamp(cls, t, tz=None):
            calls.append(tz)
            return super().fromtimestamp(t, datetime.timezone.utc)

        @classmethod
        def now(cls, tz=None):
            calls.append(tz)
            return super().now()

        @classmethod
        def combine(cls, date, time, tzinfo=True):
            calls.append(tzinfo)
            return super().combine(date, time)
    return T


r['datetime_fromtimestamp'] = once(datetime_with_classmethods,
                                   lambda cls: cls.fromtimestamp(0, datetime.timezone.utc).year)
r['datetime_now'] = once(datetime_with_classmethods, lambda cls: type(cls.now(None)).__name__)
r['datetime_combine'] = once(datetime_with_classmethods,
                             lambda cls: cls.combine(datetime.date(2001, 2, 3), datetime.time(4), None).hour)


def io_with_readlines(base, data):
    def make(calls):
        class R(base):
            def readlines(self, hint=-1):
                calls.append(hint)
                return base.readlines(self)
        return R(data)
    return make


r['stringio_readlines'] = once(io_with_readlines(io.StringIO, 'a\nb\n'), lambda f: f.readlines(1))
r['bytesio_readlines'] = once(io_with_readlines(io.BytesIO, b'a\nb\n'), lambda f: f.readlines(1))


def decoder_with_raw_decode(calls):
    class J(json.JSONDecoder):
        def raw_decode(self, s, idx=0):
            calls.append(idx)
            return super().raw_decode(s)
    return J()


r['json_raw_decode'] = once(decoder_with_raw_decode, lambda d: list(d.raw_decode('[1] x', 0)))


def socket_with_listen_and_recv(calls):
    class Sock(socket.socket):
        def listen(self, backlog=5):
            calls.append('listen')
            return super().listen()

        def recv(self, bufsize, flags=0):
            calls.append('recv')
            return super().recv(bufsize)
    return Sock


def serve_one(cls):
    server = cls(socket.AF_INET, socket.SOCK_STREAM)
    client = cls(socket.AF_INET, socket.SOCK_STREAM)
    try:
        server.bind(('127.0.0.1', 0))
        server.listen(1)
        client.connect(server.getsockname())
        connection, _ = server.accept()
        try:
            connection.sendall(b'hi')
            return client.recv(10)
        finally:
            connection.close()
    finally:
        client.close()
        server.close()


r['socket_listen_and_recv'] = once(socket_with_listen_and_recv, serve_one)


class ClassBody:
    vars().setdefault('first')


r['class_body_setdefault_still_binds'] = ClassBody.first


class Holder:
    pass


holder = Holder()
holder.a = 1
namespace = type(datetime)('namespace')
r['base_methods_on_their_other_representations'] = [
    dict.get(holder.__dict__, 'a'), dict.get(holder.__dict__, 'z', 0), dict.setdefault(holder.__dict__, 'b'),
    dict.get(globals(), 'holder') is holder, dict.setdefault(namespace.__dict__, 'c', 3), int.to_bytes(True)]
r['plain_types_keep_their_defaults'] = [{'a': 1}.get('b'), b'ab'.center(4), 'x'.encode(), list((5).to_bytes()),
                                        b'a b'.split(), b'aXbX'.rsplit(b'X', 1), b'aa'.replace(b'a', b'b', 1)]

EXPECTED = {
    'dict_get': [1, 1],
    'dict_get_through_super': [1, 1],
    'dict_setdefault': [[1, None, ['a', 'b']], 2],
    'dict_fromkeys': [[('a', None), ('b', None)], 1],
    'bytes_find': [4, 1],
    'bytes_rfind': [4, 1],
    'bytes_count': [2, 1],
    'bytes_startswith': [True, 1],
    'bytes_endswith': [True, 1],
    'bytes_center': [b' a\tb a  ', 1],
    'bytes_ljust': [b'a\tb a   ', 1],
    'bytes_rjust': [b'   a\tb a', 1],
    'bytes_decode': ['a\tb a', 1],
    'bytes_expandtabs': [b'a       b a', 1],
    'bytes_split': [[b'a\tb', b'a'], 1],
    'bytes_rsplit': [[b'a\tb', b'a'], 1],
    'bytes_replace': [b'x\tb x', 1],
    'bytes_decode_with_both_arguments': ['ok', 1],
    'bytearray_find': [1, 1],
    'plain_bytearray_still_searches': [3, 1, 2],
    'str_encode': [b'ab', 1],
    'str_encode_with_encoding': [b'ab', 1],
    'str_startswith': [True, 1],
    'str_endswith': [True, 1],
    'str_startswith_a_tuple': [True, 1],
    'bytes_endswith_a_tuple': [True, 1],
    'str_maketrans': [[(97, 99), (98, 100)], 1],
    'int_to_bytes': [[0, 5], 1],
    'int_from_bytes': [256, 1],
    'fraction_limit_denominator': ['3/7', 1],
    'datetime_fromtimestamp': [1970, 1],
    'datetime_now': ['T', 1],
    'datetime_combine': [4, 1],
    'stringio_readlines': [['a\n', 'b\n'], 1],
    'bytesio_readlines': [[b'a\n', b'b\n'], 1],
    'json_raw_decode': [[[1], 3], 1],
    'socket_listen_and_recv': [b'hi', 2],
    'class_body_setdefault_still_binds': None,
    'base_methods_on_their_other_representations': [1, 0, None, True, 3, b'\x01'],
    'plain_types_keep_their_defaults': [None, b' ab ', b'x', [5], [b'a', b'b'], [b'aXb', b''], b'ba'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
