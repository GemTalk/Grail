"""Fixture: STATEMENTS in the body of a method-local class (plan P3.4).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.4 that helper is built through
IR when the body holds statements CPython runs for their effect, not only
bindings: a bare expression, a store through an attribute or a subscript, an
``if``, ``for``, ``while``, ``try``, ``with``, an augmented assignment, a
``del``, a ``raise`` and an ``assert``.  A name such a statement binds is a
class attribute; a name it reads is read as the class body reads it.  Every
expectation is CPython 3.14's, verified by running this file directly; the IR
helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``) and the text arm
(``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``expression``: bare calls run in order, reading the class body and the
  enclosing function; a bare name the class has not bound yet is a NameError.
* ``method_attr``: ``f.attr = v`` on a sibling def, read back by a later
  statement (test_property's ``foo.__isabstractmethod__``).
* ``subscript``: a store through a subscript of a class attribute.
* ``ann_target``: an annotated attribute target stores, and a missing
  receiver raises NameError (test_grammar's ``CBad``).
* ``if_else``: both branches, a nested ``if``, an annotated name in a branch
  (``__annotations__`` lists it only when its branch ran).
* ``for_loop``: the loop variable is left bound on the class; ``break`` and
  ``else``; a tuple target.
* ``while_loop``: a counter and an augmented assignment.
* ``try_except``: the handler runs, ``else`` and ``finally`` run.  (The
  handler's ``as`` name stays bound on the class on every Grail arm, where
  CPython unbinds it -- a separate, pre-existing bug, not checked here.)
* ``with_stmt``: the ``as`` name and the bindings inside are class
  attributes; a swallowed exception skips the rest of the block.
* ``augassign``: ``x += ...`` reads and rebinds the class attribute.
* ``del_stmt``: ``del`` unbinds a class attribute, inside a ``try`` too.
* ``raise_assert``: a class body that raises does not bind the class.
* ``enum_dup``: an Enum body rebinding a member inside ``with`` is refused by
  the enum namespace (test_enum's ``MyClass``).
"""

import enum

r = {}

y = 'module-y'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Swallow:
    """A context manager that swallows one exception type and says so."""

    def __init__(self, exc_type, log):
        self.exc_type = exc_type
        self.log = log

    def __enter__(self):
        self.log.append('enter')
        return 'cm-value'

    def __exit__(self, t, v, tb):
        self.log.append('exit:%s' % (t.__name__ if t else None))
        return t is not None and issubclass(t, self.exc_type)


def expression():
    log = []

    class C:
        a = 1
        log.append(('a', a))
        b = a + 1
        log.append(('b', b, y))
        len(log)
    try:
        class D:
            D
    except NameError as e:
        missing = str(e)
    return log, C.b, missing


def method_attr(val):
    class C:
        def foo(self):
            pass
        foo.mark = val
        seen = foo.mark
        foo = property(foo)
    return C.seen, C.foo.fget.mark


def subscript():
    k = 'kay'

    class C:
        d = {}
        d['a'] = 1
        d[k] = y
        first = d['a']
    return C.d, C.first


def ann_target():
    class NS:
        pass
    ns = NS()

    class C:
        ns.attr: int = 5
        x: int = 1
    try:
        class D:
            no_such_name_anywhere.attr: int = 0
        bad = None
    except NameError as e:
        bad = str(e)
    return ns.attr, C.__annotations__, bad


def if_else(flag, inner):
    class C:
        base = 'b'
        if flag:
            picked = 'yes'
            if inner:
                deep = 'inner'
            else:
                deep = 'outer'
        else:
            picked = 'no'
            note: str = 'annotated'
        after = picked + base
    return (C.picked, getattr(C, 'deep', None), C.after,
            getattr(C, 'note', None), sorted(C.__annotations__))


def for_loop():
    seen = []

    class C:
        total = 0
        for i in range(4):
            if i == 3:
                break
            total += i
            seen.append(i)
        else:
            never = True
        for j, k in [(1, 'a'), (2, 'b')]:
            pairs = j, k
    return C.total, C.i, hasattr(C, 'never'), C.j, C.k, C.pairs, seen


