"""Fixture: a store evaluates its parts in CPython's order, each once.

CPython evaluates an assignment's VALUE first and only then the target's
receiver and index (Python/codegen.c, Assign_kind and codegen_annassign), so
``no_name[k] = 1/0`` raises ZeroDivisionError, not NameError, and
``f().x = g()`` calls g before f.  An augmented assignment evaluates the
receiver and index ONCE, before the value, and reads them for both the load
and the store (codegen_augassign), so ``d[next(it)] += 1`` advances the
iterator once.  Grail evaluated the target before the value, on both codegen
paths, and evaluated an augmented target's receiver and index twice.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Holder:
    pass


def store_order():
    order = []

    def note(label, result=None):
        order.append(label)
        return label if result is None else result

    holder = Holder()
    holder.attr = 0
    table = {'idx': 0}
    seen = {}
    note('obj', holder).attr = note('val')
    seen['attribute'] = order[:]; order.clear()
    note('obj', holder).attr: int = note('val')
    seen['annotated_attribute'] = order[:]; order.clear()
    note('obj', table)[note('idx')] = note('val')
    seen['subscript'] = order[:]; order.clear()
    note('obj', table)[note('idx')]: int = note('val')
    seen['annotated_subscript'] = order[:]; order.clear()
    note('obj', holder).__class__ = note('val', Holder)
    seen['class_change'] = order[:]; order.clear()
    note('o1', table)[note('i1')] = note('o2', table)[note('i2')] = note('val')
    seen['chained'] = order[:]; order.clear()
    a, note('obj', table)[note('idx')] = note('val', (1, 2))
    seen['unpacked'] = order[:]; order.clear()
    table['idx'] = 0
    note('obj', table)[note('idx')] += note('val', 1)
    seen['augmented_subscript'] = order[:]; order.clear()
    holder.attr = 0
    note('obj', holder).attr += note('val', 1)
    seen['augmented_attribute'] = order[:]; order.clear()
    return seen


r.update(store_order())


def raised(statement):
    try:
        exec(statement, {})
    except Exception as e:
        return type(e).__name__
    return 'nothing'


r['value_before_unbound_target'] = [raised(s) for s in (
    "no_name[does_not_exist] = 1/0",
    "no_name.attr = 1/0",
    "def f():\n    no_name[does_not_exist]: no_name_again = 1/0\nf()",
    "def f():\n    no_name.attr: int = 1/0\nf()",
    "def f():\n    no_name[does_not_exist]: 1/0 = 0\nf()")]


def augmented_once():
    keys = iter([1, 2, 3])
    counts = {1: 0, 2: 100, 3: 0}
    counts[next(keys)] += 10
    first = Holder()
    first.n = 5
    holders = iter([first, Holder()])
    next(holders).n += 1
    return counts, first.n


r['augmented_once'] = augmented_once()


class Recorder:
    def __init__(self):
        self.items = {}
        self.log = []

    def key(self):
        self.log.append('key')
        return 'k'

    def run(self):
        self.items[self.key()] = self.log.append('value') or 1
        self.items[self.key()] += self.log.append('increment') or 1
        return self.log, self.items


r['method_receiver'] = Recorder().run()

EXPECTED = {
    'attribute': ['val', 'obj'],
    'annotated_attribute': ['val', 'obj'],
    'subscript': ['val', 'obj', 'idx'],
    'annotated_subscript': ['val', 'obj', 'idx'],
    'class_change': ['val', 'obj'],
    'chained': ['val', 'o1', 'i1', 'o2', 'i2'],
    'unpacked': ['val', 'obj', 'idx'],
    'augmented_subscript': ['obj', 'idx', 'val'],
    'augmented_attribute': ['obj', 'val'],
    'value_before_unbound_target': ['ZeroDivisionError'] * 4 + ['NameError'],
    'augmented_once': ({1: 10, 2: 100, 3: 0}, 6),
    'method_receiver': (['value', 'key', 'key', 'increment'], {'k': 2}),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
