"""A note added while an exception propagates must land on the exception.

PEP 678 notes are attached to a caught exception on its way out — the codec
machinery adds `"encoding with 'X' codec failed"`, `__set_name__` adds one
naming the descriptor, `dict()` one naming the bad element.

Grail cannot always re-signal an exception instance: one with live frames
raises GemStone's "cannot be signalled again", so
`BaseException >> ___signalCarrying___:` wraps it in a CARRIER — literally
`payload class new`, a fresh instance of the same class holding the real
one. Handlers see the carrier; Python sees the payload, because
`___payloadOf___:` is, in its own words, "THE ONE SANCTIONED CROSSING".

A note site that writes to the handler's exception without crossing back
therefore decorates an object nobody will ever look at.

It hid well, because the FIRST raise of an instance needs no carrier: the
note landed on the real exception and everything looked right. Only a
SECOND raise of the SAME instance goes through a carrier — which is exactly
what `test_codecs`' `ExceptionNotesTest` does, raising one instance four
times over and clearing `__notes__` between, so every raise after the first
found the list empty and `__notes__[0]` was an `IndexError`.

That shape is the whole point of this fixture: a first raise proves
nothing.

Every expectation was checked against CPython 3.14 first.
"""

import codecs

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


_TEST_CODECS = {}
codecs.register(lambda name: _TEST_CODECS.get(name))

# Codec names are made UNIQUE PER MODULE LOAD.  The SUnit harness reloads
# this module for every test method, which re-runs `codecs.register` and
# rebuilds `_TEST_CODECS` -- but the codec CACHE is keyed by name and
# survives, so a reused name resolves to the previous load's CodecInfo and
# its stale exception instance.  The nonce sidesteps that without needing
# the cache-eviction hooks to be exact.
_NONCE = '%x' % id(_TEST_CODECS)


def _nm(base):
    return '%s_%s' % (base, _NONCE)


class Raiser:
    """Raises the object it was given, so the SAME instance can be raised
    repeatedly — a class would mint a fresh one each time and never build a
    carrier."""

    def __init__(self, obj):
        self.obj = obj

    def raise_obj(self, *args, **kwds):
        raise self.obj


def _register(name, raiser):
    _TEST_CODECS[name] = codecs.CodecInfo(raiser.raise_obj, raiser.raise_obj,
                                          name=name)


def _notes(fn):
    try:
        fn()
    except BaseException as exc:
        return list(getattr(exc, '__notes__', ['<no __notes__>']))
    return ['<no-error>']


# ------------------------------------------ the carrier case, four ways

def _the_same_instance_raised_twice():
    """Both raises must note. The second goes through a carrier."""
    exc = RuntimeError('m')
    _register(_nm('cnc_a'), Raiser(exc))
    return (_notes(lambda: 'x'.encode(_nm('cnc_a'))),
            _notes(lambda: 'x'.encode(_nm('cnc_a'))))


def _notes_reappear_after_clear():
    """The exact shape ExceptionNotesTest uses: read the note, clear it,
    raise the same instance again and expect a note once more."""
    exc = RuntimeError('m')
    _register(_nm('cnc_b'), Raiser(exc))
    out = []
    for _ in range(3):
        try:
            'x'.encode(_nm('cnc_b'))
        except BaseException as caught:
            out.append(list(caught.__notes__))
            caught.__notes__.clear()
    return out


def _encode_then_decode_note_separately():
    exc = RuntimeError('m')
    _register(_nm('cnc_c'), Raiser(exc))
    try:
        'x'.encode(_nm('cnc_c'))
    except BaseException:
        pass
    return _notes(lambda: b'y'.decode(_nm('cnc_c')))


def _two_codecs_on_one_instance():
    exc = RuntimeError('m')
    r = Raiser(exc)
    _register(_nm('cnc_d'), r)
    _register(_nm('cnc_e'), r)
    return (_notes(lambda: 'x'.encode(_nm('cnc_d'))),
            _notes(lambda: 'x'.encode(_nm('cnc_e'))))


