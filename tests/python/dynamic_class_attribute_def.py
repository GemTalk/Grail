"""Fixture: a def decorated with ``@DynamicClassAttribute`` is that descriptor.

``@DynamicClassAttribute`` (and ``@enum.property``, which Grail's types.py
aliases to it) decorates a def the way ``@property`` does, and Grail compiles
all three to the same accessor pair.  Only the builtin property was ever built
back into an object, so for the other two:

* the class ``__dict__`` held the getter FUNCTION, and a subclass doing
  ``spam = Base.__dict__['spam']; @spam.getter def spam`` had no ``getter`` to
  call;
* a read off the class answered a ``property`` where CPython refuses with
  AttributeError (unless the descriptor is abstract, when it answers itself),
  so ``hasattr(C, 'spam')`` was True and ABCMeta missed an inherited abstract
  attribute.

And an ``@x.setter`` over a name the body ASSIGNED was compiled as a fixed
accessor beside the assigned descriptor instead of calling ``x.setter(f)``, so
the setter never reached it -- for a builtin property as much as for this one.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import abc
import enum
from types import DynamicClassAttribute

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Base:
    def __init__(self):
        self._spam = 5

    @DynamicClassAttribute
    def spam(self):
        """Base.getter"""
        return self._spam

    @spam.setter
    def spam(self, value):
        self._spam = value


# --- the class __dict__ holds the descriptor, accessors and doc --------------
def dict_entry():
    entry = Base.__dict__['spam']
    return [isinstance(entry, DynamicClassAttribute), entry.__doc__,
            callable(entry.fget), entry.fset is not None, entry.fdel is None]


r['dict_entry'] = outcome(dict_entry)
r['vars_entry_is_dict_entry'] = outcome(lambda: vars(Base)['spam'] is Base.__dict__['spam'])
r['instance_access'] = outcome(lambda: Base().spam)


# --- a read off the class is refused, as an ordinary missing attribute -------
r['class_read_refused'] = outcome(lambda: [hasattr(Base, 'spam'), getattr(Base, 'spam', 'default')])


class OnTheMetaclass(type):
    def __getattr__(cls, name):
        return 'metaclass __getattr__ for ' + name


class Virtual(metaclass=OnTheMetaclass):
    @DynamicClassAttribute
    def eggs(self):
        return 'instance eggs'


r['refusal_reaches_metaclass_getattr'] = outcome(lambda: [Virtual.eggs, Virtual().eggs])


# --- a subclass copies the base's descriptor and replaces its halves ---------
class Sub(Base):
    spam = Base.__dict__['spam']

    @spam.getter
    def spam(self):
        """Sub.getter"""
        return ('sub', self._spam)

    @spam.setter
    def spam(self, value):
        self._spam = ('set', value)

    @spam.deleter
    def spam(self):
        self._spam = 'deleted'


def subclass_overrides():
    sub = Sub()
    seen = [sub.spam]
    sub.spam = 3
    seen.append(sub._spam)
    del sub.spam
    seen.append(sub._spam)
    return seen


r['subclass_overrides'] = outcome(subclass_overrides)
r['subclass_doc'] = outcome(lambda: Sub.__dict__['spam'].__doc__)
r['base_unchanged'] = outcome(lambda: [Base().spam, Base.__dict__['spam'] is not Sub.__dict__['spam']])


# --- an accessor over an ASSIGNED descriptor is an ordinary decorator --------
def setter_over_copied(kind):
    class Original:
        def __init__(self):
            self._v = 1

        @kind
        def v(self):
            return self._v

        @v.setter
        def v(self, value):
            self._v = value

    class Copy(Original):
        v = Original.__dict__['v']

        @v.setter
        def v(self, value):
            self._v = 'from the copy'

    obj = Copy()
    obj.v = 7
    return [obj.v, type(Copy.__dict__['v']) is kind]


r['setter_over_copied_dynamic_class_attribute'] = outcome(lambda: setter_over_copied(DynamicClassAttribute))
r['setter_over_copied_property'] = outcome(lambda: setter_over_copied(property))


def get_value(self):
    return self._v


def setter_over_assigned_call():
    class Assigned:
        _v = 1
        v = DynamicClassAttribute(get_value)

        @v.setter
        def v(self, value):
            self._v = ('set', value)

    obj = Assigned()
    obj.v = 4
    return obj._v


r['setter_over_assigned_call'] = outcome(setter_over_assigned_call)


# --- abstract: the GETTER decides, and an abstract one reads off its class ---
class AbstractGetter(metaclass=abc.ABCMeta):
    @DynamicClassAttribute
    @abc.abstractmethod
    def color(self):
        pass


class AbstractDescriptor(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    @DynamicClassAttribute
    def color(self):
        pass


class InheritsAbstractGetter(AbstractGetter):
    pass


class InheritsAbstractDescriptor(AbstractDescriptor):
    pass


class Concrete(AbstractGetter):
    @DynamicClassAttribute
    def color(self):
        return self._color

    def __init__(self):
        self._color = 'cyan'


r['abstract_class_read'] = outcome(lambda: [isinstance(AbstractGetter.color, DynamicClassAttribute),
                                            isinstance(AbstractDescriptor.color, DynamicClassAttribute)])
r['abstract_inherited'] = outcome(lambda: [sorted(InheritsAbstractGetter.__abstractmethods__),
                                           sorted(InheritsAbstractDescriptor.__abstractmethods__)])
r['abstract_refuses_instantiation'] = outcome(lambda: [
    outcome(InheritsAbstractGetter).split(':')[0], outcome(InheritsAbstractDescriptor).split(':')[0]])
r['concrete_override'] = outcome(lambda: [sorted(Concrete.__abstractmethods__), hasattr(Concrete, 'color'),
                                          Concrete().color])


@abc.abstractmethod
def abstract_setter(self, value):
    pass


r['abstract_asks_the_getter_only'] = outcome(lambda: [
    DynamicClassAttribute(get_value, abstract_setter).__isabstractmethod__,
    property(get_value, abstract_setter).__isabstractmethod__])


class RefusesTruth:
    def __bool__(self):
        raise ValueError('no truth value')


def marked_with_a_refusing_value(self):
    pass


marked_with_a_refusing_value.__isabstractmethod__ = RefusesTruth()

r['refusing_value_raises_at_construction'] = outcome(lambda: DynamicClassAttribute(marked_with_a_refusing_value))


# --- unchanged: the builtin property, and enum.property ----------------------
class WithProperty:
    @property
    def ham(self):
        """ham doc"""
        return 2


r['builtin_property'] = outcome(lambda: [type(WithProperty.__dict__['ham']) is property,
                                         WithProperty.ham is WithProperty.__dict__['ham'],
                                         WithProperty().ham])


class Color(enum.Enum):
    RED = 1

    @enum.property
    def shade(self):
        return 'light ' + self.name.lower()


r['enum_property'] = outcome(lambda: [Color.RED.shade, isinstance(Color.__dict__['shade'], enum.property),
                                      hasattr(Color, 'shade'), 'shade' in dir(Color.RED)])


EXPECTED = {
    'dict_entry': [True, 'Base.getter', True, True, True],
    'vars_entry_is_dict_entry': True,
    'instance_access': 5,
    'class_read_refused': [False, 'default'],
    'refusal_reaches_metaclass_getattr': ['metaclass __getattr__ for eggs', 'instance eggs'],
    'subclass_overrides': [('sub', 5), ('set', 3), 'deleted'],
    'subclass_doc': 'Sub.getter',
    'base_unchanged': [5, True],
    'setter_over_copied_dynamic_class_attribute': ['from the copy', True],
    'setter_over_copied_property': ['from the copy', True],
    'setter_over_assigned_call': ('set', 4),
    'abstract_class_read': [True, True],
    'abstract_inherited': [['color'], ['color']],
    'abstract_refuses_instantiation': ['TypeError', 'TypeError'],
    'concrete_override': [[], False, 'cyan'],
    'abstract_asks_the_getter_only': [False, True],
    'refusing_value_raises_at_construction': 'ValueError: no truth value',
    'builtin_property': [True, True, 2],
    'enum_property': ['light red', True, False, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
