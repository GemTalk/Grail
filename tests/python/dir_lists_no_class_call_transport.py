"""Fixture: dir() and a class's __dict__ list no built-in type's call transport.

A call of a built-in type in Grail dispatches one varargs selector on the
type's class side, named after it -- ``str(...)'' is ``_str:kw:'', a call of
datetime ``_datetime:kw:'' -- and dir() decodes a ``_name:kw:'' selector as a
method called ``name''.  So dir(str) listed ``str'', dir(datetime) and
datetime.__dict__ listed ``datetime'', and rlcompleter offered ``str.str()''
(test_rlcompleter test_attr_matches).  CPython's types have no attribute
named after themselves.  A real method sharing an ANCESTOR's name stays --
datetime.datetime.date() -- and so does one a Python class defines.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import datetime
import rlcompleter

r = {}


class MyStr(str):
    pass


class Thing:
    def Thing(self):
        return 'its own'


r['str_lists_no_str'] = ['str' in dir(str), 'str' in dir(''), 'str' in dir(MyStr)]
r['datetime_lists_no_datetime'] = ['datetime' in dir(datetime.datetime),
                                   'datetime' in vars(datetime.datetime)]
r['timedelta_lists_no_timedelta'] = ['timedelta' in dir(datetime.timedelta),
                                     'timedelta' in vars(datetime.timedelta)]
r['the_real_methods_stay'] = ['date' in dir(datetime.datetime), 'combine' in dir(datetime.datetime),
                              'maketrans' in dir(str), 'fromkeys' in dir(dict)]
r['a_python_class_keeps_its_own'] = ['Thing' in dir(Thing), Thing().Thing()]
matches = rlcompleter.Completer({'str': str}).attr_matches('str.s')
r['rlcompleter_offers_no_str_str'] = ['str.str()' in matches, 'str.strip(' in matches]

EXPECTED = {
    'str_lists_no_str': [False, False, False],
    'datetime_lists_no_datetime': [False, False],
    'timedelta_lists_no_timedelta': [False, False],
    'the_real_methods_stay': [True, True, True, True],
    'a_python_class_keeps_its_own': [True, 'its own'],
    'rlcompleter_offers_no_str_str': [False, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
