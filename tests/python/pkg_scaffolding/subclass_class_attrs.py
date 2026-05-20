# Subclass redeclaration of a parent's class-level attribute.
# Pythonic semantics: each class has its own value bound to the same
# name, accessed by attribute lookup through the MRO.  Grail used to
# emit rtErrAddDupInstvar because ClassDefAst put the name in
# `classInstVars: #(...)` again on the subclass.


class A:
    label = 'A-label'
    counter = 1


class B(A):
    # Redeclares `label` and `counter` - both names exist on A.
    label = 'B-label'
    counter = 2


class C(B):
    # Redeclares only `counter`; `label` should reach back to B.
    counter = 3


class D(A):
    # Adds a brand-new class attr (no parent slot to collide with).
    extra = 'D-only'


def class_label_a():
    return A.label


def class_label_b():
    return B.label


def class_counter_chain():
    return (A.counter, B.counter, C.counter)


def class_label_c_inherits_from_b():
    # C didn't redeclare `label`; lookup should walk to B's value.
    return C.label


def class_d_new_attr():
    return D.extra


def class_d_inherits_a_label():
    # D inherits A's `label` without redeclaring.
    return D.label


def instance_reads_class_attr_a():
    return A().label


def instance_reads_class_attr_b():
    return B().label
