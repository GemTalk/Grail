"""Fixtures for rendering a PEP 654 exception GROUP as a tree.

Driven by PythonTests>>ExceptionGroupTracebackTestCase.  Each check answers True
when the behaviour matches CPython, so a failure names the specific rule.

A group is the one exception that does not render as a single block of text.  Its
children are drawn inside a box:

    + Exception Group Traceback (most recent call last):
    |   File "...", line 12, in f
    | ExceptionGroup: eg (2 sub-exceptions)
    +-+---------------- 1 ----------------
      | ValueError: first
      +---------------- 2 ----------------
      | ValueError: second
      +------------------------------------

Grail rendered the group's own line and stopped -- the children were simply
absent, so a group reported strictly less than it knew.  Three separate pieces
were missing, and each is checked below.

1. ``format_exception_only(eg, show_group=True)'' indents each nesting level by
   THREE spaces.  Grail used two, and indented cumulatively (each level
   prefixing the level below) rather than from the absolute depth.  The
   difference is not only the width: the depth also decides whether a
   multi-line MESSAGE is split into one line per string, which is what lets
   every line of it carry the indent.  The group's own message is NOT split.

2. ``TracebackException.exceptions'' has to exist -- a list of
   TracebackException for a group, None for anything else.  It was never built,
   so nothing downstream could render a tree even in principle, and
   ``max_group_width'' / ``max_group_depth'' were accepted and discarded.

3. ``format()'' and ``format_exception()'' have to draw the box.  The margin is
   positional state shared across the whole chain (CPython keeps it in a private
   _ExceptionPrintContext), which is why the module-level format_exception hands
   a group over to TracebackException instead of rendering it link by link.

NOT asserted here: the caret lines (``~^^'') CPython puts under the failing
expression, and the wording of ZeroDivisionError.  Both are independent gaps
that happen to show up inside group output -- Grail says "integer division or
modulo by zero" where CPython says "division by zero" -- and asserting them here
would make this file fail for reasons that have nothing to do with groups.  The
groups below are built directly from exception instances, as CPython's own
test_max_group_width / test_max_group_depth do, so no traceback text is involved.

Run this file under CPython (``python3 tests/python/exception_groups.py'') to see
what it produces -- that is where the expectations come from.
"""

import traceback


def _rendered(exc, **kwargs):
    """The tree as one string, through TracebackException."""
    te = traceback.TracebackException.from_exception(exc, **kwargs)
    return ''.join(te.format())


def a_nested_exception_is_indented_three_spaces():
    """Rule 1.  Two spaces was the single most common failure in CPython's
    group tests -- ten of them differ from Grail's old output in nothing else."""
    eg = ExceptionGroup('A', [ValueError('B')])
    return traceback.format_exception_only(eg, show_group=True) == [
        'ExceptionGroup: A (1 sub-exception)\n',
        '   ValueError: B\n',
    ]


def each_nesting_level_adds_three_more():
    eg = ExceptionGroup('A', [
        ValueError('B'),
        ExceptionGroup('C', [IndexError('D')]),
    ])
    return traceback.format_exception_only(eg, show_group=True) == [
        'ExceptionGroup: A (2 sub-exceptions)\n',
        '   ValueError: B\n',
        '   ExceptionGroup: C (1 sub-exception)\n',
        '      IndexError: D\n',
    ]


def a_nested_multiline_message_is_split_per_line():
    """The group's own ``A\\n1'' stays ONE string; the nested ``B\\n2'' becomes
    two, so the indent reaches the second line."""
    eg = ExceptionGroup('A\n1', [ValueError('B\n2')])
    return traceback.format_exception_only(eg, show_group=True) == [
        'ExceptionGroup: A\n1 (1 sub-exception)\n',
        '   ValueError: B\n',
        '   2\n',
    ]


def a_nested_note_is_indented_with_its_exception():
    exc = IndexError('D')
    exc.add_note('Note\nmultiline')
    eg = ExceptionGroup('A', [exc])
    return traceback.format_exception_only(eg, show_group=True) == [
        'ExceptionGroup: A (1 sub-exception)\n',
        '   IndexError: D\n',
        '   Note\n',
        '   multiline\n',
    ]


def a_nested_syntax_error_indents_its_location_block():
    """The location lines are already indented by 2 and 4, so nesting puts them
    at 5 and 7 -- prefixed, not re-derived."""
    exc = SyntaxError('error', ('x.py', 23, None, 'bad syntax'))
    eg = ExceptionGroup('A\n1', [exc])
    return traceback.format_exception_only(eg, show_group=True) == [
        'ExceptionGroup: A\n1 (1 sub-exception)\n',
        '     File "x.py", line 23\n',
        '       bad syntax\n',
        '   SyntaxError: error\n',
    ]


