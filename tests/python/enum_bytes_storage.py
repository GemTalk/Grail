# A bytes- or bytearray-mixin enum: the member IS its bytes (#2133).
#
#     class Raw(bytes, Enum):
#         A = b'a'
#     bytes(Raw.A)      # b'a'; Grail answered b''
#
# Grail built the member with basicNew, which leaves the INDEXED content empty,
# so every member was a zero-length bytes: len() 0, indexing raised IndexError,
# ``Raw.A == b'a''' was False, and members of two DIFFERENT bytes enums
# compared equal (both b'').  The str and tuple branches beside it already gave
# their members the value's characters and elements; this is that fix for
# bytes.
#
# The functional API (``Enum('Raw', {'A': b'a'}, type=bytes)'') had the same
# empty content and, besides, never stored _value_, so ``F.A._value_'' found a
# method rather than b'a' -- as it did for a functional str or int enum too.
#
# A bytearray mixin's _value_ is member_type(*args) -- bytearray(b'a'), not the
# b'a' written in the body -- and an int or (str, encoding) value is spread into
# that constructor just as for any other data type.
#
# Every expectation here was checked against real CPython 3.14 -- this file is
# plain Python and needs no Grail.

from enum import Enum

r = {}


class Raw(bytes, Enum):
    A = b'a'
    B = b'bc'


class Other(bytes, Enum):
    X = b'x'


class Buf(bytearray, Enum):
    A = b'aa'
    B = b'bb'


class Spread(bytes, Enum):
    ZEROS = 2
    TEXT = 'hi', 'ascii'


Octet = Enum('Octet', {'P': b'p', 'Q': b'qr'}, type=bytes)
Block = Enum('Block', [('P', b'pp'), ('Q', b'qq')], type=bytearray)
Letter = Enum('Letter', [('P', 'p')], type=str)
Level = Enum('Level', [('LOW', 3)], type=int)

# --- a class-statement bytes mixin --------------------------------------------

r['content'] = repr(bytes(Raw.A))
r['len'] = repr(len(Raw.B))
r['index'] = repr(Raw.B[0])
r['iterate'] = repr(list(Raw.B))
r['eq_value'] = repr(Raw.A == b'a')
r['other_enum'] = repr(Raw.A == Other.X)
r['siblings'] = repr(Raw.A == Raw.B)
r['hash'] = repr(hash(Raw.A) == hash(b'a'))
r['dict_key'] = repr({Raw.A: 1, Raw.B: 2}[b'bc'])
r['value'] = '%r/%r' % (Raw.A._value_, Raw.B.value)
r['repr'] = repr(Raw.A)
r['lookup'] = repr(Raw(b'bc'))
r['isinstance'] = repr((isinstance(Raw.A, bytes), isinstance(Raw.A, Raw)))
r['decode'] = Raw.B.decode()

# --- a class-statement bytearray mixin ----------------------------------------

r['ba_content'] = repr(bytes(Buf.A))
r['ba_value'] = repr(Buf.A._value_)
r['ba_eq'] = repr((Buf.A == b'aa', Buf.A == Buf.B))
r['ba_len'] = repr(len(Buf.B))
r['ba_isinstance'] = repr(isinstance(Buf.A, bytearray))

# --- a value spread into bytes(*args) ------------------------------------------

r['spread'] = '%r/%r' % (bytes(Spread.ZEROS), Spread.ZEROS.value)
r['spread_text'] = '%r/%r' % (bytes(Spread.TEXT), Spread.TEXT.value)

# --- the functional API ---------------------------------------------------------

r['fn_content'] = repr((bytes(Octet.P), bytes(Octet.Q)))
r['fn_value'] = '%r/%r' % (Octet.P._value_, Octet.Q.value)
r['fn_eq'] = repr((Octet.P == b'p', Octet.P == Octet.Q, Octet.P == Raw.A))
r['fn_len'] = repr(len(Octet.Q))
r['fn_lookup'] = repr(Octet(b'qr'))
r['fn_ba'] = '%r/%r/%r' % (bytes(Block.P), Block.P._value_, Block.Q == b'qq')
# The same missing _value_, for every data-mixed functional enum.
r['fn_sunders'] = '%r/%r/%r' % (Letter.P._value_, Level.LOW._value_, Octet.Q._name_)

EXPECTED = {
    'content': "b'a'",
    'len': '2',
    'index': '98',
    'iterate': '[98, 99]',
    'eq_value': 'True',
    'other_enum': 'False',
    'siblings': 'False',
    'hash': 'True',
    'dict_key': '2',
    'value': "b'a'/b'bc'",
    'repr': "<Raw.A: b'a'>",
    'lookup': "<Raw.B: b'bc'>",
    'isinstance': '(True, True)',
    'decode': 'bc',
    'ba_content': "b'aa'",
    'ba_value': "bytearray(b'aa')",
    'ba_eq': '(True, False)',
    'ba_len': '2',
    'ba_isinstance': 'True',
    'spread': "b'\\x00\\x00'/b'\\x00\\x00'",
    'spread_text': "b'hi'/b'hi'",
    'fn_content': "(b'p', b'qr')",
    'fn_value': "b'p'/b'qr'",
    'fn_eq': '(True, False, False)',
    'fn_len': '2',
    'fn_lookup': "<Octet.Q: b'qr'>",
    'fn_ba': "b'pp'/bytearray(b'pp')/True",
    'fn_sunders': "'p'/3/'Q'",
}

if __name__ == '__main__':
    for key in EXPECTED:
        print('%-14s %s %s' % (key, 'OK ' if r[key] == EXPECTED[key] else 'DIFF', r[key]))
