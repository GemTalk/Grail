"""Fixture: ``super()'' called with KEYWORD arguments, inside a method.

``super(x=1)'' is legal syntax -- ``super'' is an ordinary name, and CPython's
compiler does not look at the call's arguments at all -- and it raises at run
time, from the builtin itself: ``TypeError: super() takes no keyword
arguments''.  So does a non-empty ``**'' splat.

None of Grail's zero-argument rewrites claim the call: every one tests
``keywords isEmpty''.  The text therefore emits the ordinary call and the
builtin raises CPython's message.  The IR path refused it instead
(`CallAst:super-keywords'), because its stay-on-text test asked only whether
there were POSITIONAL arguments.  It now emits the same ordinary call.

ONE DIVERGENCE IS PINNED, not fixed, and it is the text's: ``super(**{})''.
An EMPTY splat passes no keywords, so CPython sees a plain zero-argument
``super()'' and binds a proxy.  Grail sees a keyword splat at compile time,
so neither path takes the zero-argument rewrite, and the builtin -- reached
with no arguments and no frame to inspect -- says ``no arguments''.  Both
paths raise that; the XFAIL keeps the difference visible.
"""

r = {}


def record(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


class Base:
    def who(self):
        return 'base'


class Child(Base):
    def keyword(self):
        return super(x=1)

    def keyword_after_use(self):
        # A working super() first, so the method really is a super() user.
        first = super().who()
        try:
            super(y=2)
        except TypeError as exc:
            return first, str(exc)

    def full_splat(self):
        return super(**{'a': 1})

    def empty_splat(self):
        return super(**{}).who()


record('keyword', lambda: Child().keyword())
record('keyword_after_use', lambda: Child().keyword_after_use())
record('full_splat', lambda: Child().full_splat())
record('empty_splat', lambda: Child().empty_splat())


EXPECTED = {
    'keyword': 'TypeError: super() takes no keyword arguments',
    'keyword_after_use':
        "NO RAISE: ('base', 'super() takes no keyword arguments')",
    'full_splat': 'TypeError: super() takes no keyword arguments',
}

# Grail's answer, recorded so a fix shows up as an XPASS here.
XFAIL = {
    'empty_splat': 'RuntimeError: super(): no arguments',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-20s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-20s is in neither table' % ('FAIL', extra))
