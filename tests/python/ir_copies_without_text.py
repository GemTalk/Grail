"""Fixture: the run-time copies of a method behave as the def they came from.

Grail copies a class's compiled method onto another class, or under another
selector, in four places that run while a program runs rather than while a
class is built:

* a patch of a method a class's own methods self-send (``Sub.label = ...``)
  keeps the original under a ``___grailOrig_`` shadow on the patched class --
  a SUBCLASS of the definer here -- and dispatches through it;
* ``del D.m`` keeps the deleted method under the same kind of shadow, on the
  SAME class, for a bound method captured before the delete -- and a capture
  of a method nothing else defines still runs, even with ``None`` for self;
* ``Home.f(3)``, a class-body def called on an int, runs the def with a
  special receiver, which needs the method compiled for ``int``'s class --
  and likewise for a float and a bool (``None`` is checked beside them);
* a def of five or more arguments moved onto an unrelated class
  (``Away.five = Home.five``) is installed on that class to be run there.

An IR-built method is copied by generating its IR for the other class, under
the copy's own selector, with no Smalltalk text (plan P2.2).

The ``LBase``, ``DelLocal``, ``five_local`` and ``kind_local`` checks repeat
four of these copies with a def that defines a class: its class statement is
a helper method of the def's own class, which every copy has to reach.
``comp_target`` is #2256's shape on a special receiver: a lambda in a
comprehension whose target shadows the receiver parameter.

The special receiver's class and ``Away`` cannot reach that helper, so their
copies perform one generated for their own class (plan P2.3a).
``kind_captures`` and ``five_captures`` are the harder class statements: one
that reads the def's locals and its ``self``, has a decorator and a base
(values its caller evaluates), and holds a class of its own.

``SBase``, ``SMid`` and ``SLeaf`` patch, on a SUBCLASS, methods that read
slots and call ``super()``: the dispatcher's shadow there is the definer's own
method (plan P2.3b), and the subclass's self-sends must reach the patch while
the originals keep their ``super()`` and slot reads.

``NewHome.__new__`` and ``NewFive.__new__`` define a class in a def that runs
with the CLASS as its receiver, whose helper is filed on the metaclass too.
Called with an int, or with five more arguments on an instance of an
unrelated class, the receiver is not a class at all, and the copy performs
the helper generated for the receiver's class (plan P2.3b; these copies used
to fall back to the method's Smalltalk text twin, which the plan deleted).

``IRCopyRoutesTestCase`` runs these checks under Grail and counts the routes;
run as a script, this file is its own CPython oracle.
"""


class Base:
    def label(self):
        return 'Base'

    def describe(self):
        return self.label()


class Sub(Base):
    pass


class Deleting(Base):
    def label(self):
        return 'Deleting'


def _tagged(cls):
    cls.tagged = True
    return cls


class Home:
    def kind(self):
        return (type(self).__name__, self + 1)

    def name_of(self):
        return type(self).__name__

    def comp_target(x):
        return [f() for f in [lambda: x for x in range(x)]], x

    def kind_local(self):
        class Made:
            pass
        return (type(self).__name__, Made.__qualname__)

    def kind_captures(self):
        tag = 'cap'

        @_tagged
        class Made(Base):
            label = tag + type(self).__name__

            class Inner:
                pass
        return (Made.label, Made.__mro__[1].__name__, Made.Inner.__qualname__,
                Made.tagged)

    def five(self, a, b, c, d, e):
        return (type(self).__name__, a + b + c + d + e)

    def five_local(self, a, b, c, d, e):
        class Made:
            pass
        return (type(self).__name__, Made.__qualname__, a + b + c + d + e)

    def five_captures(self, a, b, c, d, e):
        total = a + b + c + d + e

        @_tagged
        class Made(Base):
            seen = total
        return (type(self).__name__, Made.seen, Made.tagged, Made().describe())


class Away:
    pass


class DelPlain:
    def m(self):
        return 'plain'


class NewHome:
    def __new__(cls):
        class Made:
            pass
        return (repr(cls), Made.__qualname__)


class NewFive:
    def __new__(cls, a, b, c, d, e):
        class Made:
            pass
        return (Made.__qualname__, a + b + c + d + e)


class LBase:
    def build(self):
        class Made:
            pass
        return Made.__qualname__

    def describe(self):
        return self.build()


class LSub(LBase):
    pass


class DelLocal:
    def m(self):
        class Made:
            pass
        return Made.__qualname__


def _dispatch_on_a_subclass():
    s = Sub()
    before = s.describe()
    Sub.label = lambda self: 'patched'
    return (before, s.describe(), Base().describe(), Base.label(s))


def _del_keeps_a_captured_method():
    d = Deleting()
    captured = d.label
    del Deleting.label
    return (captured(), d.label(), d.describe())


def _del_capture_with_no_inherited_method():
    captured = DelPlain.m
    del DelPlain.m
    return (captured(None), captured(DelPlain()), hasattr(DelPlain, 'm'))


def _dispatch_a_def_with_a_class():
    s = LSub()
    before = s.describe()
    LSub.build = lambda self: 'patched'
    return (before, s.describe(), LBase().describe(), LBase.build(s))


def _del_a_def_with_a_class():
    d = DelLocal()
    captured = d.m
    del DelLocal.m
    return (captured(), hasattr(DelLocal, 'm'))


def _five_with_a_class_on_another_class():
    Away.five_local = Home.five_local
    return Away().five_local(1, 2, 3, 4, 5)


def _special_receiver():
    return (Home.kind(3), Home.kind(True))


def _special_receivers_of_every_kind():
    return tuple(Home.name_of(v) for v in (3, 2.5, True, False, None))


