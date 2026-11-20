"""Fixture: a mixin whose methods reach a subclass through the MI merge.

The merge gives ``Merged`` its own copy of each method of its secondary base
``Mixin``.  An IR-built method is copied by regenerating it from its IR
builder.  Until plan P2.3b it could also be copied by recompiling the
Smalltalk text it replaced, which every IR class kept in a class-side table,
``___irTextSources___``, compiled from string literals in the class-build
code.  A character above U+FFFF anywhere in a class made those literals four
bytes a character, test_builtin's BuiltinTest outgrew GemStone's 5M-byte
limit, and the table had to be split into chunks -- what this fixture was
written for.  The table is gone; the fixture stays as a merge of methods that
include quotes and an astral-plane character (``astral``), every one of which
has to be callable on ``Merged``.  ``IRMergeRegenerateTestCase`` runs it under
Grail; run as a script, it is its own CPython oracle.
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
