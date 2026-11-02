"""Fixture: locale's functions, in the C locale every program starts in.

CPython's locale.py carries its own emulation of _locale for a build without
it -- the C locale, which is the one LC_NUMERIC and LC_MONETARY start in
anywhere -- and Grail, which has no OS locale, now runs that file verbatim.
Its old stub had none of format_string, atof, atoi, str, delocalize,
localize or currency, so test_types' test_int__format__locale and
test_float__format__locale raised AttributeError, and it claimed
('en_US', 'UTF-8') for a C locale it was not running in.

Only what the C locale fixes is checked, so the checks hold under CPython's
real _locale too, on any machine -- not the grouping, which the emulation
spells [CHAR_MAX] where a real C locale says [], both meaning none.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import locale

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


conventions = locale.localeconv()
r['the_numeric_conventions'] = [conventions['decimal_point'], conventions['thousands_sep']]
r['format_string'] = [locale.format_string('%d', 1234567, grouping=True),
                      locale.format_string('%.2f', 1234.5, grouping=True),
                      locale.format_string('%s and %d', ('a', 2)),
                      locale.format_string('%(x)05d', {'x': 42})]
r['format_string_is_format_n'] = all(
    locale.format_string('%g', x, grouping=True) == format(x, 'n')
    and locale.format_string('%.10g', x, grouping=True) == format(x, '.10n')
    and locale.format_string('%d', int(x), grouping=True) == format(int(x), 'n')
    for x in (1234567890.0 * 10.0 ** i for i in range(-10, 10)))
r['reading_numbers'] = [locale.atof('3.5'), locale.atoi('42'), locale.delocalize('1.5'), locale.localize('2.5')]
r['str'] = [locale.str(2.5), locale.str(1e20)]
r['no_currency_in_c'] = outcome(lambda: locale.currency(1.5))
r['normalize'] = [locale.normalize('en_US.UTF8'), locale.normalize('C')]
r['querying_the_numeric_locale'] = locale.setlocale(locale.LC_NUMERIC)

EXPECTED = {
    'the_numeric_conventions': ['.', ''],
    'format_string': ['1234567', '1234.50', 'a and 2', '00042'],
    'format_string_is_format_n': True,
    'reading_numbers': [3.5, 42, '1.5', '2.5'],
    'str': ['2.5', '1e+20'],
    'no_currency_in_c': "ValueError: Currency formatting is not possible using the 'C' locale.",
    'normalize': ['en_US.UTF-8', 'C'],
    'querying_the_numeric_locale': 'C',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
