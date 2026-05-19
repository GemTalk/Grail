from collections import OrderedDict, deque, namedtuple, Counter, ChainMap, defaultdict


def ordered_dict_keeps_order():
    d = OrderedDict()
    d['c'] = 3
    d['a'] = 1
    d['b'] = 2
    return list(d.keys())


def ordered_dict_move_to_end():
    d = OrderedDict()
    d['a'] = 1
    d['b'] = 2
    d['c'] = 3
    d.move_to_end('a')
    return list(d.keys())


def ordered_dict_popitem():
    d = OrderedDict()
    d['a'] = 1
    d['b'] = 2
    return d.popitem(last=True), d.popitem(last=False)


def deque_basic_ops():
    q = deque()
    q.append(1)
    q.append(2)
    q.appendleft(0)
    return list(q)


def deque_pop_both_ends():
    q = deque([10, 20, 30, 40, 50])
    return q.popleft(), q.pop(), list(q)


def deque_maxlen():
    q = deque(maxlen=3)
    for v in [1, 2, 3, 4, 5]:
        q.append(v)
    return list(q)


def deque_rotate():
    q = deque([1, 2, 3, 4, 5])
    q.rotate(2)
    return list(q)


def namedtuple_basic():
    # Grail's namedtuple supports indexed access and _fields / _asdict
    # introspection.  Attribute-style access (`p.x`) needs __getattr__
    # plumbing the runtime doesn't have yet; fall back to indexing.
    Point = namedtuple('Point', ['x', 'y'])
    p = Point(3, 4)
    return p[0], p[1], list(p._fields), len(p)


def namedtuple_from_string():
    Pair = namedtuple('Pair', 'first second')
    p = Pair('a', 'b')
    return p[0], p[1], list(p._fields)


def namedtuple_asdict():
    Color = namedtuple('Color', ['r', 'g', 'b'])
    c = Color(10, 20, 30)
    return c._asdict()


def counter_count_iterable():
    c = Counter('abracadabra')
    return c['a'], c['b'], c['r'], c['z']


def counter_update_dict():
    c = Counter()
    c.update({'a': 5, 'b': 2})
    c.update({'a': 3})
    return c['a'], c['b']


def counter_most_common():
    c = Counter('aaabbc')
    return c.most_common(2)


def counter_total():
    c = Counter([1, 1, 2, 3, 3, 3])
    return c.total()


def chainmap_lookup():
    a = {'x': 1}
    b = {'x': 2, 'y': 20}
    cm = ChainMap(a, b)
    return cm['x'], cm['y']


def chainmap_write_goes_first():
    a = {'x': 1}
    b = {'x': 2}
    cm = ChainMap(a, b)
    cm['z'] = 99
    return cm['z'], 'z' in a, 'z' in b


def chainmap_contains_and_iter():
    a = {'a': 1}
    b = {'b': 2, 'a': 99}
    cm = ChainMap(a, b)
    return ('a' in cm), ('b' in cm), ('c' in cm), sorted(list(cm))


def defaultdict_still_works():
    d = defaultdict(list)
    d['x'].append(1)
    d['x'].append(2)
    d['y'].append(3)
    return d['x'], d['y'], len(d)
