"""Fixture: math's domain errors say what CPython 3.14 says.

CPython 3.14 replaced the generic ``math domain error'' with a message per
function that names the argument as repr(float): sin(inf) raises
``expected a finite input, got inf'', asin(2.0) ``expected a number in
range from -1 up to 1, got 2.0''.  test_math's ieee754.txt doctest checks
them, and Grail still said ``math domain error'' for sin, cos, tan, asin,
acos, acosh, log1p and lgamma.

Two more defects rode along.  The functions that already named the value
spelled an infinity as GemStone prints it (``got MinusInfinity''), and
log(x, 1) answered inf where CPython divides two floats and raises
ZeroDivisionError.  An integer argument to log2/log10 says just ``expected a
positive input'' (CPython's loghelper checks an int before converting it).

The generic message stays where CPython keeps it: fmod, remainder, pow.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import math

INF = float('inf')
NAN = float('nan')

r = {}


def _err(name, *args):
    try:
        return repr(getattr(math, name)(*args))
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


r['trig_infinite'] = (_err('sin', INF), _err('cos', -INF), _err('tan', INF))
r['trig_nan_passes'] = (_err('sin', NAN), _err('cos', NAN), _err('tan', NAN))
r['asin_acos_range'] = (_err('asin', 2.0), _err('acos', -2.0), _err('asin', -INF),
                        _err('acos', 1.5))
r['asin_acos_int_arg'] = (_err('asin', 2), _err('acos', -3))
r['acosh'] = (_err('acosh', 0.5), _err('acosh', -INF))
r['atanh'] = (_err('atanh', 1.0), _err('atanh', 2), _err('atanh', INF))
r['sqrt'] = (_err('sqrt', -1.0), _err('sqrt', -1), _err('sqrt', -INF))
r['log_float'] = (_err('log', 0.0), _err('log', -INF), _err('log2', -1.0),
                  _err('log10', -INF))
r['log_int'] = (_err('log', 0), _err('log2', -3), _err('log10', 0), _err('log', -10 ** 400))
r['log_base_one'] = (_err('log', 2.0, 1.0), _err('log', 8, 1))
r['log_bad_base'] = (_err('log', 1.0, 0.0), _err('log', 2.0, -1.0), _err('log', -1.0, 1.0))
r['log1p'] = (_err('log1p', -1.0), _err('log1p', -2.0), _err('log1p', -INF))
r['gamma'] = (_err('gamma', 0.0), _err('gamma', -1.0), _err('gamma', -INF))
r['lgamma'] = (_err('lgamma', 0.0), _err('lgamma', -2.0), _err('lgamma', -2))
r['still_generic'] = (_err('fmod', INF, 1.0), _err('remainder', 1.0, 0.0),
                      _err('pow', -1.0, 0.5))

EXPECTED = {
    'trig_infinite': ('ValueError: expected a finite input, got inf',
                      'ValueError: expected a finite input, got -inf',
                      'ValueError: expected a finite input, got inf'),
    'trig_nan_passes': ('nan', 'nan', 'nan'),
    'asin_acos_range': ('ValueError: expected a number in range from -1 up to 1, got 2.0',
                        'ValueError: expected a number in range from -1 up to 1, got -2.0',
                        'ValueError: expected a number in range from -1 up to 1, got -inf',
                        'ValueError: expected a number in range from -1 up to 1, got 1.5'),
    'asin_acos_int_arg': ('ValueError: expected a number in range from -1 up to 1, got 2.0',
                          'ValueError: expected a number in range from -1 up to 1, got -3.0'),
    'acosh': ('ValueError: expected argument value not less than 1, got 0.5',
              'ValueError: expected argument value not less than 1, got -inf'),
    'atanh': ('ValueError: expected a number between -1 and 1, got 1.0',
              'ValueError: expected a number between -1 and 1, got 2.0',
              'ValueError: expected a number between -1 and 1, got inf'),
    'sqrt': ('ValueError: expected a nonnegative input, got -1.0',
             'ValueError: expected a nonnegative input, got -1.0',
             'ValueError: expected a nonnegative input, got -inf'),
    'log_float': ('ValueError: expected a positive input, got 0.0',
                  'ValueError: expected a positive input, got -inf',
                  'ValueError: expected a positive input, got -1.0',
                  'ValueError: expected a positive input, got -inf'),
    'log_int': ('ValueError: expected a positive input',
                'ValueError: expected a positive input',
                'ValueError: expected a positive input',
                'ValueError: expected a positive input'),
    'log_base_one': ('ZeroDivisionError: division by zero',
                     'ZeroDivisionError: division by zero'),
    'log_bad_base': ('ValueError: expected a positive input, got 0.0',
                     'ValueError: expected a positive input, got -1.0',
                     'ValueError: expected a positive input, got -1.0'),
    'log1p': ('ValueError: expected argument value > -1, got -1.0',
              'ValueError: expected argument value > -1, got -2.0',
              'ValueError: expected argument value > -1, got -inf'),
    'gamma': ('ValueError: expected a noninteger or positive integer, got 0.0',
              'ValueError: expected a noninteger or positive integer, got -1.0',
              'ValueError: expected a noninteger or positive integer, got -inf'),
    'lgamma': ('ValueError: expected a noninteger or positive integer, got 0.0',
               'ValueError: expected a noninteger or positive integer, got -2.0',
               'ValueError: expected a noninteger or positive integer, got -2.0'),
    'still_generic': ('ValueError: math domain error',
                      'ValueError: math domain error',
                      'ValueError: math domain error'),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-32s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
