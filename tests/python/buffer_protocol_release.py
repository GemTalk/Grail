"""Fixture: PEP 688's __buffer__ and __release_buffer__, as CPython runs them.

A Python class -- a bytearray subclass too -- exports a buffer through its
own __buffer__, and memoryview(x) asks it; releasing that view hands the view
__buffer__ answered to x.__release_buffer__ (Objects/typeobject.c's buffer
wrapper).  A class whose only hook is __release_buffer__ is handed a
restricted view of the buffer instead, one that makes no other view of it,
released afterwards.  bytes and bytearray carry the builtin pair:
__buffer__(flags) answers a view, __release_buffer__(view) releases one over
the receiver and refuses one over anything else.

Grail asked no bytearray subclass for its __buffer__, never called a
__release_buffer__, and bytearray had neither method -- test_buffer's
TestPythonBufferProtocol, from which these cases come.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class WhatToRelease:
    def __init__(self):
        self.held = False
        self.ba = bytearray(b"hello")
        self.created = None

    def __buffer__(self, flags):
        if self.held:
            raise TypeError("already held")
        self.held = True
        self.created = memoryview(self.ba)
        return self.created

    def __release_buffer__(self, buffer):
        self.same = buffer is self.created
        self.held = False


exporter = WhatToRelease()
with memoryview(exporter) as view:
    during = [exporter.held, view.tobytes()]
r['a_python_exporter_is_told'] = [during, exporter.held, exporter.same]

ba = bytearray(b"hello")
exported = ba.__buffer__(0)
r['the_builtin_pair'] = [exported.tobytes(), ba.__release_buffer__(exported),
                         outcome(lambda: exported.tobytes()).split(':')[0],
                         outcome(lambda: ba.__buffer__(sys.maxsize + 1)).split(':')[0],
                         outcome(lambda: ba.__release_buffer__(b'x'))]

calls = []


class Counted(bytearray):
    def __buffer__(self, flags):
        return super().__buffer__(flags)

    def __release_buffer__(self, view):
        calls.append(view.tobytes())
        super().__release_buffer__(view)


counted = Counted(b"hello")
with memoryview(counted) as view:
    before = [view.tobytes(), list(calls)]
r['a_subclass_overriding_both'] = [before, calls]

raised = []


class Elsewhere(bytearray):
    def __buffer__(self, flags):
        return memoryview(b"hello")

    def __release_buffer__(self, view):
        try:
            super().__release_buffer__(view)
        except ValueError as e:
            raised.append(str(e))


with memoryview(Elsewhere(b"other")) as view:
    answered = view.tobytes()
r['a_view_over_something_else'] = [answered, raised]

seen = {}


class OnlyRelease(bytearray):
    def __release_buffer__(self, buffer):
        seen['refused'] = [outcome(lambda: memoryview(buffer)).split(':')[0],
                           outcome(lambda: buffer.cast('b')).split(':')[0],
                           outcome(lambda: buffer.toreadonly()).split(':')[0],
                           outcome(lambda: buffer[:1]).split(':')[0],
                           outcome(lambda: buffer.__buffer__(0)).split(':')[0]]
        seen['bytes'] = buffer.tobytes()
        seen['buffer'] = buffer
        super().__release_buffer__(buffer)


only = OnlyRelease(b"hello")
with memoryview(only) as view:
    pass
only.clear()
r['only_release_is_overridden'] = [seen['refused'], seen['bytes'],
                                   outcome(lambda: seen['buffer'].tobytes()).split(':')[0]]


class Base:
    def __buffer__(self, flags):
        return memoryview(b"hello A")


class BufferLast(Base, bytearray):
    def __buffer__(self, flags):
        return super().__buffer__(flags)


with memoryview(BufferLast(b"hello")) as view:
    r['the_mro_picks_the_buffer'] = view.tobytes()

r['bytes_methods_still_take_views'] = [b'abc'.find(memoryview(b'b')), b'-'.join([memoryview(b'a'), b'b']),
                                       bytes(memoryview(b'xy')), memoryview(b'ab').__buffer__(0).tobytes()]

EXPECTED = {
    'a_python_exporter_is_told': [[True, b'hello'], False, True],
    'the_builtin_pair': [b'hello', None, 'ValueError', 'OverflowError',
                         'TypeError: expected a memoryview object'],
    'a_subclass_overriding_both': [[b'hello', []], [b'hello']],
    'a_view_over_something_else': [b'hello', ["memoryview's buffer is not this object"]],
    'only_release_is_overridden': [['ValueError'] * 5, b'hello', 'ValueError'],
    'the_mro_picks_the_buffer': b'hello A',
    'bytes_methods_still_take_views': [1, b'a-b', b'xy', b'ab'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
