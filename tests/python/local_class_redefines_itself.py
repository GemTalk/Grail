"""A class in a def that redefines its own name, with the old binding as a base (#1461).

``class A`` then ``class A(A)`` in one function.  On the IR arm the class
statement is built in a helper method that carries every enclosing local the
class reads, and its own name as the temp the helper answers.  Here the class
READS its own name -- the base is the previous ``A`` -- so the name was both,
and the helper declared it twice:

    | A ___irCell_1___ ___irSetter_1___ A |

That is a CompileError the enclosing def cannot catch, so the whole module
failed to load.  six's test_six.py does it (``class Meta(Meta,
typing.GenericMeta)`` under an ``if``), which cost all 198 of its tests.
#1696 made the helper declare the name once; nothing tested the shape until
this fixture.

Kept out of class_def_local_binds_at_end.py on purpose: a regression here
fails the module LOAD, and would take that fixture's rows with it.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class _Meta(type):
    pass


def issue_snippet():
    class A:
        pass

    class A(A):
        pass
    return len(A.__mro__)


def three_deep():
    class A:
        x = 1

    class A(A):
        y = 2

    class A(A):
        z = 3
    return (len(A.__mro__), A.x, A.y, A.z)


def two_bases_under_an_if(flag=True):
    class Meta(type):
        pass
    if flag:
        class Meta(Meta, _Meta):
            pass
    return [c.__name__ for c in Meta.__mro__]


def body_reads_the_previous_class():
    class A:
        tag = 'old'

    class A(A):
        seen = A.tag
        tag = 'new'
    return (A.seen, A.tag)


def zero_arg_super():
    class A:
        def m(self):
            return 'a'

    class A(A):
        def m(self):
            return 'b' + super().m()
    return A().m()


def method_reads_the_final_binding():
    class A:
        pass

    class A(A):
        def me(self):
            return A
    return A().me() is A


def qualnames():
    class A:
        pass
    old = A

    class A(A):
        pass
    return (A.__qualname__, A.__bases__[0] is old)


t('issue_snippet', issue_snippet)
t('three_deep', three_deep)
t('two_bases_under_an_if', two_bases_under_an_if)
t('body_reads_the_previous_class', body_reads_the_previous_class)
t('zero_arg_super', zero_arg_super)
t('method_reads_the_final_binding', method_reads_the_final_binding)
t('qualnames', qualnames)


EXPECTED = {
    'body_reads_the_previous_class': "('old', 'new')",
    'issue_snippet': '3',
    'method_reads_the_final_binding': 'True',
    'qualnames': "('qualnames.<locals>.A', True)",
    'three_deep': '(4, 1, 2, 3)',
    'two_bases_under_an_if': "['Meta', 'Meta', '_Meta', 'type', 'object']",
    'zero_arg_super': "'ba'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
