"""Fixture: ``nonlocal'' inside a method of a METHOD-LOCAL class.

    def f(x):
        class c:
            def inc(self):
                nonlocal x
                x += 1
                return x
        return c()

``x'' is a local of ``f'', and ``inc'' reaches past the class to write it.  The
method has no lexical link to f's temp -- a class body is not a closure scope --
so Grail routes both halves through a pair of cells the enclosing frame hands to
the class at definition time: ``___cell_x___'' for the read and
``___cellSetter_x___'' for the write.

This is the half of the write-back family the enclosing side (PR #960) could not
reach.  That cut made the enclosing frame CARRY the setter block; this one makes
the inner method USE it, so the shape is finally end-to-end.

The checks below pin the properties a broken store would get wrong in ways that
are not exceptions:

  * the write is visible to the ENCLOSING function afterwards, not just inside
    the method -- a store to a method-local temp would read back fine inside the
    class and silently lose the update outside;
  * every instance of the class shares the one binding, because they share the
    cell, not because they share an attribute;
  * two closures over the SAME call see each other's writes, and closures over
    DIFFERENT calls do not;
  * a plain ``=`` store works as well as an augmented one -- they take separate
    emit paths (AssignAst and AugAssignAst);
  * reads without any write still resolve, which is the pre-existing read half.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


# --- the shape test_scope names -------------------------------------------

def counter(x):
    class c:
        def inc(self):
            nonlocal x
            x += 1
            return x

        def dec(self):
            nonlocal x
            x -= 1
            return x

        def peek(self):
            return x
    return c()


o = counter(0)
r['augmented_writes_round_trip'] = (o.inc(), o.inc(), o.dec(), o.dec())
r['a_read_without_a_write_sees_it'] = (o.inc(), o.peek())


# --- the write is visible to the ENCLOSING function ------------------------

def visible_outside():
    total = 0

    class Adder:
        def add(self, n):
            nonlocal total
            total += n
    a = Adder()
    a.add(3)
    a.add(4)
    return total


r['the_enclosing_function_sees_the_write'] = visible_outside()


# --- a plain store, not an augmented one -----------------------------------

def plain_store():
    value = 'before'

    class Setter:
        def put(self, v):
            nonlocal value
            value = v
    Setter().put('after')
    return value


r['a_plain_store_works_too'] = plain_store()


# --- instances share the binding -------------------------------------------

def shared_between_instances():
    n = 0

    class Bump:
        def bump(self):
            nonlocal n
            n += 1
            return n
    return Bump().bump(), Bump().bump(), Bump().bump()


r['every_instance_shares_the_one_binding'] = shared_between_instances()


# --- separate calls get separate bindings ----------------------------------

def separate_calls():
    first = counter(100)
    second = counter(200)
    return first.inc(), second.inc(), first.inc()


r['separate_calls_do_not_share'] = separate_calls()


# --- two methods of the same class, one call -------------------------------

def two_methods_one_call():
    seen = []

    class Pair:
        def left(self):
            nonlocal seen
            seen = seen + ['L']
            return len(seen)

        def right(self):
            nonlocal seen
            seen = seen + ['R']
            return len(seen)
    p = Pair()
    return p.left(), p.right(), p.left(), seen


r['two_methods_share_the_binding'] = two_methods_one_call()


# --- a nonlocal alongside an ordinary local --------------------------------

def mixed_with_a_local():
    outer = 10

    class M:
        def go(self, k):
            nonlocal outer
            inner = k * 2
            outer += inner
            return (inner, outer)
    return M().go(3), outer


r['a_local_and_a_nonlocal_coexist'] = mixed_with_a_local()


EXPECTED = {
    'augmented_writes_round_trip': (1, 2, 1, 0),
    'a_read_without_a_write_sees_it': (1, 1),
    'the_enclosing_function_sees_the_write': 7,
    'a_plain_store_works_too': 'after',
    'every_instance_shares_the_one_binding': (1, 2, 3),
    'separate_calls_do_not_share': (101, 201, 102),
    'two_methods_share_the_binding': (1, 2, 3, ['L', 'R', 'L']),
    'a_local_and_a_nonlocal_coexist': ((6, 16), 16),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-42s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
