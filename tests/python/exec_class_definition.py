"""`exec()` of a `class` statement — real classes, not a second class model.

`ClassDefAst>>printSmalltalkOn:` gated the real class emission on
``CallAst moduleClassBeingCompiled notNil`` and fell back, in an eval/exec
context, to a "legacy dict-based representation" that built a `PythonClass`
(a SymbolDictionary of class attributes).

That fallback could never run.  `src/smalltalk/Python/PythonClass.gs` is not in
install.gs's input list, so the class is never created — the name is
pre-declared as nil in the `Python` dictionary and stays nil.  The emitted
``PythonClass perform: #new env: 0`` therefore raised
``a UndefinedObject does not understand #new``: a *Smalltalk* error, so no
Python ``except`` could see it and it aborted the whole enclosing execution.
Every ``exec("class C: ...")`` died that way, which is 30 of test_listcomps'
52 errors (its harness execs each snippet in module, class AND function scope).

Removing the gate routes exec/eval through the same runtime emission a module
uses, so a class defined by exec is now the SAME kind of object as one defined
normally — real Smalltalk class, methods, MRO, isinstance — rather than a
shallower parallel model.  These tests pin that equivalence, not just the
absence of the crash.
"""

RESULTS = {}


def _catch(fn, *args, **kw):
    try:
        return fn(*args, **kw)
    except BaseException as exc:                     # noqa: BLE001
        return '%s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------------- 1. the crash is gone

def exec_of_a_class_body_works():
    """The minimal shape that used to raise an uncatchable Smalltalk MNU."""
    ns = {}
    exec('class _C:\n    y = 1\n', ns)
    return ns['_C'].y == 1


def exec_class_lands_in_the_supplied_globals():
    """builtins>>_exec: reflects the doit's scope back into the caller's dict,
    so the class must arrive under its own name."""
    ns = {}
    exec('class _C:\n    y = 1\n', ns)
    return '_C' in ns and ns['_C'].__name__ == '_C'


def exec_class_body_may_hold_a_comprehension():
    ns = {}
    exec('class _C:\n    y = [i * i for i in range(4)]\n', ns)
    return ns['_C'].y == [0, 1, 4, 9]


# ---------------------------------------------- 2. it is a REAL class, and the
# equivalence with a normally-defined one is the point

def exec_class_is_instantiable_with_methods():
    """``__init__``/``__repr__`` on an exec'd class was the documented
    'user classes can't be instantiated in eval: scope (#new DNU)' gotcha —
    the same root, so it is fixed by the same change."""
    ns = {}
    exec('class _C:\n'
         '    def __init__(self, v):\n'
         '        self.v = v\n'
         '    def doubled(self):\n'
         '        return self.v * 2\n'
         '    def __repr__(self):\n'
         '        return "_C(%r)" % (self.v,)\n',
         ns)
    obj = ns['_C'](21)
    return [obj.v, obj.doubled(), repr(obj)] == [21, 42, '_C(21)']


def exec_class_supports_isinstance_and_type():
    ns = {}
    exec('class _C:\n    pass\n', ns)
    cls = ns['_C']
    obj = cls()
    return (isinstance(obj, cls) and type(obj) is cls
            and isinstance(cls, type) and not isinstance(cls, dict))


def exec_class_can_subclass_and_be_subclassed():
    ns = {'Base': Exception}
    exec('class _C(Base):\n'
         '    tag = "c"\n'
         'class _D(_C):\n'
         '    tag = "d"\n',
         ns)
    c, d = ns['_C'], ns['_D']
    # __mro__, not mro(): the latter is not exposed on Grail classes at all,
    # exec'd or otherwise.  Check only the first two entries — the tail of an
    # exception hierarchy carries Grail's kernel classes too.
    mro = list(d.__mro__)
    return (issubclass(d, c) and issubclass(c, Exception)
            and d.tag == 'd' and issubclass(d, Exception)
            # linearised through the real MRO, not copied into a dict
            and mro[0] is d and mro[1] is c)


def exec_class_inherits_attributes_through_the_mro():
    ns = {}
    exec('class _C:\n'
         '    shared = "from base"\n'
         '    def who(self):\n'
         '        return "base"\n'
         'class _D(_C):\n'
         '    pass\n',
         ns)
    d = ns['_D']()
    return d.shared == 'from base' and d.who() == 'base'


def exec_class_raises_python_errors_not_smalltalk_ones():
    """A RUNTIME error inside an exec'd class body surfaces as a catchable
    Python exception — the whole failure mode here was a Smalltalk error that
    ``except`` could not see.

    Deliberately only the runtime case.  A *free name* in an exec'd class body
    (``y = undefined_name``) still raises a Smalltalk ``CompileError 1001,
    undefined symbol`` rather than Python's NameError: names in that body are
    resolved at Smalltalk compile time, not looked up at run time.  That is a
    separate, pre-existing root — the same one behind
    ``class _C: items = [...]; y = [x() for x in items]`` reporting
    ``undefined symbol items``, which is now the top remaining cause in
    test_listcomps.  Asserting CPython's NameError here would be asserting
    something Grail does not yet do.
    """
    return _catch(exec, 'class _C:\n    y = 1 / 0\n', {}) == \
        'ZeroDivisionError: integer division or modulo by zero'


# ----------------------------------------- 3. the scopes test_listcomps drives

def exec_class_in_each_of_the_three_scopes():
    """test_listcomps' _check_in_scopes shape: the same snippet exec'd at module
    scope, in a class body, and in a function body.  The class arm is the one
    that used to abort."""
    snippet = 'y = [i for i in [1]]\n'
    out = []

    ns = {}
    exec(snippet, ns)
    out.append(ns['y'])

    ns = {}
    exec('class _C:\n    ' + snippet, ns)
    out.append(ns['_C'].y)

    ns = {}
    exec('def _f():\n    ' + snippet + '    return locals()\n_out = _f()\n', ns)
    out.append(ns['_out']['y'])

    return out == [[1], [1], [1]]


RESULTS = {
    'class_body_works': exec_of_a_class_body_works(),
    'lands_in_globals': exec_class_lands_in_the_supplied_globals(),
    'body_comprehension': exec_class_body_may_hold_a_comprehension(),
    'instantiable': exec_class_is_instantiable_with_methods(),
    'isinstance_and_type': exec_class_supports_isinstance_and_type(),
    'subclassing': exec_class_can_subclass_and_be_subclassed(),
    'mro_inheritance': exec_class_inherits_attributes_through_the_mro(),
    'python_errors': exec_class_raises_python_errors_not_smalltalk_ones(),
    'three_scopes': exec_class_in_each_of_the_three_scopes(),
}