check('the_same_instance_raised_twice', _the_same_instance_raised_twice(),
      (["encoding with %r codec failed" % _nm('cnc_a')],
       ["encoding with %r codec failed" % _nm('cnc_a'),
        "encoding with %r codec failed" % _nm('cnc_a')]))
check('notes_reappear_after_clear', _notes_reappear_after_clear(),
      [["encoding with %r codec failed" % _nm('cnc_b')]] * 3)
check('encode_then_decode_note_separately',
      _encode_then_decode_note_separately(),
      ["encoding with %r codec failed" % _nm('cnc_c'),
       "decoding with %r codec failed" % _nm('cnc_c')])
check('two_codecs_on_one_instance', _two_codecs_on_one_instance(),
      (["encoding with %r codec failed" % _nm('cnc_d')],
       ["encoding with %r codec failed" % _nm('cnc_d'),
        "encoding with %r codec failed" % _nm('cnc_e')]))


# ------------------------------------- identity is what the carrier protects

def _the_caught_exception_is_the_one_raised():
    """The carrier exists to keep this true; the note must go to the same
    object, which is what the fix restores."""
    exc = RuntimeError('m')
    _register(_nm('cnc_f'), Raiser(exc))
    out = []
    for _ in range(3):
        try:
            'x'.encode(_nm('cnc_f'))
        except BaseException as caught:
            out.append((caught is exc, len(caught.__notes__),
                        len(exc.__notes__)))
    return out


check('the_caught_exception_is_the_one_raised',
      _the_caught_exception_is_the_one_raised(),
      [(True, 1, 1), (True, 2, 2), (True, 3, 3)])


# ------------------------------------------- the other four entry points

def _all_four_codec_entry_points():
    exc = RuntimeError('m')
    _register(_nm('cnc_g'), Raiser(exc))
    out = []
    for call in (lambda: 'x'.encode(_nm('cnc_g')),
                 lambda: codecs.encode('x', _nm('cnc_g')),
                 lambda: b'y'.decode(_nm('cnc_g')),
                 lambda: codecs.decode(b'y', _nm('cnc_g'))):
        try:
            call()
        except BaseException as caught:
            out.append(caught.__notes__[-1])
    return out


check('all_four_codec_entry_points', _all_four_codec_entry_points(),
      ["encoding with %r codec failed" % _nm('cnc_g'),
       "encoding with %r codec failed" % _nm('cnc_g'),
       "decoding with %r codec failed" % _nm('cnc_g'),
       "decoding with %r codec failed" % _nm('cnc_g')])


# ------------------------- other note sites, one already right, one fixed

def _set_name_notes_every_time():
    """`Object >> ___grailNoteSetName___` already crossed back correctly --
    asserted so a future change cannot quietly undo it."""
    exc = RuntimeError('m')

    class Desc:
        def __set_name__(self, owner, name):
            raise exc

    def build():
        class Holder:
            d = Desc()
        return Holder

    first = _notes(build)
    exc.__notes__.clear()
    second = _notes(build)
    return (first, second)


def _dict_notes_a_non_iterable_element():
    return _notes(lambda: dict([1]))


check('set_name_notes_every_time', _set_name_notes_every_time(),
      (["Error calling __set_name__ on 'Desc' instance 'd' in 'Holder'"],
       ["Error calling __set_name__ on 'Desc' instance 'd' in 'Holder'"]))
check('dict_notes_a_non_iterable_element',
      _dict_notes_a_non_iterable_element(),
      ['Cannot convert dictionary update sequence element #0 to a sequence'])


# ------------------------------------------------ nothing else is noted

def _a_lookup_miss_is_not_a_codec_failure():
    """The note wraps the CALL, not the lookup: an unknown encoding is not
    a codec that failed."""
    return _notes(lambda: 'x'.encode('no_such_codec_xyz'))


def _add_note_itself_is_unchanged():
    exc = RuntimeError('m')
    exc.add_note('x')
    exc.add_note('x')
    exc.add_note('y')
    return list(exc.__notes__)


check('a_lookup_miss_is_not_a_codec_failure',
      _a_lookup_miss_is_not_a_codec_failure(), ['<no __notes__>'])
check('add_note_itself_is_unchanged', _add_note_itself_is_unchanged(),
      ['x', 'x', 'y'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
