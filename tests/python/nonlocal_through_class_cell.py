"""Fixture: a method-local class writing an enclosing function's local.

The shape the CPython test corpus is full of -- test_dict's str/non-str key
tests, test_itertools' reentrancy tests, test_yield_from's generator probes --
is a counter owned by the test method and bumped from a class defined inside it:

    def test_x():
        calls = 0
        class Key:
            def __eq__(self, other):
                nonlocal calls
                calls += 1

A method string-compiles with no lexical link to the enclosing temp, so Grail
cannot assign it directly.  The class therefore stores TWO cells per
captured-and-written name, both created in the ENCLOSING scope:

    Key ___pyAttrStore___: #'___cell_calls___'       put: [calls].
    Key ___pyAttrStore___: #'___cellSetter_calls___' put: [:v | calls := v].

and the inner method's write compiles to
``(self ___classCellSetter___: #'___cellSetter_calls___') value: <new>''.

WHAT THIS FIXTURE PINS is that the write lands in the ENCLOSING binding and not
in a copy -- which is the failure mode a wrong implementation produces, and it
is invisible to any check that only reads the value back through the same cell.
So every check below reads the counter from the ENCLOSING function after the
class's method has run, never from inside the class.

Both codegen paths must agree, and under the direct-to-IR path the class
statement travels as a compiled-text helper whose frame is NOT the enclosing
one, so the setter has to be carried in as a block rather than named as a temp.
"""


def read_and_write():
    """The canonical shape: read-modify-write through the cell.

    The comparison is driven EXPLICITLY rather than through ``{Key(): 1}[Key()]'',
    which is how the corpus spells it: Grail calls ``__eq__'' a different number
    of times than CPython for a dict lookup (measured, on both codegen paths),
    and counting cell writes is not the place to discover that.
    """
    calls = 0

    class Key:
        def __eq__(self, other):
            nonlocal calls
            calls += 1
            return True

    Key() == Key()
    return calls


def write_only():
    """No read of the name inside the class at all, so the capture set built
    from READS alone would miss it and the setter would have nowhere to go."""
    flag = 'untouched'

    class Setter:
        def go(self):
            nonlocal flag
            flag = 'written'

    Setter().go()
    return flag


def write_twice_accumulates():
    """Two writes must compose: the second has to see the first, which it only
    does if both went to the same binding."""
    total = 0

    class Adder:
        def add(self, n):
            nonlocal total
            total += n

    a = Adder()
    a.add(3)
    a.add(4)
    return total


def two_names_do_not_collide():
    left = 1
    right = 10

    class Both:
        def go(self):
            nonlocal left, right
            left += 1
            right += 1

    Both().go()
    return [left, right]


# A GRAIL GAP, NOT A CHECK.  ``nonlocal p'' naming the ENCLOSING FUNCTION'S
# PARAMETER raises ``CompileError (error 1001), expected an assignable
# variable'' on both codegen paths -- the whole module fails to load, so it is
# not a wrong answer but a hard stop.  CPython writes the parameter like any
# other local.  Found by this fixture, verified against main before this cut,
# and left out of the checks rather than asserted: a red test for a
# pre-existing gap says nothing about the cut this file is here for.


def the_enclosing_read_sees_it_immediately():
    """Not just at the end: the enclosing frame reads the new value between two
    calls, so a write buffered anywhere would show up here."""
    seen = []
    n = 0

    class Step:
        def go(self):
            nonlocal n
            n += 1

    s = Step()
    s.go()
    seen.append(n)
    s.go()
    seen.append(n)
    return seen


def a_read_only_capture_still_works():
    """The reader half must keep working beside the writer half."""
    base = 100

    class Reader:
        def go(self):
            return base + 1

    return Reader().go()


def read_and_write_the_same_name():
    """One name used both ways in the same class."""
    v = 5

    class RW:
        def double(self):
            nonlocal v
            v = v * 2

        def peek(self):
            return v

    rw = RW()
    rw.double()
    return [v, rw.peek()]


