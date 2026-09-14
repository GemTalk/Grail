"""Fixture: keyword-only parameters on a NESTED def (a closure).

A nested ``def f(*, k)'' is compiled to a Smalltalk block, and its keyword-only
defaults do not live in the block.  They live in a one-slot cell built once when
the ``def'' statement runs and stamped onto the function object, because
``__kwdefaults__'' is WRITABLE: assigning it must change what the next call
binds, and deleting a key must make a defaulted parameter required again.  That
is the whole reason the closure form reads a cell instead of inlining the
default expression, and it is what the checks below pin.

Also pinned, because they are where the two forms differ:

  * ``**kwargs'' gets a COPY with every keyword-only name removed, so a name
    that is keyword-only does not also arrive in ``**kwargs'';
  * the caller's own dict is not mutated by that removal;
  * a missing required keyword-only argument is a TypeError naming it;
  * the default expression is evaluated ONCE, when the ``def'' runs, not per
    call -- so a mutable default is shared between calls, exactly as at module
    level.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


# --- the basic shapes -------------------------------------------------------

def make_plain():
    def inner(a, *, k, j=3):
        return (a, k, j)
    return inner


plain = make_plain()

r['required_and_defaulted'] = plain(1, k=2)
r['both_supplied'] = plain(1, k=2, j=9)


def missing_required():
    try:
        plain(1)
    except TypeError as exc:
        return 'TypeError' if 'k' in str(exc) else 'TypeError without the name'
    return 'no error'


r['missing_required_keyword_only'] = missing_required()


def unexpected_positional():
    try:
        plain(1, 2)
    except TypeError:
        return 'TypeError'
    return 'no error'


r['keyword_only_cannot_be_passed_positionally'] = unexpected_positional()


# --- **kwargs interaction ---------------------------------------------------

def make_with_rest():
    def inner(a, *, k, j=3, **rest):
        return (a, k, j, rest)
    return inner


with_rest = make_with_rest()

r['keyword_only_names_are_not_in_kwargs'] = with_rest(1, k=2, z=5)
r['kwargs_empty_when_only_kwonly_passed'] = with_rest(1, k=2)


def caller_dict_untouched():
    d = {'k': 2, 'z': 5}
    with_rest(1, **d)
    return sorted(d)


r['the_callers_dict_is_not_mutated'] = caller_dict_untouched()


# --- the cell is live -------------------------------------------------------

def kwdefaults_is_readable():
    def inner(*, k=1, j=2):
        return (k, j)
    return inner.__kwdefaults__


r['kwdefaults_reads_back'] = kwdefaults_is_readable()


def kwdefaults_is_writable():
    def inner(*, k=1):
        return k

    before = inner()
    inner.__kwdefaults__ = {'k': 99}
    return before, inner()


r['assigning_kwdefaults_changes_the_next_call'] = kwdefaults_is_writable()


def deleting_a_key_makes_it_required():
    def inner(*, k=1):
        return k

    del inner.__kwdefaults__['k']
    try:
        inner()
    except TypeError:
        return 'TypeError'
    return 'no error'


r['deleting_a_default_makes_the_parameter_required'] = \
    deleting_a_key_makes_it_required()


# --- the default expression runs once, at def time --------------------------

def default_evaluated_once():
    calls = []

    def note():
        calls.append(1)
        return len(calls)

    def inner(*, k=note()):
        return k

    # The def has run exactly once, so note() has run exactly once...
    first = inner()
    second = inner()
    return first, second, len(calls)


r['the_default_expression_runs_at_def_time'] = default_evaluated_once()


def mutable_default_is_shared():
    def inner(*, acc=[]):
        acc.append(1)
        return len(acc)

    return inner(), inner(), inner(acc=[])


r['a_mutable_default_is_shared_between_calls'] = mutable_default_is_shared()


# --- a fresh cell per def evaluation ----------------------------------------

def each_def_evaluation_gets_its_own_cell():
    def make():
        def inner(*, k=1):
            return k
        return inner

    a = make()
    b = make()
    a.__kwdefaults__ = {'k': 7}
    return a(), b()


r['each_closure_has_its_own_cell'] = each_def_evaluation_gets_its_own_cell()


# --- keyword-only alongside *args -------------------------------------------

def with_star_args():
    def inner(a, *rest, k, j=3):
        return (a, rest, k, j)
    return inner


star = with_star_args()
r['star_args_and_keyword_only'] = star(1, 2, 3, k=4)


EXPECTED = {
    'required_and_defaulted': (1, 2, 3),
    'both_supplied': (1, 2, 9),
    'missing_required_keyword_only': 'TypeError',
    'keyword_only_cannot_be_passed_positionally': 'TypeError',
    'keyword_only_names_are_not_in_kwargs': (1, 2, 3, {'z': 5}),
    'kwargs_empty_when_only_kwonly_passed': (1, 2, 3, {}),
    'the_callers_dict_is_not_mutated': ['k', 'z'],
    'kwdefaults_reads_back': {'k': 1, 'j': 2},
    'assigning_kwdefaults_changes_the_next_call': (1, 99),
    'deleting_a_default_makes_the_parameter_required': 'TypeError',
    'the_default_expression_runs_at_def_time': (1, 1, 1),
    'a_mutable_default_is_shared_between_calls': (1, 2, 1),
    'each_closure_has_its_own_cell': (7, 1),
    'star_args_and_keyword_only': (1, (2, 3), 4, 3),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-52s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-52s is not in EXPECTED' % ('FAIL', extra))
