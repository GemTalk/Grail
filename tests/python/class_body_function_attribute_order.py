"""Fixture: ``f.attr = value`` on a sibling def runs at its place in the class body.

CPython executes a class body top to bottom, once.  A statement that sets an
attribute on a def the body defined above it -- ``f.mark = 1``, pydantic's
``__init__.__pydantic_base_init__ = True`` -- sets it right there, so the
statements after it read the mark, and its value expression reads the names as
they stand at that point.

Grail stored every such attribute after the whole body had run.  A later
statement in the body therefore saw no mark (``seen = f.mark`` raised
AttributeError), a value naming a class-body variable read what the body left
in it last, and side effects in the value ran after everything else in the
body.  test_dynamicclassattribute's test_property___isabstractmethod__descriptor
marks a def and then wraps it, so the descriptor never saw the mark.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- a later statement reads the mark back -----------------------------------
def read_back_in_body():
    class C:
        def f(self):
            pass
        f.mark = 1
        seen = f.mark
    return C.seen


r['read_back_in_body'] = outcome(read_back_in_body)


class ModuleLevel:
    def f(self):
        pass
    f.mark = 'module level'
    seen = getattr(f, 'mark', 'unmarked')


r['module_level_class'] = outcome(lambda: ModuleLevel.seen)


class Holder:
    def build(self):
        class C:
            def f(self):
                pass
            f.mark = 'in a method'
            seen = getattr(f, 'mark', 'unmarked')
        return C.seen


r['class_in_a_method'] = outcome(lambda: Holder().build())


def read_before_the_store():
    class C:
        def f(self):
            pass
        before = getattr(f, 'mark', 'unmarked')
        f.mark = 'marked'
        after = f.mark
    return [C.before, C.after]


r['read_before_the_store'] = outcome(read_before_the_store)


# --- the value reads the body's names as they stand at the statement ---------
def value_reads_name_at_statement():
    class C:
        n = 'first'
        def f(self):
            pass
        f.mark = n
        n = 'second'
    return [C.f.mark, C.n]


r['value_reads_name_at_statement'] = outcome(value_reads_name_at_statement)


def evaluation_order():
    log = []

    def record(what):
        log.append(what)
        return what

    class C:
        record('before')
        def f(self):
            pass
        f.mark = record('the store')
        record('after')
    return log


r['evaluation_order'] = outcome(evaluation_order)


def store_twice():
    class C:
        def f(self):
            pass
        f.mark = 1
        first = f.mark
        f.mark = 2
    return [C.first, C.f.mark]


r['store_twice'] = outcome(store_twice)


# --- what the mark is for: a later wrapper reads it --------------------------
def wrapper_reads_the_mark():
    def wrap(function):
        return ('wrapped', getattr(function, 'mark', 'unmarked'))

    class C:
        def f(self):
            pass
        f.mark = 'marked'
        wrapped = wrap(f)
    return C.wrapped


r['wrapper_reads_the_mark'] = outcome(wrapper_reads_the_mark)


def abstract_mark_reaches_property():
    class C:
        def f(self):
            pass
        f.__isabstractmethod__ = True
        p = property(f)
        marked = p.__isabstractmethod__
    return C.marked


r['abstract_mark_reaches_property'] = outcome(abstract_mark_reaches_property)


# --- unchanged: the mark is on the function after the class is built ---------
class Marked:
    def __init__(self):
        pass
    __init__.__pydantic_base_init__ = True


r['mark_after_class'] = outcome(lambda: [Marked.__init__.__pydantic_base_init__,
                                         Marked().__init__.__pydantic_base_init__])


EXPECTED = {
    'read_back_in_body': 1,
    'module_level_class': 'module level',
    'class_in_a_method': 'in a method',
    'read_before_the_store': ['unmarked', 'marked'],
    'value_reads_name_at_statement': ['first', 'second'],
    'evaluation_order': ['before', 'the store', 'after'],
    'store_twice': [1, 2],
    'wrapper_reads_the_mark': ('wrapped', 'marked'),
    'abstract_mark_reaches_property': True,
    'mark_after_class': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
