"""Fixture: a ``super(...)'' call the compiler does NOT rewrite.

Grail's text path rewrites exactly two spellings into a Super proxy: the
zero-argument ``super()'' and the two-argument ``super(C, obj)'' whose first
argument is a BARE NAME.  Everything else -- a dotted first argument, a
subscript, a literal, the wrong arity -- falls through to the ordinary call
path, where ``super'' is read as a value (the module's shadow probe, falling
back to the Super class) and applied to its arguments:

    ((mod ___grailShadowedSuper___) ifNil: [Super]) value: { ... } value: nil

That is the correct thing to do: it is what makes ``super(1, 2)'' raise
TypeError rather than compile into a proxy, and it is how
``super(_SubParsersAction._ChoicesPseudoAction, self)'' works in `argparse'.

The shapes below are the ones a rewrite must NOT claim.  Four of them are error
cases, and an error case is the easiest kind of conformance to lose silently: a
rewrite that accepted them would answer a working proxy where CPython raises.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


class Base:
    def __init__(self):
        self.tag = 'base'

    def who(self):
        return 'Base'


class Outer:
    class Inner(Base):
        def __init__(self, v):
            super(Outer.Inner, self).__init__()
            self.v = v

        def who(self):
            return 'Inner+' + super(Outer.Inner, self).who()


i = Outer.Inner(5)
r['a_dotted_first_argument'] = (i.v, i.tag, i.who())


CLASSES = []


class BySubscript(Base):
    def who(self):
        return 'Sub+' + super(CLASSES[0], self).who()


CLASSES.append(BySubscript)

r['a_subscript_first_argument'] = BySubscript().who()


def three_arguments():
    try:
        super(int, int, int)
        return 'no raise'
    except TypeError:
        return 'TypeError'


r['three_arguments_raise'] = three_arguments()


def non_type_first():
    try:
        super(1, 2)
        return 'no raise'
    except TypeError:
        return 'TypeError'


r['a_non_type_first_argument_raises'] = non_type_first()


class InAMethod(Base):
    def bad(self):
        try:
            super(1, self)
            return 'no raise'
        except TypeError:
            return 'TypeError'

    def unrelated_instance(self):
        try:
            super(Outer.Inner, self)
            return 'no raise'
        except TypeError:
            return 'TypeError'


r['a_non_type_first_argument_in_a_method'] = InAMethod().bad()
r['an_unrelated_instance_raises'] = InAMethod().unrelated_instance()


class OneArg(Base):
    def unbound(self):
        s = super(OneArg)
        return type(s).__name__


r['one_argument_gives_an_unbound_super'] = OneArg().unbound()


class Box:
    class Item(Base):
        @classmethod
        def make(cls):
            made = super(Box.Item, cls).__new__(cls)
            made.tag = 'made'
            return made


r['a_dotted_first_argument_in_a_classmethod'] = Box.Item.make().tag


EXPECTED = {
    'a_dotted_first_argument': (5, 'base', 'Inner+Base'),
    'a_subscript_first_argument': 'Sub+Base',
    'three_arguments_raise': 'TypeError',
    'a_non_type_first_argument_raises': 'TypeError',
    'a_non_type_first_argument_in_a_method': 'TypeError',
    'an_unrelated_instance_raises': 'TypeError',
    'one_argument_gives_an_unbound_super': 'super',
    'a_dotted_first_argument_in_a_classmethod': 'made',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
