# Fixture for ListTestCase>>testReprStaticmethodAndMutation.
#
# (1) A @staticmethod __repr__ (a dunder with no self) is invoked by repr()
#     and by list repr, and (2) list repr re-reads its size each step so an
#     element __repr__ that mutates the list is handled like CPython's
#     list_repr (test_list test_repr_mutate).
class ObjStatic:
    @staticmethod
    def __repr__():
        return 'static-repr'


def repr_mutate():
    class Obj:
        @staticmethod
        def __repr__():
            try:
                mylist.pop()          # enclosing local (closure cell)
            except IndexError:
                pass
            return 'obj'
    mylist = [Obj() for _ in range(5)]
    return repr(mylist)


def check():
    return (repr(ObjStatic()) == 'static-repr'
            and repr([ObjStatic(), ObjStatic()]) == '[static-repr, static-repr]'
            and repr_mutate() == '[obj, obj, obj]')
