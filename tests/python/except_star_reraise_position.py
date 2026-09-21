"""Which source CPython blames for a re-raise out of an ``except*'' clause.

CPython blames the WHOLE CLAUSE -- the keyword through the end of its body --
so the frame renders two source lines, not one:

    File "...", line N, in exc
      except* Exception as e:
          raise

That extent belongs to no AST node (a handler's endPosition is wherever the
clause is followed by, and a bare ``raise'' answers one character past its
start), so both codegen paths work it out from the source text.  This fixture
pins the result rather than the mechanism, and it covers two nestings because
they failed differently: a module-level def lost only the second line, while a
def nested in a method reported the enclosing ``def'' line and a three-line
span.
"""

import traceback


def module_level():
    try:
        raise Exception(42)
    except* Exception as e:
        raise


class Host:
    def make(self):
        def nested():
            try:
                raise Exception(42)
            except* Exception as e:
                raise
        return nested


def two_clauses():
    """Several clauses: which one re-raised is a RUNTIME fact.

    Neither path stamps a clause here -- one compile-time span cannot name a
    different clause per run -- so this case pins that the frame is still
    REASONABLE rather than that it names the clause.
    """
    try:
        raise Exception(42)
    except* ValueError as e:
        raise
    except* Exception as e:
        raise


def frame_parts(fn):
    """(line numbers, source lines) of the group's own traceback frames for fn.

    Only the lines carrying the ``  | '' gutter, which is the group's own
    traceback; the file PATH is dropped because it differs between a CPython
    run of this file and a Grail one.
    """
    try:
        fn()
    except BaseException as e:
        text = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
    else:
        return [], ['NO EXCEPTION']
    numbers, sources = [], []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith('|'):
            continue
        body = stripped[1:].strip()
        if body.startswith('File "'):
            numbers.append(int(body.rsplit(', line ', 1)[1].split(',')[0]))
        elif body:
            sources.append(body)
    return numbers, sources


# Located from each def's OWN code object rather than counted from the class,
# because counting from the wrong def is a silent off-by-two: CPython caught it
# here, which is the whole point of running the fixture under CPython first.
MODULE_EXCEPT_LINE = module_level.__code__.co_firstlineno + 3


def report():
    out = {}

    numbers, sources = frame_parts(module_level)
    out['module_blames_except_line'] = MODULE_EXCEPT_LINE in numbers
    out['module_shows_except_keyword'] = 'except* Exception as e:' in sources
    out['module_shows_the_raise'] = 'raise' in sources
    out['module_has_no_def_line'] = not any(s.startswith('def ') for s in sources)
    out['module_has_no_elision'] = not any('...<' in s for s in sources)

    nested = Host().make()
    numbers, sources = frame_parts(nested)
    out['nested_blames_except_line'] = (
        nested.__code__.co_firstlineno + 3) in numbers
    out['nested_shows_except_keyword'] = 'except* Exception as e:' in sources
    out['nested_shows_the_raise'] = 'raise' in sources
    out['nested_has_no_def_line'] = not any(s.startswith('def ') for s in sources)
    out['nested_has_no_elision'] = not any('...<' in s for s in sources)

    numbers, sources = frame_parts(two_clauses)
    out['two_clauses_still_reports_a_frame'] = len(numbers) > 0
    out['two_clauses_group_is_reported'] = any(
        s.startswith('ExceptionGroup') for s in sources)

    return out


EXPECTED = {
    'module_blames_except_line': True,
    'nested_blames_except_line': True,
    'module_shows_except_keyword': True,
    'module_shows_the_raise': True,
    'module_has_no_def_line': True,
    'module_has_no_elision': True,
    'nested_shows_except_keyword': True,
    'nested_shows_the_raise': True,
    'nested_has_no_def_line': True,
    'nested_has_no_elision': True,
    'two_clauses_still_reports_a_frame': True,
    'two_clauses_group_is_reported': True,
}

r = report()


def main():
    for key in sorted(EXPECTED):
        got = r[key]
        print('%-34s %s %r' % (key, 'OK  ' if got == EXPECTED[key] else 'DIFF', got))


if __name__ == '__main__':
    main()
