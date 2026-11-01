"""Fixture: a nested ``class`` statement runs at its own place in the class body.

CPython executes a class body top to bottom, once.  A nested class's header --
its bases, keywords and decorators -- is evaluated when that statement is
reached, in the enclosing class body, so it sees exactly the names bound above
it and none bound below.

Grail built every nested class ahead of the class body's other statements.  The
header therefore ran first: ``base = int; class B(base)`` raised NameError, a
class-body name shadowing a module one read the module's, and a class
redefined later in the body was the one an earlier statement saw.  That was
test_type_params' test_gen_exp_in_nested_class and
test_listcomp_in_nested_class, whose ``make_base(T)`` reads the class-body T.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def make_base(arg):
    class Base:
        __arg__ = arg
    return Base


def tagged(tag):
    def apply(cls):
        cls.tag = tag
        return cls
    return apply


# --- the header reads a name the body bound above it -----------------------
def base_reads_body_name():
    class A:
        base = int
        class B(base):
            pass
    return A.B.__bases__ == (int,)


r['base_reads_body_name'] = outcome(base_reads_body_name)


class ModuleLevel:
    base = int
    class B(base):
        pass


r['module_level_class'] = outcome(lambda: ModuleLevel.B.__bases__ == (int,))


class Holder:
    def build(self):
        class A:
            base = int
            class B(base):
                pass
        return A.B.__bases__ == (int,)


r['class_in_a_method'] = outcome(lambda: Holder().build())


def decorator_reads_body_name():
    class A:
        tag = 'from the body'
        @tagged(tag)
        class B:
            pass
    return A.B.tag


r['decorator_reads_body_name'] = outcome(decorator_reads_body_name)


class Meta(type):
    pass


def keyword_reads_body_name():
    class A:
        chosen = Meta
        class B(metaclass=chosen):
            pass
    return type(A.B).__name__


r['keyword_reads_body_name'] = outcome(keyword_reads_body_name)


# --- ...and a class-body binding wins over the module's ---------------------
shadowed = 'module'


def body_name_shadows_module():
    class A:
        shadowed = 'class'
        class B(make_base(shadowed)):
            pass
    return A.B.__bases__[0].__arg__


r['body_name_shadows_module'] = outcome(body_name_shadows_module)


# --- the header runs between the statements around it -----------------------
def evaluation_order():
    order = []

    def mark(label):
        order.append(label)
        return object

    class A:
        mark('before')
        class B(mark('header')):
            mark('nested body')
        mark('after')
    return order


r['evaluation_order'] = outcome(evaluation_order)


# --- a statement above a nested class does not see it ------------------------
def read_before_definition():
    class A:
        early = outcome(lambda: Late)
        class Late:
            pass
    return A.early


r['read_before_definition'] = outcome(read_before_definition)


# --- a statement below it does: the reason it used to be built first ---------
def read_after_definition():
    class A:
        class B:
            pass
        instance = B()
    return type(A.instance).__qualname__


r['read_after_definition'] = outcome(read_after_definition)


# --- a class defined twice: each statement sees the one above it -------------
def redefinition():
    class A:
        class B:
            version = 1
        first = B.version
        class B:
            version = 2
        second = B.version
    return [A.first, A.second, A.B.version]


r['redefinition'] = outcome(redefinition)


# --- names and qualified names are unchanged --------------------------------
def qualified_names():
    class A:
        class B:
            class C:
                pass
        class __Private:
            pass
    return [A.B.__qualname__, A.B.C.__qualname__, A._A__Private.__qualname__]


r['qualified_names'] = outcome(qualified_names)


# --- a prepared namespace is offered the nested class at its place ------------
class Recording(dict):
    def __init__(self):
        super().__init__()
        self.order = []

    def __setitem__(self, key, value):
        if not key.startswith('__'):
            self.order.append(key)
        super().__setitem__(key, value)


class RecordingMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        return Recording()

    def __new__(mcls, name, bases, ns, **kw):
        cls = super().__new__(mcls, name, bases, dict(ns))
        cls.order = ns.order
        return cls


def namespace_order():
    class A(metaclass=RecordingMeta):
        before = 1
        class B:
            pass
        after = 2
    return A.order


r['namespace_order'] = outcome(namespace_order)


# --- the PEP 695 cases: the class-body T, and the type parameter past it -----
def type_parameter_cases():
    class C[T]:
        T = 'class'
        class FromGenerator(make_base(T for _ in (1,)), make_base(T)):
            pass
        class FromList(make_base([T for _ in (1,)]), make_base(T)):
            pass
    parameter, = C.__type_params__
    generator_base, generator_name = C.FromGenerator.__bases__
    list_base, list_name = C.FromList.__bases__
    return [list(generator_base.__arg__) == [parameter], generator_name.__arg__,
            list_base.__arg__ == [parameter], list_name.__arg__]


r['type_parameter_cases'] = outcome(type_parameter_cases)


EXPECTED = {
    'base_reads_body_name': True,
    'module_level_class': True,
    'class_in_a_method': True,
    'decorator_reads_body_name': 'from the body',
    'keyword_reads_body_name': 'Meta',
    'body_name_shadows_module': 'class',
    'evaluation_order': ['before', 'header', 'nested body', 'after'],
    'read_before_definition': "NameError: name 'Late' is not defined",
    'read_after_definition': 'read_after_definition.<locals>.A.B',
    'redefinition': [1, 2, 2],
    'qualified_names': ['qualified_names.<locals>.A.B', 'qualified_names.<locals>.A.B.C',
                        'qualified_names.<locals>.A.__Private'],
    'namespace_order': ['before', 'B', 'after'],
    'type_parameter_cases': [True, 'class', True, 'class'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
