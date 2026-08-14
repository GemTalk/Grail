"""A subclass's ``def`` shadows a same-named class attribute from a base.

CPython holds a class's attributes and its functions in ONE __dict__ and lets
the MRO settle the name: whichever class is nearer wins, whichever KIND it
supplies.  Grail splits them -- ClassDefAst compiles a class-body ``x = v``
to an accessor pair on the metaclass and a ``def x`` to an instance method --
and the class-attribute probes ran first, so a BASE class's attribute beat a
SUBCLASS's own def.

    class Base:
        enum = enumerate
    class Sub(Base):
        def enum(self, it, start=11): ...
    Sub().enum('abc')          # ran Base's attribute

test_enumerate's TestStart and TestLongStart exist precisely to override the
base's ``enum`` with a method, so all 12 of their tests failed on this.

The rule has to hold everywhere the name can be answered, which is why the
cases below come in pairs: read through an INSTANCE and read off the CLASS,
with and without a defaulted parameter (those compile to different selectors
and took different branches).

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------- a method shadows an inherited value

class Base:
    tag = 'BASE-ATTR'
    plain = 'BASE-PLAIN'
    number = 1

    def via_base(self):
        """Reads the name through the BASE, so the call site cannot know a
        subclass turned it into a method."""
        return self.tag


class Sub(Base):
    def tag(self, x):
        return ('SUB-METHOD', x)

    def plain(self, x, start=11):
        """A DEFAULTED parameter compiles to the varargs selector, which took
        a different branch than the fixed-arity form above."""
        return ('SUB-DEFAULTED', x, start)

    def number(self):
        return 2


check('instance_call_fixed_arity', lambda: Sub().tag('q'), ('SUB-METHOD', 'q'))
check('instance_call_defaulted', lambda: Sub().plain('q'),
      ('SUB-DEFAULTED', 'q', 11))
check('instance_call_defaulted_explicit', lambda: Sub().plain('q', 3),
      ('SUB-DEFAULTED', 'q', 3))
# Read through a method defined on the BASE: the base's own body says
# ``self.tag``, and self is a Sub, so the subclass's method wins.
check('read_via_base_method', lambda: Sub().via_base()('z'),
      ('SUB-METHOD', 'z'))
# ...and off the CLASS, which is a separate lookup path.
check('class_side_read_is_callable', lambda: callable(Sub.tag), True)
check('class_side_call', lambda: Sub.tag(Sub(), 'q'), ('SUB-METHOD', 'q'))
# A non-callable inherited value is the worst case: it made the call
# ``'Integer' object is not callable`` rather than merely wrong.
check('non_callable_attr_shadowed', lambda: Sub().number(), 2)
# The base still sees its own attributes.
check('base_keeps_its_attribute', lambda: Base().tag, 'BASE-ATTR')
check('base_class_keeps_its_attribute', lambda: Base.tag, 'BASE-ATTR')
check('base_number_unchanged', lambda: Base.number, 1)


# ------------------------------------------- what must NOT change

class Plain:
    """No subclass method anywhere: the attribute is still the answer."""
    value = 42


class PlainSub(Plain):
    pass


check('inherited_attr_without_method', lambda: PlainSub().value, 42)
check('inherited_attr_without_method_class', lambda: PlainSub.value, 42)


class SameClass:
    """The class that defines the method ALSO binds the name -- the ordinary
    monkey-patch.  Last write wins, so the attribute stays: excluding the
    owning class from the walk is what preserves this."""
    def m(self):
        return 'method'
    m = 'REBOUND'


check('same_class_rebinding_wins', lambda: SameClass().m, 'REBOUND')
check('same_class_rebinding_wins_on_class', lambda: SameClass.m, 'REBOUND')


class WithClassMethods:
    """@classmethod / @staticmethod have no unary setter, so they are not
    class-body data and the rule must leave them alone."""
    @classmethod
    def cm(cls):
        return 'classmethod'

    @staticmethod
    def sm():
        return 'staticmethod'


class WithClassMethodsSub(WithClassMethods):
    pass


check('classmethod_via_instance', lambda: WithClassMethodsSub().cm(),
      'classmethod')
check('classmethod_via_class', lambda: WithClassMethodsSub.cm(),
      'classmethod')
check('staticmethod_via_instance', lambda: WithClassMethodsSub().sm(),
      'staticmethod')


class WithProperty:
    @property
    def p(self):
        return 'prop'


class WithPropertySub(WithProperty):
    pass


check('inherited_property_still_reads', lambda: WithPropertySub().p, 'prop')


class Deep(Sub):
    """Three levels: the method is not on the receiver's own class, but it is
    still NEARER than the base holding the attribute."""
    pass


check('method_inherited_from_middle_class', lambda: Deep().tag('q'),
      ('SUB-METHOD', 'q'))


class ReAttributed(Sub):
    """A grandchild rebinding the name back to a value: now IT is nearest,
    so the value wins again."""
    tag = 'GRANDCHILD-ATTR'


check('nearest_binding_wins_again', lambda: ReAttributed().tag,
      'GRANDCHILD-ATTR')
