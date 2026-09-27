"""The four Grail gaps behind test_codecencodings_kr.

  * ``type('\\uc894') is str'' was False.  GemStone stores a str with a code
    point above 0x7F as Unicode16 or Unicode32, and ``str'' is Unicode7, so
    every non-ASCII str had a type that printed as str and was not str.  Every
    CJK codec test asserts ``type(result) is str'' on a decode.
  * ``obj.x op= v'' stored through a path that skipped __setattr__: a nested
    function's attributes (``f.limit -= 1'' after ``f.limit = 3'' worked), a
    __setattr__ override and a @property setter.
  * A multibyte codec's error handler could answer ``([], end)'' and have []
    taken as an empty replacement; CPython checks the element types.
  * A multibyte codec object's ``errors'' could be deleted; in CPython it is a
    getset that refuses a delete and a non-str.

Every expectation was measured against CPython 3.14.
"""

import codecs
import enum

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'ok'


# ------------------------------------------------ type(s) is str

class _N(str):
    pass


class _E(str, enum.Enum):
    A = '\xe9'


class _SE(enum.StrEnum):
    B = '\uc894'


def _types():
    vals = ['a', '\xe9', '\uc894', '\U0001f600', 'a\udc80',
            _N('\xe9'), _E.A, _SE.B]
    return ([type(v) is str for v in vals],
            [type(v).__name__ for v in vals],
            type(b'\xc1\xc4'.decode('cp949')) is str,
            type(codecs.lookup('cp949').decode(b'abc\xc1\xc4')[0]) is str,
            type('\xe9')('xy') == 'xy', '\xe9'.__class__ is str)


check('every_str_s_type_is_str_and_a_subclass_s_is_itself', _types(),
      ([True, True, True, True, True, False, False, False],
       ['str', 'str', 'str', 'str', 'str', '_N', '_E', '_SE'],
       True, True, True, True))


# ------------------------------------------------ obj.x op= v stores via __setattr__

class _Callbacks:
    # Nested in a method, as multibytecodec_support's
    # test_callback_backward_index nests its handler: a module-level
    # function took a different path and always worked.
    def closure_attribute(self):
        def counter():
            counter.limit -= 1
            return counter.limit
        counter.limit = 3
        return [counter(), counter(), counter.limit]


def _augmented_stores():
    log = []

    class Logged:
        def __setattr__(self, k, v):
            log.append((k, v))
            object.__setattr__(self, k, v)

    class Prop:
        def __init__(self):
            self._v = 1

        @property
        def v(self):
            return self._v

        @v.setter
        def v(self, x):
            log.append(('setter', x))
            self._v = x

    class ReadOnly:
        @property
        def r(self):
            return 1

    class Counted:
        count = 0

    def bump(o, name, by):
        if name == 'n':
            o.n += by
        elif name == 'v':
            o.v += by
        elif name == 'r':
            o.r += by
        else:
            o.count += by

    s = Logged()
    s.n = 1
    bump(s, 'n', 1)
    p = Prop()
    bump(p, 'v', 5)
    bump(Counted, 'count', 1)
    bump(Counted, 'count', 1)
    return (_Callbacks().closure_attribute(), log, p.v, Counted.count,
            outcome(bump, ReadOnly(), 'r', 1))


check('an_augmented_attribute_store_goes_through_setattr', _augmented_stores(),
      ([2, 1, 1], [('n', 1), ('n', 2), ('setter', 6)], 6, 2,
       "AttributeError: property 'r' of "
       "'_augmented_stores.<locals>.ReadOnly' object has no setter"))


# ------------------------------------------------ the multibyte codec error handler

def _wrong_handler_results():
    out = []
    for ret in ([1, 2, 3], [], None, object(), 5):
        codecs.register_error('grail.cjk_fixture',
                              lambda exc, ret=ret: (ret, exc.end))
        out.append(outcome(codecs.encode, '\udeee', 'cp949', 'grail.cjk_fixture'))
    codecs.register_error('grail.cjk_fixture', lambda exc: ([], exc.end))
    out.append(outcome(codecs.decode, b'\x80', 'cp949', 'grail.cjk_fixture'))
    codecs.register_error('grail.cjk_fixture', lambda exc: (b'?!', exc.end))
    out.append(codecs.encode('a\udeee', 'cp949', 'grail.cjk_fixture'))
    return out


_ENC = "TypeError: encoding error handler must return (str, int) tuple"
check('a_multibyte_error_handler_must_answer_str_or_bytes_and_int',
      _wrong_handler_results(),
      [_ENC, _ENC, _ENC, _ENC, _ENC,
       "TypeError: decoding error handler must return (str, int) tuple",
       b'a?!'])


# ------------------------------------------------ the errors getset

def _errors_attribute():
    lk = codecs.lookup('cp949')
    out = []
    for make in (lk.incrementalencoder, lk.incrementaldecoder):
        e = make()
        before = e.errors
        e.errors = 'ignore'
        out.append((before, e.errors, outcome(delattr, e, 'errors'),
                    outcome(setattr, e, 'errors', 3), e.errors))
    return out


check('a_multibyte_codec_s_errors_cannot_be_deleted', _errors_attribute(),
      [('strict', 'ignore', 'AttributeError: cannot delete attribute',
        'TypeError: errors must be a string', 'ignore')] * 2)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
