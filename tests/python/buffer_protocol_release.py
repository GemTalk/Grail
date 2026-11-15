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

The hooks are the ones the MRO finds, so a base written left of bytearray
supplies them.  And a view held by a ``with'' is an export: its bytearray
refuses every resize with BufferError until the view is released, while
writes that change no size still go.  Grail counts no other view (see
bytearray>>size:), so only views a ``with'' holds are checked here.

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


def raised(thunk):
    try:
        thunk()
    except Exception as e:
        return type(e).__name__
    return 'no error'


def a_mixin_hook_precedes_bytearray():
    # test_multiple_inheritance_buffer_last: the release hook of a base LEFT
    # of bytearray in the MRO is the one run.  The view __buffer__ answered is
    # over the exporter itself, so the hook is handed a restricted view,
    # released afterwards; keeping it keeps a released view.  A base RIGHT of
    # bytearray is not run at all.
    class Releaser:
        def __release_buffer__(self, buffer):
            self.buffer = buffer

    class Keeper(Releaser, bytearray):
        def __buffer__(self, flags):
            return super().__buffer__(flags)

    class SubKeeper(Keeper):
        pass

    class ReleaseOnly(Releaser, bytearray):
        pass

    class BytearrayFirst(bytearray, Releaser):
        buffer = None

        def __buffer__(self, flags):
            return super().__buffer__(flags)

    out = []
    for cls in (Keeper, SubKeeper, ReleaseOnly):
        x = cls(b"hello")
        with memoryview(x) as view:
            during = view.tobytes()
        out.append([during, raised(lambda: x.buffer.tobytes())])
    first = BytearrayFirst(b"hello")
    with memoryview(first):
        pass
    out.append(first.buffer)
    return out


r['a_mixin_hook_precedes_bytearray'] = a_mixin_hook_precedes_bytearray()


def imul(b):
    b *= 2


def iadd(b):
    b += b'x'


def a_with_holds_the_export():
    # test_release_buffer_with_exception_set: a view held by a with refuses
    # every resize of its bytearray, and writes that change no size still go.
    resizes = [lambda b: b.extend(b'x'), lambda b: b.extend(memoryview(b'x')), lambda b: b.append(1),
               lambda b: b.clear(), lambda b: b.pop(), lambda b: b.pop(1), lambda b: b.insert(0, 1),
               lambda b: b.remove(ord('b')), lambda b: b.__delitem__(0), lambda b: b.__delitem__(slice(0, 2)),
               lambda b: b.__setitem__(slice(0, 1), b'xyz'), lambda b: b.resize(10), iadd, imul]
    same_size = [lambda b: b.__setitem__(0, 0x7a), lambda b: b.__setitem__(slice(0, 2), b'zz'),
                 lambda b: b.extend(b''), lambda b: b.__setitem__(slice(1, 1), b''),
                 lambda b: b.resize(len(b))]
    out = []
    for group in (resizes, same_size):
        seen = []
        for op in group:
            b = bytearray(b"abcdef")
            with memoryview(b):
                during = raised(lambda: op(b))
            seen.append([during, raised(lambda: op(b))])
        out.append(seen)
    return out


r['a_with_holds_the_export'] = a_with_holds_the_export()


def leaving_the_with_ends_the_export():
    out = []
    b = bytearray(b"ab")
    with memoryview(b) as view:
        view.release()
        out.append(raised(lambda: b.extend(b'c')))
    b = bytearray(b"ab")
    try:
        with memoryview(b):
            raise KeyError('k')
    except KeyError:
        pass
    out.append(raised(lambda: b.extend(b'c')))

    def returns_from_inside(b):
        with memoryview(b) as view:
            return view[0]

    b = bytearray(b"ab")
    returns_from_inside(b)
    out.append(raised(lambda: b.extend(b'c')))
    b = bytearray(b"ab")
    with memoryview(b) as view:
        with view:
            pass
        out.append(raised(lambda: b.extend(b'c')))

    # Abandoned mid-with: CPython closes the generator at the break.
    def chunks(b):
        with memoryview(b) as view:
            for i in range(0, len(b), 2):
                yield bytes(view[i:i + 2])

    b = bytearray(b"abcdef")
    for chunk in chunks(b):
        break
    out.append(raised(lambda: b.extend(b'g')))
    # asyncio's StreamReader.read(): a view dropped, then the resize.
    b = bytearray(b"abcdef")
    n = len(bytes(memoryview(b)[:2]))
    del b[:n]
    out.append(bytes(b))
    return out


r['leaving_the_with_ends_the_export'] = leaving_the_with_ends_the_export()

separator = bytearray(b',')


def parts():
    separator[0:1] = b';'
    yield b'A'
    yield b'B'


r['a_join_allows_a_same_size_write'] = separator.join(parts())

EXPECTED = {
    'a_python_exporter_is_told': [[True, b'hello'], False, True],
    'the_builtin_pair': [b'hello', None, 'ValueError', 'OverflowError',
                         'TypeError: expected a memoryview object'],
    'a_subclass_overriding_both': [[b'hello', []], [b'hello']],
    'a_view_over_something_else': [b'hello', ["memoryview's buffer is not this object"]],
    'only_release_is_overridden': [['ValueError'] * 5, b'hello', 'ValueError'],
    'the_mro_picks_the_buffer': b'hello A',
    'bytes_methods_still_take_views': [1, b'a-b', b'xy', b'ab'],
    'a_mixin_hook_precedes_bytearray': [[b'hello', 'ValueError']] * 3 + [None],
    'a_with_holds_the_export': [[['BufferError', 'no error']] * 14, [['no error', 'no error']] * 5],
    'leaving_the_with_ends_the_export': ['no error'] * 5 + [b'cdef'],
    'a_join_allows_a_same_size_write': bytearray(b'A;B'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
