"""Fixture: UTF-7 ends a shifted run only where it must, as CPython does.

CPython's encoder (_PyUnicode_EncodeUTF7, Objects/unicodeobject.c:4938)
closes a base64 run with ``-'' only before a base64 character or a ``-'',
and at the end of the string: any other direct character ends the run
implicitly.  A ``+'' met inside a run is encoded in it rather than written
``+-''.  test_str's test_codecs_utf7 compares the bytes.

Grail wrote the ``-'' after every run and wrote every ``+'' as ``+-''.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def utf7(text):
    return text.encode('utf-7')


r['a_non_base64_direct_char_ends_the_run'] = [utf7('A≢Α.'), utf7('é!'), utf7('é '),
                                             utf7('é\n')]
r['a_base64_char_needs_the_dash'] = [utf7('éa'), utf7('é/'), utf7('é5')]
r['a_dash_needs_the_dash'] = utf7('é-')
r['the_end_of_the_string'] = [utf7('é'), utf7('aé')]
r['plus_inside_a_run'] = [utf7('é+'), utf7('é+a')]
r['plus_outside_a_run'] = [utf7('a+b'), utf7('+')]
r['round_trips'] = all(utf7(s).decode('utf-7') == s for s in
                       ('A≢Α.', 'é+a', 'a+b', 'é-', 'é x', '\U0001f600.'))

EXPECTED = {
    'a_non_base64_direct_char_ends_the_run': [b'A+ImIDkQ.', b'+AOk!', b'+AOk ', b'+AOk\n'],
    'a_base64_char_needs_the_dash': [b'+AOk-a', b'+AOk-/', b'+AOk-5'],
    'a_dash_needs_the_dash': b'+AOk--',
    'the_end_of_the_string': [b'+AOk-', b'a+AOk-'],
    'plus_inside_a_run': [b'+AOkAKw-', b'+AOkAKw-a'],
    'plus_outside_a_run': [b'a+-b', b'+-'],
    'round_trips': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
