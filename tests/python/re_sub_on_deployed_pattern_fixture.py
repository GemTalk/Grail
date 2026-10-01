"""re.sub / subn / Match.expand with a callable or a template, on a deployed pattern.

Two defects in SrePattern's substitution path (#1253):

1. It ENDED THE PROCESS for a pattern from a deployed module.  The path's first
   statement looked ``re._parser'' up BY NAME in the session's sys.modules,
   with no fallback and no import -- before it even knew whether it needed a
   parser.  A fresh session that warm-binds a deployed module never registers
   re's submodules, so the lookup was an uncatchable LookupError.  Whether it
   failed depended on whether anything earlier in the session had compiled a
   regex, which is why it looked intermittent.  Match.expand did the same.

2. "Callable" was decided by CLASS -- a BoundMethod, a block or a method -- so
   a callable instance, functools.partial, operator.itemgetter or a class was
   treated as a template and its repr spliced into the result as text.

Driven from tests/scripts/runReSubOnDeployedPatternTest.gs, whose fresh session
is the only place defect 1 can be seen.  Running this file directly checks the
expected values under real CPython.
"""

import functools
import operator
import re

REFERENCE = re.compile(r"&(\w+);")
GROUP = re.compile(r"(a)")


class Repl:
    def __call__(self, match):
        return '<' + match.group(1) + '>'


def tagged(match, tag):
    return tag


def deployed_shapes():
    """Every substitution shape, on a module-level pattern."""
    s = 'a&amp;b'
    return (REFERENCE.sub('X', s),
            REFERENCE.sub(lambda m: 'X', s),
            REFERENCE.sub(r'<\1>', s),
            REFERENCE.subn(lambda m: 'X', s),
            REFERENCE.search(s).expand(r'\1'))


def callable_shapes():
    """Callables that are not functions."""
    return (GROUP.sub(Repl(), 'xa'),
            GROUP.sub(functools.partial(tagged, tag='P'), 'xa'),
            GROUP.sub(operator.itemgetter(0), 'xa'),
            GROUP.sub(str, 'xa'),
            GROUP.subn(Repl(), 'xa'))


DEPLOYED_SHAPES = ('aXb', 'aXb', 'a<amp>b', ('aXb', 1), 'amp')
CALLABLE_SHAPES = ('x<a>', 'xP', 'xa', "x<re.Match object; span=(1, 2), match='a'>",
                   ('x<a>', 1))

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


if __name__ == '__main__':
    check('every_substitution_shape_on_a_module_level_pattern',
          deployed_shapes(), DEPLOYED_SHAPES)
    check('a_callable_that_is_not_a_function_is_called',
          callable_shapes(), CALLABLE_SHAPES)
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
