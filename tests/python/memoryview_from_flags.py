"""Fixture: memoryview hands __buffer__ the flags it asks with, as CPython's does.

A Python class exports a buffer by defining __buffer__(self, flags) (PEP 688),
and the flags say what the view needs: inspect.BufferFlags.WRITABLE, FORMAT,
and so on.  CPython's memoryview(obj) asks with PyBUF_FULL_RO (284), so a
read-only view; memoryview._from_flags(obj, flags) asks with exactly the
flags given (Objects/memoryobject.c:1023-1036), and a builtin read-only
buffer refuses WRITABLE as PyBuffer_FillInfo does.  Grail handed __buffer__
0, had no memoryview._from_flags, and its inspect had no BufferFlags
(test_buffer test_buffer_flags).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Exporter:
    def __init__(self, mutable):
        self.data = bytearray(b'hello')
        self.mutable = mutable
        self.asked = []

    def __buffer__(self, flags):
        self.asked.append(int(flags))
        if flags & inspect.BufferFlags.WRITABLE:
            if not self.mutable:
                raise RuntimeError('not mutable')
            return memoryview(self.data)
        return memoryview(bytes(self.data))


def plain_view():
    exporter = Exporter(False)
    with memoryview(exporter) as view:
        return [exporter.asked, view.readonly, outcome(lambda: view.__setitem__(0, 120))]


def writable_view():
    exporter = Exporter(True)
    with memoryview._from_flags(exporter, inspect.BufferFlags.WRITABLE) as view:
        view[0] = ord('x')
        return [exporter.asked, view.readonly, bytes(exporter.data)]


def simple_view():
    exporter = Exporter(True)
    with memoryview._from_flags(exporter, inspect.BufferFlags.SIMPLE) as view:
        return [exporter.asked, view.readonly]


r['buffer_flags_are_cpythons'] = outcome(lambda: [int(f) for f in (
    inspect.BufferFlags.SIMPLE, inspect.BufferFlags.WRITABLE, inspect.BufferFlags.FORMAT,
    inspect.BufferFlags.ND, inspect.BufferFlags.STRIDES, inspect.BufferFlags.INDIRECT,
    inspect.BufferFlags.FULL, inspect.BufferFlags.FULL_RO, inspect.BufferFlags.READ,
    inspect.BufferFlags.WRITE)])
r['memoryview_asks_for_full_read_only'] = outcome(plain_view)
r['from_flags_hands_its_flags_to_buffer'] = outcome(writable_view)
r['a_simple_request_is_read_only'] = outcome(simple_view)
r['buffer_may_refuse_a_writable_request'] = outcome(
    lambda: memoryview._from_flags(Exporter(False), inspect.BufferFlags.WRITABLE))
r['a_builtin_buffer_answers_as_its_own'] = [
    outcome(lambda: memoryview._from_flags(bytes(3), inspect.BufferFlags.WRITABLE)),
    outcome(lambda: memoryview._from_flags(bytearray(3), inspect.BufferFlags.WRITABLE).readonly),
    outcome(lambda: memoryview._from_flags(b'ab', 0).readonly)]
r['its_arguments_are_refused_as_clinic_refuses_them'] = [
    outcome(lambda: memoryview._from_flags(3, 0)), outcome(lambda: memoryview._from_flags(b'x', 'a')),
    outcome(lambda: memoryview._from_flags(b'x'))]
r['what_is_no_buffer_is_named'] = [outcome(lambda: memoryview(value)) for value in (3, None)]

EXPECTED = {
    'buffer_flags_are_cpythons': [0, 1, 4, 8, 24, 280, 285, 284, 256, 512],
    'memoryview_asks_for_full_read_only': [[284], True, 'TypeError: cannot modify read-only memory'],
    'from_flags_hands_its_flags_to_buffer': [[1], False, b'xello'],
    'a_simple_request_is_read_only': [[0], True],
    'buffer_may_refuse_a_writable_request': 'RuntimeError: not mutable',
    'a_builtin_buffer_answers_as_its_own': ['BufferError: Object is not writable.', False, True],
    'its_arguments_are_refused_as_clinic_refuses_them': [
        "TypeError: memoryview: a bytes-like object is required, not 'int'",
        "TypeError: 'str' object cannot be interpreted as an integer",
        "TypeError: _from_flags() missing required argument 'flags' (pos 2)"],
    'what_is_no_buffer_is_named': [
        "TypeError: memoryview: a bytes-like object is required, not 'int'",
        "TypeError: memoryview: a bytes-like object is required, not 'NoneType'"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
