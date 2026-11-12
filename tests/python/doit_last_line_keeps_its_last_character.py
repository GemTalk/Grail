"""Fixture: a traceback's source line for a doit's last line is whole (#1982).

Code compiled under a name that is not a file on disk has no source for
linecache to read.  CPython then shows no source line for its frames; Grail
shows the line its code generator recorded, a deliberate difference.  That
recorded line lost its last character when it was the last line of a source
with no trailing newline -- ``g(0'' for ``g(0)'', ``z'' for ``zz'' -- and the
caret line under it went too, its columns now past the line's end.

So each check asks what holds in both: a frame's line is either empty, as
CPython's is, or the whole line of the source, as Grail's is now, and a
formatted traceback never shows a cut line.  Every check holds under CPython
3.14, which is what makes it evidence.
"""

import traceback

FILENAME = '/nonexistent-grail-fixture-directory/sums.py'
r = {}


def frames_of(source):
    try:
        exec(compile(source, FILENAME, 'exec'), {})
    except Exception as error:
        return [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == FILENAME], error
    return [], None


def lines_are_empty_or_whole(source):
    frames, _ = frames_of(source)
    lines = source.split('\n')
    return [frame.line in ('', lines[frame.lineno - 1].strip()) for frame in frames]


def no_cut_line_is_shown(source, cut):
    _, error = frames_of(source)
    return all(('    ' + cut + '\n') not in chunk for chunk in traceback.format_exception(error))


r['a_call_on_the_last_line'] = lines_are_empty_or_whole('def g(b):\n    return 1/b\ng(0)')
r['a_name_alone'] = lines_are_empty_or_whole('zz')
r['a_name_after_another_line'] = lines_are_empty_or_whole('x = 1\nzz')
r['a_trailing_newline_was_already_whole'] = lines_are_empty_or_whole('def g(b):\n    return 1/b\ng(0)\n')
r['the_formatted_traceback_shows_no_cut_line'] = [no_cut_line_is_shown('def g(b):\n    return 1/b\ng(0)', 'g(0'),
                                                  no_cut_line_is_shown('zz', 'z')]

EXPECTED = {
    'a_call_on_the_last_line': [True, True],
    'a_name_alone': [True],
    'a_name_after_another_line': [True],
    'a_trailing_newline_was_already_whole': [True, True],
    'the_formatted_traceback_shows_no_cut_line': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