def an_indented_syntax_error_still_renders_at_top_level():
    """Not about groups, and here because adding the group indent BROKE it.

    The SyntaxError branch already had a variable called ``indent'', holding a
    WIDTH -- how much whitespace strip() removed from the source line, needed to
    place the caret.  The new nesting indent is a STRING and reused the name, so
    for any SyntaxError whose text was indented the width overwrote it and the
    render became ``int + str''.  It cost a test that had been merely failing
    (test_syntax_error_various_offsets, whose add=2 arm supplies exactly that),
    turning it into an error -- so this check is at depth 0, where the bug was.

    Asserted as a SHAPE rather than exact bytes, because the caret line is one
    place Grail and CPython still differ: CPython marks the whole offending span
    (``^^^^'') and Grail emits a single ``^''.  That gap is what
    test_syntax_error_various_offsets was already failing on before any of this,
    and pinning CPython's exact bytes here would assert the gap rather than the
    crash.  Everything this check does assert is identical under both.
    """
    exc = SyntaxError('msg', ('file.py', 1, 3, '  text'))
    lines = traceback.format_exception_only(exc)
    if len(lines) != 4:
        return False
    caret = lines[2]
    return (lines[0] == '  File "file.py", line 1\n'
            # The source line is rendered STRIPPED, indented by four.
            and lines[1] == '    text\n'
            and caret.startswith('    ')
            and set(caret.strip()) == set('^')
            and lines[3] == 'SyntaxError: msg\n')


def show_group_is_off_by_default():
    """The group's own line alone, which is what an ordinary traceback's last
    line has to be."""
    eg = ExceptionGroup('A', [ValueError('B')])
    return traceback.format_exception_only(eg) == [
        'ExceptionGroup: A (1 sub-exception)\n']


def a_group_reports_its_children_as_tracebackexceptions():
    """Rule 2.  A list for a group, None for anything else -- None rather than
    an empty list, because format() tests it to choose between a plain
    traceback and a tree."""
    eg = ExceptionGroup('A', [ValueError('B'), TypeError('C')])
    te = traceback.TracebackException.from_exception(eg)
    if te.exceptions is None or len(te.exceptions) != 2:
        return False
    kinds = [type(child).__name__ for child in te.exceptions]
    if kinds != ['TracebackException', 'TracebackException']:
        return False
    plain = traceback.TracebackException.from_exception(ValueError('x'))
    return plain.exceptions is None


def the_children_carry_their_own_messages():
    eg = ExceptionGroup('A', [ValueError('B'), TypeError('C')])
    te = traceback.TracebackException.from_exception(eg)
    rendered = [''.join(child.format_exception_only())
                for child in te.exceptions]
    return rendered == ['ValueError: B\n', 'TypeError: C\n']


def a_nested_group_child_is_itself_a_group():
    eg = ExceptionGroup('A', [ExceptionGroup('B', [ValueError('C')])])
    te = traceback.TracebackException.from_exception(eg)
    inner = te.exceptions[0]
    return inner.exceptions is not None and len(inner.exceptions) == 1


def format_draws_a_numbered_rule_per_child():
    """Rule 3.  The rules are what make the children findable in the output."""
    eg = ExceptionGroup('eg', [ValueError('first'), ValueError('second')])
    text = _rendered(eg)
    return ('+-+---------------- 1 ----------------' in text
            and '+---------------- 2 ----------------' in text
            and '+------------------------------------' in text)


def format_draws_the_whole_box():
    """The exact shape, so a change to any one line is caught rather than only
    the presence of the rules."""
    eg = ExceptionGroup('eg', [ValueError('first'), ValueError('second')])
    return ''.join(_rendered(eg)).split('\n') == [
        '  | ExceptionGroup: eg (2 sub-exceptions)',
        '  +-+---------------- 1 ----------------',
        '    | ValueError: first',
        '    +---------------- 2 ----------------',
        '    | ValueError: second',
        '    +------------------------------------',
        '',
    ]


def a_nested_group_is_indented_two_spaces_per_level():
    """The tree's indent is TWO per level, unlike show_group's three.  Both are
    CPython's, and they are genuinely different renderings."""
    eg = ExceptionGroup('outer', [ExceptionGroup('inner', [ValueError('x')])])
    return _rendered(eg).split('\n') == [
        '  | ExceptionGroup: outer (1 sub-exception)',
        '  +-+---------------- 1 ----------------',
        '    | ExceptionGroup: inner (1 sub-exception)',
        '    +-+---------------- 1 ----------------',
        '      | ValueError: x',
        '      +------------------------------------',
        '',
    ]


def max_group_width_truncates_the_children():
    """Two shown, the rest counted.  The ``...'' rule takes the place of the
    third child, so a truncated group draws width+1 rules."""
    eg = ExceptionGroup('eg', [ValueError(i) for i in range(5)])
    return _rendered(eg, max_group_width=2).split('\n') == [
        '  | ExceptionGroup: eg (5 sub-exceptions)',
        '  +-+---------------- 1 ----------------',
        '    | ValueError: 0',
        '    +---------------- 2 ----------------',
        '    | ValueError: 1',
        '    +---------------- ... ----------------',
        '    | and 3 more exceptions',
        '    +------------------------------------',
        '',
    ]


