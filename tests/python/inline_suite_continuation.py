# A compound statement whose SUITE is on the header line, followed by a
# continuation clause.
#
#     if x: a = 1
#     else: a = 2
#
# is a SyntaxError in Grail, and was regardless of how the else body was
# written -- ``else:'' with an indented block failed the same way.  The block
# form of the if worked all along, so what the parser could not do was resume
# after an inline suite: parseSimpleStatements leaves the trailing NEWLINE
# unconsumed, a bare ``atKeyword: 'elif''' looked at that NEWLINE, found no
# continuation, and the clause fell out to statement level as
# ``Unexpected token: KEYWORD else''.
#
# parseTry met this first and atKeywordSkippingNewlines: was added for it --
# which consumes the newlines only when the keyword really follows -- but the
# conditional and loop statements never got the same treatment.  So ``try:'' and
# ``while:'' with an inline suite already worked while ``if'', ``elif'' and
# ``for'' did not, which is why the gap survived: the shapes that failed and the
# shapes that worked look identical.
#
# Found by porting CPython's pydoc, whose locate() is written this way:
#
#     if nextmodule: module, n = nextmodule, n + 1
#     else: break

r = {}


def if_else(x):
    if x: a = 1
    else: a = 2
    return a


def if_else_block(x):
    if x: a = 1
    else:
        a = 2
    return a


def block_if_inline_else(x):
    if x:
        a = 1
    else: a = 2
    return a


def elif_chain(x):
    if x == 1: a = 'one'
    elif x == 2: a = 'two'
    else: a = 'many'
    return a


def for_else(xs):
    got = []
    for i in xs: got.append(i)
    else: got.append('done')
    return got


def while_else(n):
    got = []
    while n: got.append(n); n = n - 1
    else: got.append('done')
    return got


def inline_break(x, limit):
    n = 0
    while n < limit:
        if x: n += 1
        else: break
    return n


def pydoc_locate_shape(parts):
    # The exact shape that surfaced this -- pydoc.locate().
    module, n = None, 0
    while n < len(parts):
        nextmodule = parts[n] if parts[n] else None
        if nextmodule: module, n = nextmodule, n + 1
        else: break
    return (module, n)


def try_except_inline():
    try: a = 1 / 0
    except ZeroDivisionError: a = 'caught'
    return a


r['if_else'] = repr((if_else(True), if_else(False)))
r['if_else_block'] = repr((if_else_block(True), if_else_block(False)))
r['block_if_inline_else'] = repr((block_if_inline_else(True), block_if_inline_else(False)))
r['elif_chain'] = repr([elif_chain(i) for i in (1, 2, 3)])
r['for_else'] = repr(for_else([1, 2]))
r['while_else'] = repr(while_else(2))
r['inline_break'] = repr((inline_break(True, 3), inline_break(False, 3)))
r['pydoc_locate_shape'] = repr(pydoc_locate_shape(['a', 'b', '', 'd']))
r['try_except_inline'] = repr(try_except_inline())

# An inline suite with no continuation must still not swallow what follows --
# atKeywordSkippingNewlines: restores its position when the keyword is absent.
def no_continuation(x):
    if x: a = 1
    return ('after', a if x else None)


r['no_continuation'] = repr((no_continuation(True), no_continuation(False)))


EXPECTED = {
    'block_if_inline_else': '(1, 2)',
    'elif_chain': "['one', 'two', 'many']",
    'for_else': "[1, 2, 'done']",
    'if_else': '(1, 2)',
    'if_else_block': '(1, 2)',
    'inline_break': '(3, 0)',
    'no_continuation': "(('after', 1), ('after', None))",
    'pydoc_locate_shape': "('b', 2)",
    'try_except_inline': "'caught'",
    'while_else': "[2, 1, 'done']",
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
