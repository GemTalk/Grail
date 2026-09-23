"""Fixture: ``obj.x op= v`` and ``obj[i] op= v`` -- augmented assignment to an
ATTRIBUTE or SUBSCRIPT target, inside a function or method.

An augmented assignment is not a read, a binary operation and a store. CPython
offers the IN-PLACE dunder first and falls back to the binary one, and a binary
dunder that DECLINES must reach the REFLECTED dunder rather than having its
NotImplemented stored. Both only happen if the emit routes the loaded value
through the runtime helper; applying the bare binary operator loses both, and
loses them QUIETLY:

  * a lost in-place dunder still produces the right VALUE under the target's
    own name.  It goes wrong only for a second name bound to the same object,
    which is why every list check here also records an ALIAS identity;
  * a stored NotImplemented is a value, not an error.  It surfaces wherever the
    attribute is next read, arbitrarily far from the statement that wrote it.

The four target shapes are separate branches of the emit and are probed
separately rather than assumed to follow one another: a ``self`` attribute
reaching the instance's own storage, a declared SLOT reaching its accessor
pair, any other receiver going through the polymorphic attribute protocol, and
a subscript going through __getitem__/__setitem__.

Every statement under test sits inside a function or a method, because that is
what the IR path compiles; the module-scope spelling is the sibling fixture
augassign_module_target.py.
"""

import types

r = {}


class AcceptsRor:
    """Declines nothing; it is the RIGHT-hand side whose reflected dunder runs."""

    def __ror__(self, other):
        return 'ror-ran'


class DeclinesOr:
    """A left-hand side whose forward dunder declines, so the reflected one must
    be reached.  Without it the stored value is NotImplemented."""

    def __or__(self, other):
        return NotImplemented

    def __repr__(self):
        return 'DeclinesOr()'


class TracksInPlace:
    """Answers WHICH dunder ran, so a binary fallback cannot masquerade as an
    in-place one by arriving at the same value."""

    def __init__(self):
        self.log = []

    def __iadd__(self, other):
        self.log.append('iadd')
        return self

    def __add__(self, other):
        self.log.append('add')
        return self


_PROXY = types.MappingProxyType({1: 'c'})


# --- a ``self`` attribute -----------------------------------------------------

class SelfAttr:
    def __init__(self):
        self.lst = [1]
        self.d = {0: 'a'}
        self.tracker = TracksInPlace()
        self.decliner = DeclinesOr()

    def extend(self):
        alias = self.lst
        self.lst += [2]
        return self.lst, self.lst is alias

    def merge_proxy(self):
        self.d |= _PROXY
        return self.d

    def which_dunder(self):
        self.tracker += 1
        return self.tracker.log

    def reflected(self):
        self.decliner |= AcceptsRor()
        return self.decliner


_sa = SelfAttr()
r['self_attr_value'], r['self_attr_in_place'] = _sa.extend()
r['self_attr_reflected_proxy'] = _sa.merge_proxy()
r['self_attr_inplace_dunder_ran'] = _sa.which_dunder()
r['self_attr_reflected_custom'] = _sa.reflected()


# --- a declared SLOT ----------------------------------------------------------

class Slotted:
    __slots__ = ('lst', 'decliner')

    def __init__(self):
        self.lst = [1]
        self.decliner = DeclinesOr()

    def extend(self):
        alias = self.lst
        self.lst += [2]
        return self.lst, self.lst is alias

    def reflected(self):
        self.decliner |= AcceptsRor()
        return self.decliner


_sl = Slotted()
r['slot_value'], r['slot_in_place'] = _sl.extend()
r['slot_reflected_custom'] = _sl.reflected()


# --- any OTHER receiver -------------------------------------------------------

class Holder:
    def __init__(self):
        self.lst = [1]
        self.decliner = DeclinesOr()
        self.tracker = TracksInPlace()


def bump_foreign(h):
    alias = h.lst
    h.lst += [2]
    return h.lst, h.lst is alias


def reflect_foreign(h):
    h.decliner |= AcceptsRor()
    return h.decliner