def while_loop():
    class C:
        n = 0
        steps = []
        while n < 3:
            n += 1
            steps.append(n)
        else:
            done = n
    return C.n, C.steps, C.done


def try_except():
    class C:
        log = []
        try:
            x = 1 // 0
        except ZeroDivisionError as e:
            caught = type(e).__name__
        else:
            log.append('else')
        finally:
            log.append('finally')
        try:
            ok = 'fine'
        except Exception:
            ok = 'no'
        else:
            log.append('else2')
    return C.caught, hasattr(C, 'x'), C.ok, C.log


def with_stmt():
    log = []

    class C:
        with Swallow(KeyError, log) as v:
            inside = v
        with Swallow(KeyError, log):
            before = 1
            raise KeyError('k')
            after = 2
    return C.v, C.inside, C.before, hasattr(C, 'after'), log


def augassign():
    class C:
        x = 1
        x += 2
        s = 'a'
        s *= 3
        items = [1]
        alias = items
        items += [2]
    return C.x, C.s, C.items, C.alias is C.items


def del_stmt():
    outer = 'kept'

    class C:
        tmp = 1
        keep = tmp
        del tmp
        try:
            del never_bound
        except NameError:
            missing = True
    return hasattr(C, 'tmp'), C.keep, C.missing, outer


def raise_assert(flag):
    try:
        class C:
            assert flag, 'flag was false'
            if not flag:
                raise ValueError('unreachable')
            raise KeyError('raised in the body')
    except AssertionError as e:
        return 'AssertionError', str(e)
    except KeyError as e:
        return 'KeyError', str(e)


def enum_dup():
    log = []

    class E(enum.Enum):
        a = 1
        with Swallow(TypeError, log):
            a = 2
        b = 3
    return [m.name for m in E], E.a.value, log


record('expression', expression)
record('method_attr', lambda: method_attr('marked'))
record('subscript', subscript)
record('ann_target', ann_target)
record('if_else_true', lambda: if_else(True, True))
record('if_else_inner', lambda: if_else(True, False))
record('if_else_false', lambda: if_else(False, True))
record('for_loop', for_loop)
record('while_loop', while_loop)
record('try_except', try_except)
record('with_stmt', with_stmt)
record('augassign', augassign)
record('del_stmt', del_stmt)
record('raise_assert_true', lambda: raise_assert(True))
record('raise_assert_false', lambda: raise_assert(False))
record('enum_dup', enum_dup)


EXPECTED = {
    'expression': ([('a', 1), ('b', 2, 'module-y')], 2,
                   "cannot access free variable 'D' where it is not associated "
                   "with a value in enclosing scope"),
    'method_attr': ('marked', 'marked'),
    'subscript': ({'a': 1, 'kay': 'module-y'}, 1),
    'ann_target': (5, {'x': int}, "name 'no_such_name_anywhere' is not defined"),
    'if_else_true': ('yes', 'inner', 'yesb', None, []),
    'if_else_inner': ('yes', 'outer', 'yesb', None, []),
    'if_else_false': ('no', None, 'nob', 'annotated', ['note']),
    'for_loop': (3, 3, False, 2, 'b', (2, 'b'), [0, 1, 2]),
    'while_loop': (3, [1, 2, 3], 3),
    'try_except': ('ZeroDivisionError', False, 'fine',
                   ['finally', 'else2']),
    'with_stmt': ('cm-value', 'cm-value', 1, False,
                  ['enter', 'exit:None', 'enter', 'exit:KeyError']),
    'augassign': (3, 'aaa', [1, 2], True),
    'del_stmt': (False, 1, True, 'kept'),
    'raise_assert_true': ('KeyError', "'raised in the body'"),
    'raise_assert_false': ('AssertionError', 'flag was false'),
    'enum_dup': (['a', 'b'], 1, ['enter', 'exit:TypeError']),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
