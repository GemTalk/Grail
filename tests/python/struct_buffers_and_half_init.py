"""struct and memoryview behaviour that test.test_struct found missing.

  * A memoryview over an array.array was READ-ONLY, so struct.pack_into into
    ``memoryview(array('b', ...))'' -- the buffer test_struct's _test_pack_into
    is built on -- raised ``cannot modify read-only memory''.  CPython's view is
    writable and writes land in the array.
  * A STEPPED memoryview slice (``mv[::2]'', ``mv[::-1]'') raised
    NotImplementedError.  CPython answers a non-contiguous view, which reads
    and writes through its stride and which pack_into and cast refuse.
  * pack_into accepted a LIST as its buffer, because it asked only for
    __setitem__.  A list has no buffer, and CPython raises TypeError.
  * ``Struct.__new__(Struct)'' -- a Struct __init__ never ran on -- treated the
    class as a format string.  CPython keeps it as a distinct state: every
    operation raises ``RuntimeError: Struct object is not initialized'' and its
    size is -1.
  * iter_unpack answered the list's own iterator, so its type was
    constructible.  CPython's unpack_iterator is not.
  * import_fresh_module left the module it imported in sys.modules and in the
    canonical registry, so test__struct_reference_cycle_cleaned_up's fresh
    _struct could never be collected.

Every expectation was measured against CPython 3.14.
"""

import array
import struct

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args):
    try:
        fn(*args)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'ok'


# ------------------------------------------------ memoryview over an array

def _array_view():
    a = array.array('b', b' ' * 10)
    mv = memoryview(a)
    mv[0] = 65
    struct.pack_into('2s', mv, 2, b'hi')
    return (mv.readonly, a[0], a.tobytes()[:4])


check('a_view_over_an_array_is_writable_through', _array_view(),
      (False, 65, b'A hi'))


# ------------------------------------------------ stepped slices

def _stepped():
    m = memoryview(bytearray(b'abcdefgh'))
    return [bytes(m[k]) for k in (slice(None, None, 2), slice(None, None, -1),
                                  slice(1, 7, 3), slice(6, 1, -2),
                                  slice(5, 2), slice(None, None, -3))]


check('stepped_slices_read_through_their_stride', _stepped(),
      [b'aceg', b'hgfedcba', b'be', b'gec', b'', b'heb'])


def _stepped_write():
    b = bytearray(b'abcdefgh')
    m = memoryview(b)
    m[::2][1] = ord('X')
    return (bytes(b), bytes(m[::2][::-1]), bytes(m[::-1][1:3]))


check('a_stepped_view_writes_through_and_composes', _stepped_write(),
      (b'abXdefgh', b'geXa', b'gf'))
check('a_stepped_view_is_not_castable_and_step_zero_is_refused',
      (outcome(lambda: memoryview(bytearray(4))[::2].cast('B')),
       outcome(lambda: memoryview(bytearray(4))[::0])),
      ('TypeError: memoryview: casts are restricted to C-contiguous views',
       'ValueError: slice step cannot be zero'))


# ------------------------------------------------ pack_into's buffer check

def _pack_into_refusals():
    wb = memoryview(array.array('b', b' ' * 10))
    return [outcome(struct.pack_into, '2s', buf, 0, b'hi')
            for buf in ([0] * 10, wb[::2], wb[::-1], memoryview(b'x' * 10),
                        b' ' * 10)]


check('pack_into_refuses_anything_that_is_not_a_writable_buffer',
      _pack_into_refusals(),
      ['TypeError: argument must be read-write bytes-like object, not list',
       'TypeError: argument must be read-write bytes-like object, not memoryview',
       'TypeError: argument must be read-write bytes-like object, not memoryview',
       'TypeError: argument must be read-write bytes-like object, not memoryview',
       'TypeError: argument must be read-write bytes-like object, not bytes'])


# ------------------------------------------------ half-initialized Struct

def _half_initialized():
    S = struct.Struct.__new__(struct.Struct)
    spam = array.array('b', b' ')
    out = [outcome(f) for f in (lambda: S.pack(1), lambda: S.unpack(spam),
                                lambda: S.iter_unpack(spam),
                                lambda: S.pack_into(spam, 1),
                                lambda: S.unpack_from(spam),
                                lambda: S.format, lambda: repr(S))]
    return (set(out), S.size)


check('a_half_initialized_struct_refuses_every_operation', _half_initialized(),
      ({'RuntimeError: Struct object is not initialized'}, -1))


def _init_later():
    S = struct.Struct.__new__(struct.Struct)
    S.__init__('>h')
    return (S.size, S.format, S.pack(1))


check('a_half_initialized_struct_can_be_initialized_later', _init_later(),
      (2, '>h', b'\x00\x01'))


# ------------------------------------------------ unpack_iterator

def _unpack_iterator():
    it = struct.iter_unpack('b', b'ab')
    t = type(it)
    return (t.__name__, list(it), t is not type(iter([])),
            outcome(t))


check('iter_unpack_answers_an_uninstantiable_unpack_iterator',
      _unpack_iterator(),
      ('unpack_iterator', [(97,), (98,)], True,
       "TypeError: cannot create '_struct.unpack_iterator' instances"))


# ------------------------------------------------ import_fresh_module

def _fresh_import():
    import gc
    import os
    import sys
    import weakref
    from test.support import import_helper
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)
    name = 'fresh_import_target'
    was_loaded = name in sys.modules
    m = import_helper.import_fresh_module(name)
    value = m.VALUE
    ref = weakref.ref(m)
    del m
    gc.collect()
    return (was_loaded, value, name in sys.modules, ref() is None)


check('a_fresh_import_leaves_sys_modules_alone_and_is_collectable',
      _fresh_import(), (False, 42, False, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
