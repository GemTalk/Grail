"""Zero-argument super() and __class__ in a class an exec'd source defines.

Grail rewrites a zero-argument ``super()'' at compile time into a proxy bound
to the method's class, and reaches the class through the module the class
belongs to.  An exec'd source compiles with no module at all, so the rewrite
stood down and every ``super()'' there reached the run-time path, which
raises ``RuntimeError: super(): no arguments''; a bare ``__class__'' raised
NameError.  pytest imports every test module whose asserts it rewrites, and
every conftest, through exec: each test class or conftest class calling
super() failed -- 1,508 of pygments' collection errors.

Every expectation was measured against CPython 3.14.
"""

import abc
import ast

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


SOURCE = '''
class A:
    def __init__(self):
        self.trail = ['A']

    def who(self):
        return ['A']

    @classmethod
    def make(cls):
        return cls.__name__


class B(A):
    def __init__(self):
        super().__init__()
        self.trail.append('B')

    def who(self):
        return ['B'] + super().who()

    @classmethod
    def make(cls):
        return 'B>' + super().make()

    def defining_class(self):
        return __class__.__name__


class C(B):
    def who(self):
        return ['C'] + super().who()


def local_class():
    class L(A):
        def who(self):
            return ['L'] + super().who()
    return L().who()


class Item(Node):
    def __init__(self, name):
        super().__init__(name)
        self.item = True
'''


class NodeMeta(abc.ABCMeta):
    # pytest's own shape: nodes are made through a metaclass method that
    # calls type.__call__ by super(), and __init__ then calls super() again.
    def _create(cls, *args):
        return super().__call__(*args)


class Node(abc.ABC, metaclass=NodeMeta):
    def __init__(self, name):
        self.name = name


def _run(code):
    ns = {'Node': Node}
    try:
        exec(code, ns)
        A, B, C = ns['A'], ns['B'], ns['C']

        class D(C):
            def who(self):
                return ['D'] + super().who()

        made = ns['Item']._create('n')
        return {
            'init_chain': C().trail,
            'method_chain': C().who(),
            'subclass_outside_the_exec': D().who(),
            'classmethod': C.make(),
            'dunder_class': C().defining_class(),
            'class_in_a_function': ns['local_class'](),
            'made_through_a_metaclass': (made.name, made.item),
        }
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, str(exc)[:150])


WANT = {
    'init_chain': ['A', 'B'],
    'method_chain': ['C', 'B', 'A'],
    'subclass_outside_the_exec': ['D', 'C', 'B', 'A'],
    'classmethod': 'B>C',
    'dunder_class': 'B',
    'class_in_a_function': ['L', 'A'],
    'made_through_a_metaclass': ('n', True),
}

check('exec_of_source_text', _run(compile(SOURCE, '<exec>', 'exec')), WANT)
check('exec_of_a_parsed_tree', _run(compile(ast.parse(SOURCE), '<exec>', 'exec')), WANT)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
