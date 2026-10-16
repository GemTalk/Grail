"""``f(**m)`` hands f a plain dict of its own, whatever dict subclass m is.

Grail passed a dict subclass through, and the callee's **kwargs binding copied
it with its class and attributes.  So an OrderedDict's kwargs shared the
caller's key-order list: a ``kwargs.pop(k)`` in the callee took k out of the
caller's order, and the next ``f(**od)`` popping k raised ``ValueError:
list.remove(x): x not in list``.  botocore builds its endpoint rules with
``RuleCreator.create(**rule)`` over cached OrderedDicts, so every client after
a process's first one failed (#1686).

The copy follows CPython's dict_merge: through keys() and __getitem__ when the
class overrides __iter__, and from the raw entries otherwise.

Every expectation was measured against CPython 3.14.
"""

from collections import Counter, OrderedDict, defaultdict

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _try(fn):
    """fn's answer, or the exception it raised, so one check fails alone."""
    try:
        return fn()
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


def kw(**kwargs):
    return kwargs


def pop_type(**kwargs):
    return kwargs.pop('type'), kwargs


class RuleCreator:
    """botocore's shape: a classmethod that pops its dispatch key."""

    @classmethod
    def create(cls, **kwargs):
        return kwargs.pop('type')


od = OrderedDict([('type', 'tree'), ('x', 1)])
got = kw(**od)
check('an_ordered_dicts_kwargs_is_a_plain_dict',
      (type(got).__name__, got is od, got), ('dict', False, {'type': 'tree', 'x': 1}))

_try(lambda: pop_type(**od))
check('a_pop_in_the_callee_leaves_the_caller_alone',
      list(od.items()), [('type', 'tree'), ('x', 1)])
check('the_same_ordered_dict_splats_again',
      _try(lambda: pop_type(**od)), ('tree', {'x': 1}))

rule = OrderedDict([('type', 'endpoint'), ('url', 'u')])
check('a_classmethod_pops_from_the_same_rule_twice',
      _try(lambda: [RuleCreator.create(**rule), RuleCreator.create(**rule), list(rule)]),
      ['endpoint', 'endpoint', ['type', 'url']])

moved = OrderedDict([('a', 1), ('b', 2), ('c', 3)])
moved.move_to_end('a')
check('the_kwargs_keep_the_ordered_dicts_order', list(kw(**moved)), ['b', 'c', 'a'])


class Sub(dict):
    pass


s = Sub(a=1)
got = kw(**s)
got['z'] = 2
check('a_dict_subclasss_kwargs_is_its_own_plain_dict',
      (type(got).__name__, got is s, dict(s)), ('dict', False, {'a': 1}))


class KeysOnly(dict):
    """Overrides keys() but not __iter__: CPython's merge ignores keys()."""

    def keys(self):
        return ['a']


check('keys_without_iter_is_not_consulted',
      sorted(kw(**KeysOnly(a=1, b=2))), ['a', 'b'])


class IterOnly(dict):
    """Overrides __iter__: CPython's merge reads keys() and __getitem__."""

    def __iter__(self):
        return iter(['b'])

    def keys(self):
        return ['b']

    def __getitem__(self, key):
        return 'item-' + key


check('an_iter_override_reads_keys_and_getitem',
      kw(**IterOnly(a=1, b=2)), {'b': 'item-b'})

check('a_counter_and_a_defaultdict_give_plain_dicts',
      [(type(kw(**m)).__name__, kw(**m)) for m in (Counter(a=2), defaultdict(int, a=3))],
      [('dict', {'a': 2}), ('dict', {'a': 3})])

plain = {'a': 1}
got = kw(**plain)
got['z'] = 2
check('a_plain_dicts_kwargs_is_still_a_copy', (got is plain, plain), (False, {'a': 1}))

check('mixed_with_named_keywords_too',
      (type(kw(**od, y=2)).__name__, kw(**od, y=2)), ('dict', {'type': 'tree', 'x': 1, 'y': 2}))

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
