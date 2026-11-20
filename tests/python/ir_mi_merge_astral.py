"""Fixture: a mixin whose methods reach a subclass through the MI merge.

The merge copies a secondary base's methods by RE-COMPILING their Smalltalk
source.  An IR-built method's source is its Python, so the class carries the
text each IR method replaced in a class-side table, ``___irTextSources___`` --
and that table is compiled from ONE string literal in the class-build code.
GemStone refuses a literal over 5M bytes, counted in STORAGE bytes: a single
character above U+FFFF anywhere in the class's methods makes it a four-byte
string.  test_builtin's BuiltinTest reached 5.86 MB and would not import.

A table too large for one literal is now split into chunk accessors.  This
fixture is small; ``IRTextSourcesChunkedTestCase`` lowers the budget so it
splits anyway, and every method below has to survive the split to be callable
on ``Merged``.  ``astral`` puts an astral-plane character in the table, which
is what sets a chunk's storage width.
"""

r = {}


class Mixin:
    def plain(self):
        return 'plain'

    def astral(self):
        return 'snake \U0001F40D'

    def quoted(self):
        return "it's 'quoted' twice"

    def arith(self, n):
        return n * 7 + 1

    def calls_another(self):
        return self.plain() + '+' + self.quoted()

    def last(self):
        return 'last'


class Base:
    def base_only(self):
        return 'base'


class Merged(Base, Mixin):
    pass


m = Merged()
r['plain'] = m.plain()
r['astral'] = m.astral()
r['quoted'] = m.quoted()
r['arith'] = m.arith(6)
r['calls_another'] = m.calls_another()
r['last'] = m.last()
r['base_only'] = m.base_only()


EXPECTED = {
    'plain': 'plain',
    'astral': 'snake \U0001F40D',
    'quoted': "it's 'quoted' twice",
    'arith': 43,
    'calls_another': "plain+it's 'quoted' twice",
    'last': 'last',
    'base_only': 'base',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-16s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