def track_foreign(h):
    h.tracker += 1
    return h.tracker.log


_h = Holder()
r['foreign_attr_value'], r['foreign_attr_in_place'] = bump_foreign(_h)
r['foreign_attr_reflected_custom'] = reflect_foreign(_h)
r['foreign_attr_inplace_dunder_ran'] = track_foreign(_h)


# --- a SUBSCRIPT target -------------------------------------------------------

def bump_subscript(d):
    alias = d['k']
    d['k'] += [2]
    return d['k'], d['k'] is alias


def reflect_subscript(d):
    d['k'] |= AcceptsRor()
    return d['k']


def track_subscript(d):
    d['k'] += 1
    return d['k'].log


r['subscript_value'], r['subscript_in_place'] = bump_subscript({'k': [1]})
r['subscript_reflected_custom'] = reflect_subscript({'k': DeclinesOr()})
r['subscript_inplace_dunder_ran'] = track_subscript({'k': TracksInPlace()})


# --- the SELF REFERENCE IS A CLASS, or the store has a hook -------------------
# ``self.x op= v'' is the self-attribute branch, and its store used to write
# the instance's dynamic-instVar storage directly.  Two everyday shapes put a
# CLASS in that position -- a @classmethod's ``cls'' and PEP 487's
# ``__init_subclass__'' -- and a class cannot hold dynamic instVars, so the
# store was an uncatchable ImproperOperation.  And writing storage directly
# stepped past a __setattr__ override or a @property setter, both of which a
# Python assignment must go through.  The store is __setattr__, as the plain
# ``self.x = v'' beside it always was.

class Counted:
    count = 0

    @classmethod
    def bump(cls):
        cls.count += 1
        return cls.count


r['classmethod_cls_attr'] = (Counted.bump(), Counted.bump())


class Registry:
    names = []

    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        cls.names = cls.names + [cls.__name__]
        cls.hooks_run = getattr(cls, 'hooks_run', 0)
        cls.hooks_run += 1


class RegA(Registry):
    pass


r['init_subclass_cls_attr'] = (RegA.names, RegA.hooks_run)


class Hooked:
    def __init__(self):
        object.__setattr__(self, 'n', 1)
        object.__setattr__(self, 'seen', [])

    def bump(self):
        self.n += 1
        return self.n


class HookedChild(Hooked):
    def __setattr__(self, name, value):
        self.seen.append(name)
        object.__setattr__(self, name, value)


_hc = HookedChild()
r['setattr_hook_sees_augassign'] = (_hc.bump(), _hc.seen)


class WithProperty:
    def __init__(self):
        self._v = 10
        self.sets = 0

    @property
    def v(self):
        return self._v

    @v.setter
    def v(self, value):
        self.sets += 1
        self._v = value

    def bump(self):
        self.v += 5
        return (self.v, self.sets)


r['property_setter_fires_on_augassign'] = WithProperty().bump()


EXPECTED = {
    'self_attr_value': [1, 2],
    'self_attr_in_place': True,
    'self_attr_reflected_proxy': {0: 'a', 1: 'c'},
    'self_attr_inplace_dunder_ran': ['iadd'],
    'self_attr_reflected_custom': 'ror-ran',
    'slot_value': [1, 2],
    'slot_in_place': True,
    'slot_reflected_custom': 'ror-ran',
    'foreign_attr_value': [1, 2],
    'foreign_attr_in_place': True,
    'foreign_attr_reflected_custom': 'ror-ran',
    'foreign_attr_inplace_dunder_ran': ['iadd'],
    'subscript_value': [1, 2],
    'subscript_in_place': True,
    'subscript_reflected_custom': 'ror-ran',
    'subscript_inplace_dunder_ran': ['iadd'],
    'classmethod_cls_attr': (1, 2),
    'init_subclass_cls_attr': (['RegA'], 1),
    'setattr_hook_sees_augassign': (2, ['n']),
    'property_setter_fires_on_augassign': (15, 1),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-34s is not in EXPECTED' % ('FAIL', extra))
