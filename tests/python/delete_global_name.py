"""Fixture: ``del`` of a name the def does NOT own -- a global.

``del x`` has four different meanings in Grail depending on what ``x'' is, and
the text path emits four different things:

    del <local>            ->  x := nil            (the temp; a later read is
                                                    guarded and raises
                                                    UnboundLocalError)
    del <module global>    ->  <module> removeDynamicInstVar: #x
    del <class-body name>  ->  <Cls> ___classBodyDefinitionalDelete___: #x
    nonlocal __class__; del __class__
                           ->  <Cls> ___grailClearClassCell___

Only the first has an IR emit, so a def containing ``global x; del x'' refused
outright -- and that is the shape `test_global' is made of.

The difference between the first two is not cosmetic and the shapes below pin
it: deleting a LOCAL leaves a nil temp whose later read raises
UnboundLocalError, while deleting a GLOBAL removes the binding from the module,
so a later read raises NameError -- and every OTHER function sees it gone too,
which a nil temp could never reproduce.

ONE SHAPE IS AN XFAIL, and it is not this cut's.  Deleting an ALREADY-DELETED
global must raise NameError; Grail's ``removeDynamicInstVar:'' is silent when the
name is absent, so the second ``del'' succeeds.  Measured identically on the text
path and the IR path -- the IR emit reproduces the text's send for send -- so it
is a gap in the delete primitive, not in either codegen.  It stays here as the
tripwire for the cut that fixes it; XPASS is a gate failure, so it retires itself.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

counter = 0
other = 'kept'


def delete_a_global():
    global counter
    del counter
    try:
        return counter
    except NameError:
        return 'NameError'


r['deleting_a_global_then_reading_it'] = delete_a_global()

counter = 0


def reader():
    return counter


def delete_then_read_elsewhere():
    global counter
    del counter
    try:
        return reader()
    except NameError:
        return 'NameError-elsewhere'


r['another_function_sees_the_deletion'] = delete_then_read_elsewhere()

counter = 0


def delete_then_rebind():
    global counter
    del counter
    counter = 99
    return counter


r['rebinding_after_the_delete'] = delete_then_rebind()


def delete_twice():
    global counter
    del counter
    try:
        del counter
        return 'no raise'
    except NameError:
        return 'NameError-on-second'


r['deleting_twice_raises'] = delete_twice()

counter = 0


def is_it_in_globals():
    global counter
    del counter
    return 'counter' in globals()


r['the_name_leaves_globals'] = is_it_in_globals()

counter = 0

a_one = 1
a_two = 2


def delete_two_globals():
    global a_one, a_two
    del a_one, a_two
    return 'a_one' in globals(), 'a_two' in globals()


r['two_globals_in_one_statement'] = delete_two_globals()


mixed = 'global'


def delete_a_local_and_a_global():
    global mixed
    loc = 'local'
    del loc, mixed
    try:
        loc
        local_result = 'no raise'
    except UnboundLocalError:
        local_result = 'UnboundLocalError'
    try:
        mixed
        global_result = 'no raise'
    except NameError:
        global_result = 'NameError'
    return local_result, global_result


r['a_local_and_a_global_together'] = delete_a_local_and_a_global()


ck = 0


class UsesGlobal:
    def drop(self):
        global ck
        del ck
        return 'ck' in globals()


r['a_method_deleting_a_global'] = UsesGlobal().drop()


def delete_a_plain_local():
    v = 5
    del v
    try:
        return v
    except UnboundLocalError:
        return 'UnboundLocalError'


r['a_plain_local_still_unbinds'] = delete_a_plain_local()


def delete_item_and_attr():
    class Holder:
        pass

    h = Holder()
    h.gone = 1
    d = {'k': 1, 'j': 2}
    del h.gone, d['k']
    return hasattr(h, 'gone'), sorted(d)


r['subscript_and_attribute_targets'] = delete_item_and_attr()


# Grail answers 'no raise': removeDynamicInstVar: is silent on an absent name.
# See the module docstring.
XFAIL = {'deleting_twice_raises'}


EXPECTED = {
    'deleting_a_global_then_reading_it': 'NameError',
    'another_function_sees_the_deletion': 'NameError-elsewhere',
    'rebinding_after_the_delete': 99,
    'deleting_twice_raises': 'NameError-on-second',
    'the_name_leaves_globals': False,
    'two_globals_in_one_statement': (False, False),
    'a_local_and_a_global_together': ('UnboundLocalError', 'NameError'),
    'a_method_deleting_a_global': False,
    'a_plain_local_still_unbinds': 'UnboundLocalError',
    'subscript_and_attribute_targets': (False, ['j']),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        if key in XFAIL:
            # Run under CPython this always agrees; the disagreement is Grail's,
            # so the line is XFAIL either way and never XPASS.  What would make
            # it fail here is the EXPECTED value drifting from CPython.
            status = 'XFAIL' if actual == expected else 'FAIL'
        else:
            status = 'OK' if actual == expected else 'FAIL'
        print('%-5s %-44s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-44s is not in EXPECTED' % ('FAIL', extra))
