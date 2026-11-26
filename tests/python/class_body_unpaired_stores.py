"""Fixture: class-body stores the attribute pairs cannot express (#2304, #2340).

A class body binds a name with ``NAME = value`` or a plain unpack of names,
and Grail's walk compiles those as class attributes.  Every other assignment
CPython runs as a statement, at its own place in the body -- and Grail dropped
it, with no error, on every arm, for a module-level and a method-local class:

* a store through an attribute, ``ns.a = 1``, whose receiver is not a nested
  class or a def of the same body (#2304);
* a chained store with a target that is not a name, ``a = d['k'] = 1``;
* a starred or mixed unpack, ``x, *y = v`` and ``u, ns.b = v``;
* an augmented store through an attribute or a subscript, ``ns.n += 1``,
  ``d['k'] += 1`` (#2340).

Every expectation is CPython 3.14's, verified by running this file directly;
the IR arm (whose method-local classes are built by an IR helper), the text
helper (``GRAIL_IR_CLASS_HELPER=0``) and the text arm (``GRAIL_IR_CODEGEN=0``)
all agree with it.  ``_m`` cases are module-level classes, ``_l`` ones
method-local.

* ``attr_global`` / ``attr_enclosing``: the receiver is a module global, or a
  local of the enclosing function (#2304's own example).
* ``attr_body_name`` / ``attr_self_like``: the receiver is a name the body bound
  earlier, including ones called ``this`` and ``cls``; ``attr_param_self``: a
  parameter called ``self`` of the enclosing function.  (A class-body name
  called ``self`` is left out: Grail reads it as the module, a separate bug.)
* ``attr_chained``: ``a.b.c = v``.
* ``aug_attr`` / ``aug_subscript`` / ``aug_mixed``: augmented stores.
* ``annotated_attr``: ``ns.x: int = 1`` (no annotation recorded).
* ``in_blocks``: the stores inside a class-body ``if``, ``for``, ``try`` and
  ``with``.
* ``order``: the store runs at its own position, between the statements
  around it, which read what it left.
* ``eval_order``: CPython's evaluation order for each shape -- the value, then
  the targets left to right; an augmented store reads, evaluates, writes.
* ``raises`` / ``name_error``: a store that raises stops the class statement,
  and the class name is not bound.
* ``issue_2340``: #2340's own example.
* ``chain_mixed`` / ``unpack_mixed``: chains and unpacks mixing names,
  attributes, subscripts and starred targets; the names are class attributes
  that later statements read.
* ``rebind``: an unpack rebinding a name the body bound before.
* ``unpack_raises``: an unpack of a non-iterable raises TypeError.
* ``mangled``: private names in an unpack and an attribute target are mangled.
* ``prepare``: a ``__prepare__`` namespace sees every name these bind, in order.
* ``nested_class`` / ``sibling_def``: the two stores the walk already made --
  on a nested class and on a def -- still do, and a later read of the nested
  class's attribute now sees it.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class NS:
    pass


ns = NS()


# -- attr_global / attr_enclosing --------------------------------------------

try:
    class AttrGlobal:
        ns.a = 1
    r['attr_global_m'] = getattr(ns, 'a', None)
except Exception as exc:
    r['attr_global_m'] = '%s: %s' % (type(exc).__name__, exc)


def attr_enclosing():
    loc = NS()

    class C:
        loc.b = 2
        ns.c = 3
    return getattr(loc, 'b', None), getattr(ns, 'c', None)


record('attr_enclosing_l', attr_enclosing)


# -- attr_body_name / attr_self_like / attr_param_self --------------------------

try:
    class AttrBodyName:
        o = NS()
        o.x = 5
        y = o.x
    r['attr_body_name_m'] = (AttrBodyName.o.x, AttrBodyName.y)
except Exception as exc:
    r['attr_body_name_m'] = '%s: %s' % (type(exc).__name__, exc)


def attr_body_name():
    class C:
        o = NS()
        o.x = 5
        y = o.x
    return C.o.x, C.y


record('attr_body_name_l', attr_body_name)


def attr_self_like():
    class C:
        this = NS()
        this.attr = 'self-like'
        cls = NS()
        cls.z = 9
    return C.this.attr, C.cls.z


record('attr_self_like_l', attr_self_like)


def attr_param_self(self):
    class C:
        self.attr = 'param self'
    return getattr(self, 'attr', None)


record('attr_param_self_l', lambda: attr_param_self(NS()))


# -- attr_chained --------------------------------------------------------------

ns.inner = NS()
ns.inner.deep = NS()

try:
    class AttrChained:
        ns.inner.deep.v = 'chain'
        ns.inner.w = 'two'
    r['attr_chained_m'] = (getattr(ns.inner.deep, 'v', None), getattr(ns.inner, 'w', None))
except Exception as exc:
    r['attr_chained_m'] = '%s: %s' % (type(exc).__name__, exc)


# -- aug_attr / aug_subscript / aug_mixed ------------------------------------------

ns.count = 10
d_aug = {'k': 1}

try:
    class AugStores:
        ns.count += 1
        ns.count += 1
        d_aug['k'] += 5
    r['aug_m'] = (ns.count, d_aug['k'])
except Exception as exc:
    r['aug_m'] = '%s: %s' % (type(exc).__name__, exc)


def aug_stores():
    o = NS()
    o.n = 1
    d = {'k': [1]}

    class C:
        o.n += 4
        d['k'] += [2]
        k = (o.n, d['k'])
        x = 1
        x += 1
        n = NS()
        n.v = 1
        n.v += 1
    return o.n, d, C.k, C.x, C.n.v


record('aug_l', aug_stores)


# -- annotated_attr ----------------------------------------------------------------

def annotated_attr():
    o = NS()

    class C:
        o.ann: int = 7
        t = 1
    return o.ann, C.__annotations__


record('annotated_attr_l', annotated_attr)


# -- in_blocks ---------------------------------------------------------------------

class CM:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def in_blocks():
    o = NS()
    o.n = 1
    d = {'k': [1]}

    class C:
        if True:
            o.in_if = 'if'
            o.n += 10
            d['k'] += [2]
            a = d['j'] = 3
            u, *v = 'xyz'
        else:
            o.in_else = 'else'
        for i in range(2):
            o.in_for = i
            o.n += 1
            b = o.m = i
            h, *tl = (i, i)
        try:
            o.in_try = 'try'
            o.n *= 2
            c = d['t'] = 'try'
            raise ValueError
        except ValueError:
            o.in_except = 'except'
        finally:
            o.in_finally = 'finally'
        with CM():
            o.in_with = 'with'
            d['k'] += [3]
            w1, *w2 = [9, 8]
        seen = (a, u, v, b, h, tl, c, w1, w2)
    return (sorted(k for k in vars(o) if k.startswith('in_')), o.n, o.m, d, C.seen)


record('in_blocks_l', in_blocks)

try:
    o_blocks = NS()
    o_blocks.n = 1
    d_blocks = {'k': [1]}

    class InBlocks:
        if True:
            o_blocks.n += 10
            d_blocks['k'] += [2]
            a = d_blocks['j'] = 3
        for i in range(2):
            o_blocks.n += 1
            b = o_blocks.m = i
        try:
            o_blocks.n *= 2
        finally:
            pass
        with CM():
            o_blocks.w = 'with'
        seen = (a, b)
    r['in_blocks_m'] = (o_blocks.n, o_blocks.m, o_blocks.w, d_blocks, InBlocks.seen)
except Exception as exc:
    r['in_blocks_m'] = '%s: %s' % (type(exc).__name__, exc)


# -- order ---------------------------------------------------------------------------

try:
    class Order:
        ns.order = 1
        a = ns.order
        ns.order = 2
        b = ns.order
        ns.order = a + b
        c = ns.order
    r['order_m'] = (Order.a, Order.b, Order.c, ns.order)
except Exception as exc:
    r['order_m'] = '%s: %s' % (type(exc).__name__, exc)


# -- eval_order ----------------------------------------------------------------------

log = []


class Tracer:
    def __init__(self, name):
        object.__setattr__(self, 'name', name)

    def __getitem__(self, k):
        log.append(('get', k))
        return 10

    def __setitem__(self, k, v):
        log.append(('set', k, v))

    def __setattr__(self, k, v):
        log.append(('setattr', k, v))

    def __getattr__(self, k):
        log.append(('getattr', k))
        return 5


def val(x):
    log.append(('val', x))
    return x


def recv(tag):
    log.append(('recv', tag))
    return tracer


tracer = Tracer('t')


def eval_order():
    del log[:]

    class C:
        log.append('before')
        recv('one').se = val('v')
        z = tracer['i'] = tracer.at = val(1)
        tracer['j'] += val(2)
        tracer.q += val(3)
        p, tracer['s'], *tracer.t = val((1, 2, 3, 4))
        log.append('after')
    return list(log)


record('eval_order_l', eval_order)


# -- raises / name_error ---------------------------------------------------------------

class Slotted:
    __slots__ = ('q',)


so = Slotted()

try:
    class Raises:
        x = 1
        so.nope = 1
        y = 2
    r['raises_m'] = 'no error'
except AttributeError as exc:
    r['raises_m'] = type(exc).__name__
r['raises_bound_m'] = 'Raises' in globals()


def name_error():
    try:
        class C:
            undefined_name_2304.attr = 1
    except NameError as exc:
        return str(exc)
    return 'no error'


record('name_error_l', name_error)


# -- issue_2340 ------------------------------------------------------------------------

try:
    class Issue2340:
        d = {}
        a = d['k'] = 1
        x, *y = 1, 2, 3
        e = {'k': 1}
        e['k'] += 1
        after = (a, x, y)
    r['issue_2340_m'] = (getattr(Issue2340, 'a', 'MISSING'), Issue2340.d,
                         getattr(Issue2340, 'x', 'MISSING'), getattr(Issue2340, 'y', 'MISSING'),
                         Issue2340.e, Issue2340.after)
except Exception as exc:
    r['issue_2340_m'] = '%s: %s' % (type(exc).__name__, exc)


def issue_2340():
    class C:
        d = {}
        a = d['k'] = 1
        x, *y = 1, 2, 3
        e = {'k': 1}
        e['k'] += 1
        after = (a, x, y)
    return (getattr(C, 'a', 'MISSING'), C.d, getattr(C, 'x', 'MISSING'),
            getattr(C, 'y', 'MISSING'), C.e, C.after)


record('issue_2340_l', issue_2340)


# -- chain_mixed / unpack_mixed --------------------------------------------------------

def chain_unpack_mixed():
    o = NS()
    d = {}

    class C:
        p = o.a = d['z'] = q = 7
        o.b, d['w'], *rest = 1, 2, 3, 4
        [m, (n, o.c)] = 5, (6, 7)
        *front, last = 'abc'
        seen = (p, q, rest, m, n, front, last)
    return (C.p, C.q, C.rest, C.m, C.n, C.front, C.last, C.seen, vars(o), d)


record('mixed_l', chain_unpack_mixed)

try:
    o_mixed = NS()
    d_mixed = {}

    class Mixed:
        p = o_mixed.a = d_mixed['z'] = q = 7
        o_mixed.b, d_mixed['w'], *rest = 1, 2, 3, 4
        *front, last = 'abc'
        seen = (p, q, rest, front, last)
    r['mixed_m'] = (Mixed.p, Mixed.q, Mixed.rest, Mixed.front, Mixed.last, Mixed.seen,
                    vars(o_mixed), d_mixed)
except Exception as exc:
    r['mixed_m'] = '%s: %s' % (type(exc).__name__, exc)


# -- rebind / unpack_raises / mangled ----------------------------------------------------

def rebind():
    class C:
        x = 0
        x, *y = (4, 5)
        z = x
    return C.x, C.y, C.z


record('rebind_l', rebind)


def unpack_raises():
    try:
        class C:
            q = 1
            q, *w = 5
    except TypeError:
        return 'TypeError'
    return 'no error'


record('unpack_raises_l', unpack_raises)


def mangled():
    class C:
        __p, *__q = 1, 2
        n = NS()
        n.__r = 3
    return sorted(k for k in vars(C) if 'p' in k or 'q' in k), sorted(vars(C.n))


record('mangled_l', mangled)


# -- prepare -----------------------------------------------------------------------------

prepared = []


class Watching(dict):
    def __setitem__(self, k, v):
        if not k.startswith('__'):
            prepared.append(k)
        dict.__setitem__(self, k, v)


class Meta(type):
    @classmethod
    def __prepare__(mcls, name, bases):
        return Watching()


def prepare():
    del prepared[:]

    class C(metaclass=Meta):
        a = b = 1
        c, *d = 1, 2
        o = NS()
        e = o.x = 3
    return list(prepared)


record('prepare_l', prepare)


# -- nested_class / sibling_def -------------------------------------------------------------

try:
    class NestedClass:
        class Inner:
            pass
        Inner.x = 'nested'
        seen = getattr(Inner, 'x', None)
    r['nested_class_m'] = (NestedClass.Inner.x, NestedClass.seen)
except Exception as exc:
    r['nested_class_m'] = '%s: %s' % (type(exc).__name__, exc)


def sibling_def():
    class C:
        def meth(self):
            pass
        meth.mark = 'def'
        seen = getattr(meth, 'mark', None)
    return C.meth.mark, C.seen


record('sibling_def_l', sibling_def)


EXPECTED = {
    'annotated_attr_l': (7, {}),
    'attr_body_name_l': (5, 5),
    'attr_body_name_m': (5, 5),
    'attr_chained_m': ('chain', 'two'),
    'attr_enclosing_l': (2, 3),
    'attr_global_m': 1,
    'attr_param_self_l': 'param self',
    'attr_self_like_l': ('self-like', 9),
    'aug_l': (5, {'k': [1, 2]}, (5, [1, 2]), 2, 2),
    'aug_m': (12, 6),
    'eval_order_l': ['before', ('val', 'v'), ('recv', 'one'), ('setattr', 'se', 'v'), ('val', 1), ('set', 'i', 1), ('setattr', 'at', 1), ('get', 'j'), ('val', 2), ('set', 'j', 12), ('getattr', 'q'), ('val', 3), ('setattr', 'q', 8), ('val', (1, 2, 3, 4)), ('set', 's', 2), ('setattr', 't', [3, 4]), 'after'],
    'in_blocks_l': (['in_except', 'in_finally', 'in_for', 'in_if', 'in_try', 'in_with'], 26, 1, {'k': [1, 2, 3], 'j': 3, 't': 'try'}, (3, 'x', ['y', 'z'], 1, 1, [1], 'try', 9, [8])),
    'in_blocks_m': (26, 1, 'with', {'k': [1, 2], 'j': 3}, (3, 1)),
    'issue_2340_l': (1, {'k': 1}, 1, [2, 3], {'k': 2}, (1, 1, [2, 3])),
    'issue_2340_m': (1, {'k': 1}, 1, [2, 3], {'k': 2}, (1, 1, [2, 3])),
    'mangled_l': (['_C__p', '_C__q'], ['_C__r']),
    'mixed_l': (7, 7, [3, 4], 5, 6, ['a', 'b'], 'c', (7, 7, [3, 4], 5, 6, ['a', 'b'], 'c'), {'a': 7, 'b': 1, 'c': 7}, {'z': 7, 'w': 2}),
    'mixed_m': (7, 7, [3, 4], ['a', 'b'], 'c', (7, 7, [3, 4], ['a', 'b'], 'c'), {'a': 7, 'b': 1}, {'z': 7, 'w': 2}),
    'name_error_l': "name 'undefined_name_2304' is not defined",
    'nested_class_m': ('nested', 'nested'),
    'order_m': (1, 2, 3, 3),
    'prepare_l': ['a', 'b', 'c', 'd', 'o', 'e'],
    'raises_bound_m': False,
    'raises_m': 'AttributeError',
    'rebind_l': (4, [5], 4),
    'sibling_def_l': ('def', 'def'),
    'unpack_raises_l': 'TypeError',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
