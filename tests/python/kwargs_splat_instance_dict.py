"""Fixture: ``f(**obj.__dict__)`` hands f a fresh dict, as CPython does.

CPython builds a new dict for every ``**`` in a call.  Grail passed a live
``__dict__`` view through as it stood, and a callee with ``**kw`` copies what
it is handed and removes the names it bound -- but the copy of a view is a
second view of the same object, which has no such removal.  So
``self.clone(**other.__dict__)``, which is how email.policy adds two
policies, raised an uncatchable MessageNotUnderstood (test_email's
test_policy), and an answer would have deleted the caller's attributes.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import email.policy

r = {}


class Point:
    def __init__(self):
        self.a = 1
        self.b = 2


def pop_a(**kw):
    kw.pop('a')
    return kw


def named_and_rest(a, **kw):
    return a, kw


def keyword_only(*, a, **kw):
    return a, kw


def named_only(a, b):
    return a + b


def adds_one(**kw):
    kw['c'] = 3
    return type(kw).__name__


p = Point()
r['pop_in_callee'] = pop_a(**p.__dict__)
r['named_and_rest'] = named_and_rest(**p.__dict__)
r['keyword_only'] = keyword_only(**p.__dict__)
r['named_only'] = named_only(**p.__dict__)
r['callee_gets_a_dict'] = adds_one(**p.__dict__)
r['caller_untouched'] = p.__dict__

added = email.policy.default + email.policy.strict
r['policy_addition'] = (added.__dict__, added.raise_on_defect,
                        email.policy.default.raise_on_defect)

EXPECTED = {
    'pop_in_callee': {'b': 2},
    'named_and_rest': (1, {'b': 2}),
    'keyword_only': (1, {'b': 2}),
    'named_only': 3,
    'callee_gets_a_dict': 'dict',
    'caller_untouched': {'a': 1, 'b': 2},
    'policy_addition': ({'raise_on_defect': True}, True, False),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
