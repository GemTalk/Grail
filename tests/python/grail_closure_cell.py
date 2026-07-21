# Fixture for ClosureCellTestCase>>testByReferenceCapture.
#
# A method-local class whose method reads an enclosing-function local is a
# CPython closure CELL: the local is captured by reference, so a value bound
# AFTER the class definition is visible when the method runs (test_list
# test_count_index_remove_crashes / test_equal_operator_modifying_operand /
# test_repr_mutate).  Grail used to capture by value at class-def time and
# raise "free variable ... referenced before assignment".
def read_after_def():
    class C:
        def get(self):
            return later          # enclosing local, bound below
    c = C()
    later = 42
    return c.get()


def cleared_during_index():
    class X:
        def __eq__(self, other):
            lst.clear()           # reads enclosing local, then mutates it
            return NotImplemented
    lst = [X()]
    try:
        lst.index(object())       # runs X.__eq__ -> lst.clear(); must not NameError
        return "noraise"
    except ValueError:
        return "valueerror"
    except NameError:
        return "nameerror"


def eq_clears_both():
    # bpo-38588: comparing two lists whose elements' __eq__ clear the OTHER
    # list must not crash; CPython re-reads sizes after each element compare,
    # so both lists end up empty and compare EQUAL (0 == 0).
    class X:
        def __eq__(self, other):
            b.clear()
            return NotImplemented

    class Y:
        def __eq__(self, other):
            a.clear()
            return NotImplemented

    a = [X()]
    b = [Y()]
    return a == b


def check():
    return (read_after_def() == 42
            and cleared_during_index() == "valueerror"
            and eq_clears_both() is True)
