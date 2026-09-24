"""Deleting a dict entry through a key that is EQUAL but not identical.

A Python dict matches keys with __hash__ and __eq__, so ``del d[Key(1)]''
removes the entry stored under a DIFFERENT Key(1) object.  Grail's dict is a
PyDict: a KeyValueDictionary whose hash hooks route through the Python
protocol, plus a separate order list that gives iteration CPython's insertion
order.  The table removed the entry by Python equality; the order list was
asked to drop the key by the Smalltalk ``='', which for a Python object is
identity, and kept it.

The dict was inconsistent from then on, and only later did anybody find out:
walking it read a key the table no longer held (``LookupError ... non-existent
key''), or compared the two sizes and reported ``dictionary changed size during
iteration'' about a change nobody made.  Neither report names the delete that
caused it.

Any class with __eq__/__hash__ used as a dict key is exposed.  CPython's own
ipaddress is one caller: _collapse_addresses_internal keys a dict by
IPv4Network and deletes through a supernet() it builds fresh each time.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class Key:
    """Equal by value, so a rebuilt Key finds the entry the original stored."""

    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return isinstance(other, Key) and self.value == other.value

    def __hash__(self):
        return hash((self.value, 0))

    def __repr__(self):
        return 'Key(%r)' % self.value


def three():
    return {Key(1): 'a', Key(2): 'b', Key(3): 'c'}


def walk(d):
    """Every view, so a disagreement between them cannot hide behind one."""
    return ([repr(k) for k in d], list(d.values()),
            [(repr(k), v) for k, v in d.items()])


# ----------------------------------------------------------- the defect

def deleted_by_an_equal_key():
    d = three()
    del d[Key(1)]
    return walk(d)


def deleted_from_the_middle():
    d = three()
    del d[Key(2)]
    return [repr(k) for k in d]


def deleted_then_counted():
    d = three()
    del d[Key(1)]
    return (len(d), len(list(d)), len(d.keys()), len(d.values()))


def popped_by_an_equal_key():
    d = three()
    value = d.pop(Key(1))
    return (value, list(d.values()))


def deleted_the_only_entry():
    d = {Key(1): 'a'}
    del d[Key(1)]
    return (len(d), list(d.values()))


def deleted_then_added_back():
    d = three()
    del d[Key(1)]
    d[Key(1)] = 'z'
    return ([repr(k) for k in d], list(d.values()))


def updated_then_deleted():
    d = three()
    d.update({Key(1): 'y', Key(4): 'z'})
    del d[Key(1)]
    return ([repr(k) for k in d], list(d.values()))


class Sub(dict):
    pass


def deleted_in_a_subclass():
    d = Sub(three())
    del d[Key(1)]
    return ([repr(k) for k in d], list(d.values()))


check('deleting_by_an_equal_key_leaves_every_view_agreeing',
      deleted_by_an_equal_key(),
      (['Key(2)', 'Key(3)'], ['b', 'c'], [('Key(2)', 'b'), ('Key(3)', 'c')]))
check('what_is_left_keeps_its_insertion_order',
      deleted_from_the_middle(), ['Key(1)', 'Key(3)'])
check('len_agrees_with_what_the_walk_finds',
      deleted_then_counted(), (2, 2, 2, 2))
check('pop_by_an_equal_key_is_the_same_story',
      popped_by_an_equal_key(), ('a', ['b', 'c']))
check('deleting_the_only_entry_empties_the_dict',
      deleted_the_only_entry(), (0, []))
check('a_deleted_key_can_be_added_back_at_the_end',
      deleted_then_added_back(),
      (['Key(2)', 'Key(3)', 'Key(1)'], ['b', 'c', 'z']))
check('an_updated_dict_deletes_and_walks_too',
      updated_then_deleted(),
      (['Key(2)', 'Key(3)', 'Key(4)'], ['b', 'c', 'z']))
check('a_dict_subclass_behaves_the_same',
      deleted_in_a_subclass(), (['Key(2)', 'Key(3)'], ['b', 'c']))

# ----------------------------------------------------------- unchanged

# A str or int key is dropped from the order list by the cheap comparison, as
# it always was -- the Smalltalk ``='' is right for those.  These are what say
# the repair did not move them onto the Python-equality scan behind it.


def deleted_a_str_key():
    d = {'a': 1, 'b': 2}
    del d['a']
    return (list(d.keys()), list(d.values()))


def deleted_an_int_key():
    d = {1: 'x', 2: 'y'}
    del d[1]
    return (list(d.keys()), list(d.values()))


def stored_first_then_overwritten():
    first = Key(1)
    d = {first: 'x'}
    d[Key(1)] = 'y'
    return (next(iter(d)) is first, list(d.values()))


def popped_the_last_item():
    d = three()
    item = d.popitem()
    return (repr(item[0]), item[1], [repr(k) for k in d])


def cleared():
    d = three()
    d.clear()
    return (len(d), list(d.values()))


def discarded_from_a_set():
    s = {Key(1), Key(2)}
    s.discard(Key(1))
    return sorted(repr(x) for x in s)


check('str_keys_are_unchanged', deleted_a_str_key(), (['b'], [2]))
check('int_keys_are_unchanged', deleted_an_int_key(), ([2], ['y']))
check('the_key_stored_first_is_the_one_kept',
      stored_first_then_overwritten(), (True, ['y']))
check('popitem_takes_the_last_entry',
      popped_the_last_item(), ('Key(3)', 'c', ['Key(1)', 'Key(2)']))
check('clear_empties_both_the_table_and_the_walk', cleared(), (0, []))
check('a_set_never_had_an_order_list_to_disagree_with',
      discarded_from_a_set(), ['Key(2)'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
