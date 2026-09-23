# __mro__ of the built-in types, and closures in methods inherited from a
# SECONDARY base.  Two defects test_genericclass exposed; both are wider than
# that module.
#
# THE MRO.  A built-in is a Smalltalk class with a Smalltalk ancestry, and
# __mro__ used to report every link of it:
#
#     dict.__mro__       (dict, dict, AbstractDictionary, Collection, object)
#     Exception.__mro__  (Exception, BaseException, Exception,
#                         AbstractException, object)
#
# where CPython says (dict, object) and (Exception, BaseException, object).
# The doubled names are KeyValueDictionary and the kernel Exception, which
# answer a Python __name__ without being the class builtins binds it to.  A
# sweep of the builtins types plus seventeen stdlib modules had 168 of 231
# classes disagreeing with CPython; the fix brought that to 66, none of them
# newly wrong.  A user subclass inherits the tail, which is what
# test_genericclass test_mro_entry_with_builtins caught.
#
# THE FILTER IS REPORTING ONLY, and the super_* checks below are why it has
# to be.  super() walks the same MRO for method dictionaries, and the methods
# a dict subclass reaches with ``super().keys()'' may live on the classes
# __mro__ now hides.  Those checks are there to catch the filter moving into
# dispatch.
#
# THE CLOSURES.  A class with several bases is one Smalltalk class whose
# superclass is only its primary base; the other bases' methods are
# recompiled onto it.  A method's closure cell is looked up through the
# receiver's class, which never reached the secondary base that holds it:
#
#     def t():
#         tested = []
#         class C:
#             def m(self): return tested
#         class D(A, C): ...
#         D().m()      # NameError: free variable 'tested' referenced before
#                      # assignment in enclosing scope
#
# Comparisons are by IDENTITY, so this file means the same thing run as
# __main__ and imported.  The one exception is the int/float stand-in check,
# which has to compare names; it names only built-ins and a local X.

BUILTINS = (dict, list, set, frozenset, tuple, str, bytes, int, float)


def builtin_mro_is_type_then_object():
    return all(t.__mro__ == (t, object) for t in BUILTINS)


def subclass_of_builtin_mro():
    # int and float are left out: GemStone forbids subclassing Integer, so
    # ``class X(int)'' is built on a stand-in (AbstractPyInt) that answers
    # ``int'' for its name without being builtins.int, and __mro__/__bases__
    # report the stand-in.  A separate defect from the one this file pins --
    # see subclass_of_int_mro_has_no_kernel_tail for what does hold there.
    for t in (dict, list, set, frozenset, tuple, str, bytes):
        class X(t):
            pass
        if X.__mro__ != (X, t, object):
            return False
    return True


def subclass_of_int_mro_has_no_kernel_tail():
    # Compared by NAME, because of the stand-in above: before the fix this was
    # (X, int, Number, Magnitude, object).
    for t in (int, float):
        class X(t):
            pass
        names = [c.__name__ for c in X.__mro__]
        if names != ['X', t.__name__, 'object'] or not issubclass(X, t):
            return False
    return True


def mro_method_agrees_with_dunder():
    class X(dict):
        pass
    return X.mro() == [X, dict, object] and type(X.mro()) is list


def exception_mro():
    return (Exception.__mro__ == (Exception, BaseException, object)
            and BaseException.__mro__ == (BaseException, object)
            and ValueError.__mro__ == (ValueError, Exception, BaseException, object))


def user_exception_mro():
    class E(KeyError):
        pass
    return E.__mro__ == (E, KeyError, LookupError, Exception, BaseException, object)


def multiple_bases_with_a_builtin():
    class A:
        pass
    class D(A, dict):
        pass
    return D.__mro__ == (D, A, dict, object)


def mro_entries_to_a_builtin():
    # test_genericclass test_mro_entry_with_builtins
    class A:
        pass
    class C:
        def __mro_entries__(self, bases):
            return (dict,)
    class D(A, C()):
        pass
    return D.__bases__ == (A, dict) and D.__mro__ == (D, A, dict, object)


def mro_entries_beside_a_builtin():
    # test_genericclass test_mro_entry_with_builtins_2
    class C:
        def __mro_entries__(self, bases):
            return (C,)
    class D(C(), dict):
        pass
    return D.__bases__ == (C, dict) and D.__mro__ == (D, C, dict, object)


def super_reaches_dict_methods():
    class D(dict):
        def keys(self):
            return sorted(super().keys())
        def __getitem__(self, k):
            return super().__getitem__(k) * 2
    d = D(b=1, a=2)
    return d.keys() == ['a', 'b'] and d['a'] == 4


def super_reaches_list_and_str_methods():
    class L(list):
        def append(self, x):
            super().append(x + 1)
    class S(str):
        def upper(self):
            return '<' + super().upper() + '>'
    lst = L()
    lst.append(1)
    return lst == [2] and S('ab').upper() == '<AB>'


def super_reaches_exception_methods():
    class E(ValueError):
        def __str__(self):
            return 'E:' + super().__str__()
    return str(E('x')) == 'E:x'


def isinstance_unaffected():
    class D(dict):
        pass
    return (isinstance(D(), dict) and issubclass(D, dict)
            and isinstance(ValueError(), BaseException)
            and issubclass(bool, int))


def secondary_base_method_reads_its_closure():
    tested = []
    class A:
        pass
    class C:
        def m(self):
            tested.append(1)
            return len(tested)
    class D(A, C):
        pass
    return D().m() == 1 and D().m() == 2


def secondary_base_closure_sees_later_binding():
    class A:
        pass
    class C:
        def m(self):
            return late
    class D(A, C):
        pass
    late = 'bound after the classes'
    return D().m() == 'bound after the classes'


def inherited_mro_entries_reads_its_closure():
    # test_genericclass test_mro_entry: E's base is an instance of D, whose
    # __mro_entries__ comes from the SECONDARY base C and closes over tested.
    tested = []
    class A:
        pass
    class B:
        pass
    class C:
        def __mro_entries__(self, bases):
            tested.append(bases)
            return (self.__class__,)
    c = C()
    class D(A, c, B):
        pass
    d = D()
    class E(d):
        pass
    return (tested[-1] == (d,) and E.__bases__ == (D,)
            and D.__mro__ == (D, A, C, B, object))


CHECKS = [
    builtin_mro_is_type_then_object,
    subclass_of_builtin_mro,
    subclass_of_int_mro_has_no_kernel_tail,
    mro_method_agrees_with_dunder,
    exception_mro,
    user_exception_mro,
    multiple_bases_with_a_builtin,
    mro_entries_to_a_builtin,
    mro_entries_beside_a_builtin,
    super_reaches_dict_methods,
    super_reaches_list_and_str_methods,
    super_reaches_exception_methods,
    isinstance_unaffected,
    secondary_base_method_reads_its_closure,
    secondary_base_closure_sees_later_binding,
    inherited_mro_entries_reads_its_closure,
]

if __name__ == '__main__':
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
