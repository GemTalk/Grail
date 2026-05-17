# Pattern (d): class-per-call.  Each invocation of `make_class()` should
# return a distinct class object even though the source `class Inner:`
# is textually identical.

def make_class():
    class Inner:
        def kind(self):
            return 'inner'
    return Inner

A = make_class()
B = make_class()

same = (A is B)        # False
a_kind = A().kind()    # 'inner'
b_kind = B().kind()    # 'inner'