def a_loop_variable_is_written():
    """The enclosing binding moves under the class, and the write must follow
    it rather than a value captured when the class was created."""
    out = []
    i = 0

    class Bump:
        def go(self):
            nonlocal i
            i += 10

    b = Bump()
    for i in (1, 2):
        b.go()
        out.append(i)
    return out


# --------------------------------------------------------------------------
# ``del'' IS THAT WRITE WITH NOTHING IN IT.  ``nonlocal x; del x'' inside a
# method of a method-local class unbinds the ENCLOSING function's local, so a
# later read there raises UnboundLocalError -- and a later WRITE rebinds it as
# if nothing had happened.
#
# Grail could not spell this on either path.  The name has no temp in the
# method, so the emit produced ``x := nil'' against an undeclared identifier,
# the method failed to COMPILE, and the class-build fallback installed a stub
# that raised ``codegen gap'' when it was called.  The corpus site
# (test_dict's ClearOnDelete.__del__) never reads the name afterwards, so it
# never noticed.
# --------------------------------------------------------------------------


def a_delete_unbinds_the_enclosing_local():
    class C:
        def clear(self):
            nonlocal x
            del x

    x = 'outer'
    C().clear()
    try:
        return x
    except UnboundLocalError:
        return 'UnboundLocalError'
    except NameError:
        return 'NameError'


def a_delete_then_a_write_rebinds():
    class C:
        def clear(self):
            nonlocal x
            del x

        def setit(self):
            nonlocal x
            x = 'rebound'

    x = 'outer'
    c = C()
    c.clear()
    c.setit()
    return x


def a_delete_leaves_a_second_name_alone():
    # The setter cells are per name; deleting one must not empty the other.
    class C:
        def clear(self):
            nonlocal x
            del x

    x = 'gone'
    y = 'kept'
    C().clear()
    return y


def a_delete_inside_a_method_that_also_reads():
    # The method reads the cell BEFORE deleting it, so the read path and the
    # delete path are exercised against the same binding in one method.
    class C:
        def take(self):
            nonlocal x
            seen = x
            del x
            return seen

    x = 'taken'
    return C().take()


r = {
    'read_and_write': read_and_write(),
    'write_only': write_only(),
    'write_twice_accumulates': write_twice_accumulates(),
    'two_names_do_not_collide': two_names_do_not_collide(),
    'the_enclosing_read_sees_it_immediately': the_enclosing_read_sees_it_immediately(),
    'a_read_only_capture_still_works': a_read_only_capture_still_works(),
    'read_and_write_the_same_name': read_and_write_the_same_name(),
    'a_loop_variable_is_written': a_loop_variable_is_written(),
    'a_delete_unbinds_the_enclosing_local': a_delete_unbinds_the_enclosing_local(),
    'a_delete_then_a_write_rebinds': a_delete_then_a_write_rebinds(),
    'a_delete_leaves_a_second_name_alone': a_delete_leaves_a_second_name_alone(),
    'a_delete_inside_a_method_that_also_reads': a_delete_inside_a_method_that_also_reads(),
}


EXPECTED = {
    'read_and_write': 1,
    'write_only': 'written',
    'write_twice_accumulates': 7,
    'two_names_do_not_collide': [2, 11],
    'the_enclosing_read_sees_it_immediately': [1, 2],
    'a_read_only_capture_still_works': 101,
    'read_and_write_the_same_name': [10, 10],
    'a_loop_variable_is_written': [11, 12],
    'a_delete_unbinds_the_enclosing_local': 'UnboundLocalError',
    'a_delete_then_a_write_rebinds': 'rebound',
    'a_delete_leaves_a_second_name_alone': 'kept',
    'a_delete_inside_a_method_that_also_reads': 'taken',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-40s is not in EXPECTED' % ('FAIL', extra))