def _special_receiver_comp_target():
    return Home.comp_target(2)


def _special_receiver_with_a_class():
    return Home.kind_local(3)


def _special_receiver_with_a_harder_class():
    return (Home.kind_captures(3), Home.kind_captures(2.5))


def _five_with_a_harder_class_on_another_class():
    Away.five_captures = Home.five_captures
    return Away().five_captures(1, 2, 3, 4, 5)


def _five_on_another_class():
    Away.five = Home.five
    return Away().five(1, 2, 3, 4, 5)


def _special_receiver_with_a_class_built_by_new():
    return (NewHome.__new__(3), NewHome.__new__(2.5))


def _five_new_on_an_unrelated_instance():
    return NewFive.__new__(Away(), 1, 2, 3, 4, 5)



class SBase:
    __slots__ = ('v',)

    def __init__(self, v):
        self.v = v

    def greet(self):
        return 'base:%s' % self.v

    def shout(self):
        return 'B'

    def describe(self):
        return self.greet() + '|' + self.shout()


class SMid(SBase):
    __slots__ = ('w',)

    def __init__(self, v, w):
        super().__init__(v)
        self.w = w

    def shout(self):
        return 'M' + super().shout()


class SLeaf(SMid):
    __slots__ = ()


def _subclass_shadow_with_super_and_slots():
    leaf = SLeaf(1, 2)
    before = leaf.describe()
    SLeaf.greet = lambda self: 'patched:%s:%s' % (self.v, self.w)
    after_greet = leaf.describe()
    SLeaf.shout = lambda self: 'P' + SMid.shout(self)
    after_shout = leaf.describe()
    return (before, after_greet, after_shout, SBase.greet(leaf), SMid.shout(leaf),
            SMid(3, 4).describe())


def patch_and_record(cls, name):
    """Not one of CHECKS: store a patch over cls.name and answer the messages
    of the warnings the store raised.  IRCopyRoutesTestCase calls it on a
    class whose dispatcher shadow can be neither shared nor generated."""
    import warnings
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        setattr(cls, name, lambda self: 'patched')
    return [str(w.message) for w in caught]


CHECKS = [
    ('dispatch_on_a_subclass', _dispatch_on_a_subclass,
     ('Base', 'patched', 'Base', 'Base')),
    ('del_keeps_a_captured_method', _del_keeps_a_captured_method,
     ('Deleting', 'Base', 'Base')),
    ('del_capture_with_no_inherited_method', _del_capture_with_no_inherited_method,
     ('plain', 'plain', False)),
    ('special_receiver', _special_receiver, (('int', 4), ('bool', 2))),
    ('special_receivers_of_every_kind', _special_receivers_of_every_kind,
     ('int', 'float', 'bool', 'bool', 'NoneType')),
    ('special_receiver_comp_target', _special_receiver_comp_target,
     ([1, 1], 2)),
    ('special_receiver_with_a_class', _special_receiver_with_a_class,
     ('int', 'Home.kind_local.<locals>.Made')),
    ('five_on_another_class', _five_on_another_class, ('Away', 15)),
    ('dispatch_a_def_with_a_class', _dispatch_a_def_with_a_class,
     ('LBase.build.<locals>.Made', 'patched', 'LBase.build.<locals>.Made',
      'LBase.build.<locals>.Made')),
    ('del_a_def_with_a_class', _del_a_def_with_a_class,
     ('DelLocal.m.<locals>.Made', False)),
    ('five_with_a_class_on_another_class', _five_with_a_class_on_another_class,
     ('Away', 'Home.five_local.<locals>.Made', 15)),
    ('special_receiver_with_a_harder_class', _special_receiver_with_a_harder_class,
     (('capint', 'Base', 'Home.kind_captures.<locals>.Made.Inner', True),
      ('capfloat', 'Base', 'Home.kind_captures.<locals>.Made.Inner', True))),
    ('five_with_a_harder_class_on_another_class',
     _five_with_a_harder_class_on_another_class, ('Away', 15, True, 'Base')),
    ('special_receiver_with_a_class_built_by_new',
     _special_receiver_with_a_class_built_by_new,
     (('3', 'NewHome.__new__.<locals>.Made'),
      ('2.5', 'NewHome.__new__.<locals>.Made'))),
    ('five_new_on_an_unrelated_instance', _five_new_on_an_unrelated_instance,
     ('NewFive.__new__.<locals>.Made', 15)),
    ('subclass_shadow_with_super_and_slots', _subclass_shadow_with_super_and_slots,
     ('base:1|MB', 'patched:1:2|MB', 'patched:1:2|PMB', 'base:1', 'MB', 'base:3|MB')),
]


class Patched:
    def label(self):
        return 'Patched'

    def describe(self):
        return self.label()


def patch_on_the_definer():
    """Not one of CHECKS: IRCopyRoutesTestCase calls it with no builder cached,
    so the dispatcher's shadow on Patched -- the class that defines label --
    shares the method rather than rebuild the class (plan P2.3b)."""
    p = Patched()
    before = p.describe()
    Patched.label = lambda self: 'patched'
    return (before, p.describe(), Patched.describe(p))


def run_checks():
    """[(name, ok, actual)] for every check."""
    out = []
    for name, fn, expected in CHECKS:
        try:
            actual = fn()
        except Exception as e:
            actual = '%s: %s' % (type(e).__name__, e)
        out.append((name, actual == expected, actual))
    return out


if __name__ == '__main__':
    for name, ok, actual in run_checks():
        print('%-36s %s %r' % (name, 'OK ' if ok else 'DIFF', actual))
    print('%-36s %r' % ('patch_on_the_definer', patch_on_the_definer()))
