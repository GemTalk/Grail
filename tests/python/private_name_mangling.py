# Regression fixture: CPython private-name mangling (_Py_Mangle).
#
# An identifier written inside a class body with TWO OR MORE leading
# underscores and NOT two trailing underscores is rewritten to
# _<Class><name>.  That is what makes a private attribute PER-CLASS: a
# subclass writing its own __x gets a different slot and cannot read the
# base's.
#
# Beyond the semantics, this pins two things that went wrong while
# implementing it:
#
#   * Mangled METHOD calls must still take the direct-send fast path.
#     The name sets CallAst consults were collected before the compiler
#     knew which class it was in, so they held UNMANGLED names, the
#     membership test missed, and every private call fell onto the far
#     heavier attribute-load route.  That is a stack-depth regression:
#     a private recursion bottomed out at ~1/3 the depth of a public one
#     and died uncatchably instead of raising RecursionError.
#
#   * super() must keep working.  Setting the compiler's "current class"
#     early to enable mangling also made every class look nested, which
#     routed super() through the wrong path and silently dropped its
#     arguments.

RESULTS = {}


class Base:
    def __init__(self):
        self.__x = 'base-x'          # -> _Base__x
        self.public = 'base-pub'

    def read_own(self):
        return self.__x              # -> self._Base__x

    def __helper(self):              # -> _Base__helper
        return 'base-helper'

    def call_helper(self):
        return self.__helper()       # must resolve to _Base__helper


class Derived(Base):
    def __init__(self):
        super().__init__()
        self.__x = 'derived-x'       # -> _Derived__x, a DIFFERENT slot

    def read_own(self):
        return self.__x              # -> self._Derived__x

    def read_base(self):
        return self._Base__x         # explicit mangled name still works

    def __helper(self):              # -> _Derived__helper, does not override
        return 'derived-helper'

    def call_helper(self):
        return self.__helper()


_b = Base()
_d = Derived()

# Per-class slots: base and derived __x coexist.
RESULTS['base_reads_own'] = (_b.read_own() == 'base-x')
RESULTS['derived_reads_own'] = (_d.read_own() == 'derived-x')
RESULTS['derived_reads_base'] = (_d.read_base() == 'base-x')

# The mangled name is what actually lands in __dict__.
RESULTS['mangled_in_dict'] = ('_Base__x' in vars(_b))
RESULTS['unmangled_not_in_dict'] = ('__x' not in vars(_b))
RESULTS['both_slots_on_derived'] = ('_Base__x' in vars(_d) and '_Derived__x' in vars(_d))

# Public names are untouched.
RESULTS['public_untouched'] = ('public' in vars(_b))

# Private METHODS mangle too, and do not override across classes.
RESULTS['base_helper'] = (_b.call_helper() == 'base-helper')
RESULTS['derived_helper'] = (_d.call_helper() == 'derived-helper')
RESULTS['base_helper_via_derived'] = (Base.call_helper(_d) == 'base-helper')

# Dunders are NEVER mangled.
RESULTS['dunder_not_mangled'] = (_b.__init__.__name__ == '__init__'
                                 if hasattr(_b.__init__, '__name__') else True)

# A single leading underscore is not private.
class Single:
    def __init__(self):
        self._y = 1

RESULTS['single_underscore_untouched'] = ('_y' in vars(Single()))

# Trailing double underscore exempts the name.
class Trailing:
    def __init__(self):
        self.__z__ = 1

RESULTS['trailing_dunder_untouched'] = ('__z__' in vars(Trailing()))

# super() must still pass its arguments (this is what the early-set bug broke).
class A2:
    def __init__(self, a, b=2):
        self.got = (a, b)

class B2(A2):
    def __init__(self, a):
        super().__init__(a, b=99)

RESULTS['super_passes_args'] = (B2(1).got == (1, 99))


# A private method must recurse to a normal depth -- i.e. still take the
# fast path -- and raise a CATCHABLE RecursionError, not die.
class Deep:
    def __go(self, n):
        return self.__go(n + 1)
    def run(self):
        try:
            self.__go(1)
            return 'no-error'
        except RecursionError:
            return 'recursion-error'

RESULTS['private_recursion_is_catchable'] = (Deep().run() == 'recursion-error')
