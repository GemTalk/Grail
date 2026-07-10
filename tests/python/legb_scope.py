# Fixture for LegbScopeTestCase: LEGB name resolution when locals,
# params, and comprehension targets collide with a MODULE-LEVEL FUNCTION
# name.  Regresses the NameAst module-function-branch guard: inside a
# class method, a true Python local must shadow the module function,
# while genuine global reads and comprehension-external reads must still
# resolve to the function.  (Historically ALL of these resolved to the
# module function inside methods.)


def indent(x):
    return "FN:" + str(x)


def helper():
    return "HELPER"


class Wrapper:
    def local_shadow(self):
        # A body binding shadows the module function (textwrap's
        # `indent = self.initial_indent` vs `def indent(...)`).
        indent = "LOCAL"
        return indent

    def param_shadow(self, indent):
        # A parameter shadows the module function.
        return indent

    def global_read(self):
        # No binding in this method: reads the module function.
        return indent("g")

    def comp_both_sides(self):
        # Inside the comprehension `indent` is the comprehension-local
        # target; outside it, it is STILL the module function (Python 3
        # scopes comprehension targets to the comprehension).
        vals = [indent * 2 for indent in [3, 4]]
        return (vals, indent("after"))

    def comp_tuple_target(self):
        # Tuple-unpacking comprehension targets are comprehension-local
        # too; the module function survives for the trailing call.
        pairs = [(helper, indent) for helper, indent in [(1, 2), (3, 4)]]
        return (pairs, helper())

    def nested_def_reads_method_local(self):
        # A nested def reads the METHOD's local through closure capture;
        # the local shadows the module function inside the nested def too.
        indent = "OUTER"

        def inner():
            return indent
        return inner()

    def local_then_global_helper(self):
        # `helper` is never bound here: global read even though a
        # DIFFERENT method binds it as a local.
        return helper()

    def binds_helper(self):
        helper = "BOUND"
        return helper


def compile(src):
    # A top-level def shadowing a BUILTIN name (re.py has its own
    # `def compile(...)`) -- bare calls anywhere in this module must
    # dispatch here, not to the builtin.
    return "MODULE-COMPILE:" + src


class Caller:
    def builtin_after_comp_target(self):
        # `len` is only a comprehension target; the call after the
        # comprehension must reach the BUILTIN (this used to raise
        # UnboundLocalError via the variables-based shadow check).
        vals = [len for len in [10, 20]]
        return (vals, len("abc"))

    def local_shadows_module_fn_call(self):
        # A local binding shadows the module function for a CALL.
        helper = lambda: "LOCAL-HELPER"
        return helper()

    def module_def_shadows_builtin_call(self):
        return compile("y")


class HolderOfFn:
    # A function stored as a class attribute must pass through instance
    # attribute reads UNBOUND (___descriptorGet___ excludes BoundMethod)
    # -- the itsdangerous `digest_method = staticmethod(hashlib.sha1)`
    # pattern.  If the implicit descriptor path rebound it to the holder,
    # the call would dispatch #helper at the HolderOfFn instance and DNU.
    dm = helper


def _get_rebind():
    # weakref.WeakMethod's exact flow: unbind a method via __func__,
    # re-bind it to the live instance via the explicit __get__ call
    # (BoundMethod's function descriptor protocol).
    w = Wrapper()
    m = w.local_shadow
    f = m.__func__
    g = f.__get__(w, Wrapper)
    return g()


RESULTS = {
    "local_shadow": Wrapper().local_shadow(),
    "param_shadow": Wrapper().param_shadow("P"),
    "global_read": Wrapper().global_read(),
    "comp_vals": Wrapper().comp_both_sides()[0],
    "comp_after": Wrapper().comp_both_sides()[1],
    "comp_tuple_helper": Wrapper().comp_tuple_target()[1],
    "nested_def": Wrapper().nested_def_reads_method_local(),
    "global_helper": Wrapper().local_then_global_helper(),
    "binds_helper": Wrapper().binds_helper(),
    "class_attr_fn_call": HolderOfFn().dm(),
    "explicit_get_rebind": _get_rebind(),
    "builtin_after_comp": Caller().builtin_after_comp_target(),
    "local_call_shadow": Caller().local_shadows_module_fn_call(),
    "module_def_builtin_call": Caller().module_def_shadows_builtin_call(),
}