def one_truncated_exception_is_singular():
    """``and 1 more exception'', not ``exceptions''."""
    eg = ExceptionGroup('eg', [ValueError(i) for i in range(3)])
    return 'and 1 more exception\n' in _rendered(eg, max_group_width=2)


def max_group_depth_stops_the_nesting():
    exc = TypeError('bad type')
    for i in range(3):
        exc = ExceptionGroup('exc', [ValueError(-i), exc, ValueError(i)])
    return '... (max_group_depth is 2)' in _rendered(exc, max_group_depth=2)


def the_depth_limit_keeps_the_siblings_of_what_it_elided():
    """The elision replaces one CHILD, not the rest of the group: the third
    child of that group still renders."""
    exc = TypeError('bad type')
    for i in range(3):
        exc = ExceptionGroup('exc', [ValueError(-i), exc, ValueError(i)])
    return _rendered(exc, max_group_depth=2).split('\n') == [
        '  | ExceptionGroup: exc (3 sub-exceptions)',
        '  +-+---------------- 1 ----------------',
        '    | ValueError: -2',
        '    +---------------- 2 ----------------',
        '    | ExceptionGroup: exc (3 sub-exceptions)',
        '    +-+---------------- 1 ----------------',
        '      | ValueError: -1',
        '      +---------------- 2 ----------------',
        '      | ... (max_group_depth is 2)',
        '      +---------------- 3 ----------------',
        '      | ValueError: 1',
        '      +------------------------------------',
        '    +---------------- 3 ----------------',
        '    | ValueError: 2',
        '    +------------------------------------',
        '',
    ]


def format_exception_renders_the_tree_too():
    """The module-level entry point, which is what an uncaught group prints
    through.  It hands a group over to TracebackException rather than rendering
    it link by link, because the margin is state the link walk cannot carry."""
    try:
        raise ExceptionGroup('eg', [ValueError('first'), KeyError('second')])
    except BaseExceptionGroup as e:
        text = ''.join(traceback.format_exception(e))
    return ('+---------------- 1 ----------------' in text
            and '+---------------- 2 ----------------' in text
            and 'ValueError: first' in text)


def a_group_still_reports_its_own_traceback():
    """``Exception Group Traceback'', not the plain header -- the group's own
    frames are inside the box, above the children."""
    try:
        raise ExceptionGroup('eg', [ValueError('x')])
    except BaseExceptionGroup as e:
        text = ''.join(traceback.format_exception(e))
    return ('Exception Group Traceback (most recent call last):' in text
            and 'exception_groups.py' in text)


def a_group_with_a_non_group_chain_link_still_chains():
    """A group can be the SECOND half of a chain, and the connector line has to
    survive the handover to TracebackException."""
    try:
        try:
            raise ValueError('cause')
        except ValueError:
            raise ExceptionGroup('eg', [KeyError('child')])
    except BaseExceptionGroup as e:
        text = ''.join(traceback.format_exception(e))
    return ('During handling of the above exception, another exception '
            'occurred:' in text
            and 'ValueError: cause' in text
            and '+---------------- 1 ----------------' in text)


def two_tracebackexceptions_from_one_group_are_equal():
    eg = ExceptionGroup('A', [ValueError('B')])
    a = traceback.TracebackException.from_exception(eg)
    b = traceback.TracebackException.from_exception(eg)
    return a is not b and a == b


def different_children_make_them_unequal():
    """What ``exceptions'' being part of the equality key buys: without it, two
    groups differing only in their children compared EQUAL."""
    a = traceback.TracebackException.from_exception(
        ExceptionGroup('A', [ValueError('B')]))
    b = traceback.TracebackException.from_exception(
        ExceptionGroup('A', [ValueError('C')]))
    return a != b


if __name__ == '__main__':
    checks = [
        a_nested_exception_is_indented_three_spaces,
        each_nesting_level_adds_three_more,
        a_nested_multiline_message_is_split_per_line,
        a_nested_note_is_indented_with_its_exception,
        a_nested_syntax_error_indents_its_location_block,
        an_indented_syntax_error_still_renders_at_top_level,
        show_group_is_off_by_default,
        a_group_reports_its_children_as_tracebackexceptions,
        the_children_carry_their_own_messages,
        a_nested_group_child_is_itself_a_group,
        format_draws_a_numbered_rule_per_child,
        format_draws_the_whole_box,
        a_nested_group_is_indented_two_spaces_per_level,
        max_group_width_truncates_the_children,
        one_truncated_exception_is_singular,
        max_group_depth_stops_the_nesting,
        the_depth_limit_keeps_the_siblings_of_what_it_elided,
        format_exception_renders_the_tree_too,
        a_group_still_reports_its_own_traceback,
        a_group_with_a_non_group_chain_link_still_chains,
        two_tracebackexceptions_from_one_group_are_equal,
        different_children_make_them_unequal,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
