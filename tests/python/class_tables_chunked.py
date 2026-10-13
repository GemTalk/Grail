"""A class's per-method tables answer the same when they are split.

A class carries class-side tables with an entry per method -- docstrings,
code objects, signatures, defaults, receivers, annotations, type parameters
-- and each was ONE accessor compiled from ONE string literal.  GemStone caps
a literal at 5M bytes of STORAGE, and one character above U+FFFF anywhere in
the class, escaped or not, stores the whole class-build text at four bytes a
character, so a class with thousands of methods (idna's generated UTS46Tests
has 6,329) failed to import with an uncatchable ``string literal too big''.

Tables over the budget are now split into chunk accessors.  This file is the
reading side: every table, read through what Python sees.  ClassTables-
ChunkedTestCase loads it at the real budget and at one small enough to split
every table, and the answers must not change.  This character, written
as itself and not escaped, sets the module's storage width: 😀.

Every expectation was measured against CPython 3.14.
"""

import inspect

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


class Holder:
    def first(self, a, b=2, *, c=3):
        """The first method."""
        return a + b + c

    def second(self, x: int, y: str = 'y') -> str:
        """The second method."""
        return '%s%s' % (x, y)

    @classmethod
    def third(cls, z=None):
        """The third method."""
        return z

    @staticmethod
    def fourth(w, v=4):
        return w * v

    def fifth[T](self, t: T) -> T:
        """The fifth method, generic."""
        return t

    def fifth_b[U, *Ts](self, u: U) -> U:
        return u

    def sixth(self):
        """The sixth method \U0001F600."""
        return 6


check('docstrings', [Holder.first.__doc__, Holder.second.__doc__, Holder.third.__doc__,
                     Holder.fourth.__doc__, Holder.sixth.__doc__],
      ['The first method.', 'The second method.', 'The third method.', None,
       'The sixth method \U0001F600.'])
check('code_objects', [Holder.first.__code__.co_name, Holder.sixth.__code__.co_name,
                       Holder.sixth.__code__.co_firstlineno - Holder.first.__code__.co_firstlineno],
      ['first', 'sixth', 24])
check('signatures', [str(inspect.signature(Holder().first)), str(inspect.signature(Holder.third)),
                     str(inspect.signature(Holder.fourth))],
      ['(a, b=2, *, c=3)', '(z=None)', '(w, v=4)'])
check('defaults', [Holder.first.__defaults__, Holder.first.__kwdefaults__,
                   Holder.third.__defaults__, Holder.second.__defaults__],
      [(2,), {'c': 3}, (None,), ('y',)])
check('calls', [Holder().first(1), Holder().second(1), Holder.third(), Holder.fourth(2),
                Holder().fifth('t'), Holder().sixth()],
      [6, '1y', None, 8, 't', 6])
check('annotations', [Holder.second.__annotations__], [{'x': int, 'y': str, 'return': str}])
check('type_params', [[p.__name__ for p in Holder.fifth.__type_params__],
                      [p.__name__ for p in Holder.fifth_b.__type_params__]], [['T'], ['U', 'Ts']])


def _overflowing_class():
    """A class whose docstring table alone is past the limit at four bytes a
    character: 48 methods with 28,000-character docstrings is 1.34M
    characters, 5.4M bytes, once the one astral-plane character -- spelled
    as an escape, so the source itself is ASCII -- widens the build text.
    Built and run through exec so no fixture has to hold it."""
    lines = ['class Big:', "    face = '\\U0001F600'"]
    for i in range(48):
        lines.append('    def m%d(self):' % i)
        lines.append('        """%s"""' % (chr(ord('a') + i % 26) * 28000))
        lines.append('        return %d' % i)
    ns = {}
    exec(compile('\n'.join(lines) + '\n', '<big>', 'exec'), ns)
    big = ns['Big']
    return [len(big.m0.__doc__), big.m47.__doc__[:3], big().m47(), big.m25.__doc__[-1],
            len(big.face)]


check('a_class_past_the_literal_limit', _overflowing_class(), [28000, 'vvv', 47, 'z', 1])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
