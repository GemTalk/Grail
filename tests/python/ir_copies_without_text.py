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
]


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
