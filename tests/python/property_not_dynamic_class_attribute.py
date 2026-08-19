"""``property'' and ``enum.property'' are not related by inheritance.

Upstream, ``enum.property'' derives from ``types.DynamicClassAttribute'', which
derives from ``object''.  It RE-IMPLEMENTS the descriptor protocol rather than
inheriting it, so the two hierarchies never meet and
``isinstance(Enum.__dict__['name'], property)'' is False.

Grail shared the implementation the obvious Smalltalk way -- DynamicClassAttribute
subclassed PropertyDescriptor, which IS the ``property'' builtin -- and that
isinstance answered True.  The behaviour was right; only the relationship was
wrong, which is why it stayed invisible until something CLASSIFIED on it:

    pydoc.classify_class_attrs:
        if inspect.isdatadescriptor(value):
            kind = 'data descriptor'
            if isinstance(value, property) and value.fset is None:
                kind = 'readonly property'

Enum.name and Enum.value are data descriptors with no setter, so ``help(Color)''
printed ``Readonly properties inherited from enum.Enum:'' where CPython prints
``Data descriptors ...''.  That was the last remaining difference in test_enum's
TestStdLib.test_pydoc, and inspect.classify_class_attrs had already grown a
DynamicClassAttribute branch upstream does not have to keep the same isinstance
from reporting kind 'property' -- a second symptom of the one cause.

The fix moves the shared behaviour to an abstract superclass and hangs both
classes off it as siblings, so the isinstance answers are CPython's and the
implementation is still written once.  That base stands in for ``object'' rather
than being a class CPython has, so it is hidden from Python-visible __mro__ the
way PythonInstance is -- otherwise ``property.__mro__'', which was right, would
start naming a base the builtin does not have.

The MRO checks below are therefore not decoration: they are what stops the
sibling split from leaking a Grail-internal name into two builtins' MROs.
"""

import inspect
import types
from enum import Enum
from io import StringIO
import pydoc


class Color(Enum):
    CYAN = 1
    MAGENTA = 2


_name_descr = Enum.__dict__['name']
_plain = property(lambda self: 1)


def _kind(classifier, cls, name):
    for a in classifier(cls):
        if a[0] == name:
            return a[1]
    return None


r = {}

# --- the relationship itself ------------------------------------------------------------
r['dca_is_property'] = repr(issubclass(types.DynamicClassAttribute, property))
r['property_is_dca'] = repr(issubclass(property, types.DynamicClassAttribute))
r['name_isinstance_property'] = repr(isinstance(_name_descr, property))
r['name_isinstance_dca'] = repr(isinstance(_name_descr, types.DynamicClassAttribute))
r['plain_isinstance_property'] = repr(isinstance(_plain, property))
r['plain_isinstance_dca'] = repr(isinstance(_plain, types.DynamicClassAttribute))

# --- the shared base must not show up as a base of either -------------------------------
# Both are rooted directly at ``object'' upstream, so each MRO is exactly two long.
# The property CLASS is reached through an instance rather than by name: in Grail
# the builtin ``property'' is a function stand-in, so ``property.__mro__'' is an
# AttributeError there and would make the check vacuous rather than false.
r['property_mro_len'] = repr(len(type(_plain).__mro__))
r['property_mro_tail'] = repr(type(_plain).__mro__[-1] is object)
r['dca_mro_len'] = repr(len(types.DynamicClassAttribute.__mro__))
r['dca_mro_tail'] = repr(types.DynamicClassAttribute.__mro__[-1] is object)

# --- what classifies on it --------------------------------------------------------------
# A data descriptor either way: the type implements __set__/__delete__, which is
# CPython's whole test and is unaffected by which base supplies them.
r['name_isdatadescriptor'] = repr(inspect.isdatadescriptor(_name_descr))
r['pydoc_kind_name'] = repr(_kind(pydoc.classify_class_attrs, Color, 'name'))
r['pydoc_kind_value'] = repr(_kind(pydoc.classify_class_attrs, Color, 'value'))
# inspect's own classifier has no DynamicClassAttribute case upstream; ``name''
# reaches the 'data' fallback only because the property test above is False.
r['inspect_kind_name'] = repr(_kind(inspect.classify_class_attrs, Color, 'name'))
r['inspect_kind_value'] = repr(_kind(inspect.classify_class_attrs, Color, 'value'))
# A real property still classifies as one, on both classifiers.  The CALL form,
# because that is the one Grail stores as a descriptor -- see the recorded gap at
# the bottom for the decorator form.


def _get_p(self):
    return 1


class HasProp:
    p = property(_get_p)


class HasDecoratedProp:
    @property
    def q(self):
        return 1


r['pydoc_kind_prop'] = repr(_kind(pydoc.classify_class_attrs, HasProp, 'p'))
r['inspect_kind_prop'] = repr(_kind(inspect.classify_class_attrs, HasProp, 'p'))

# --- the heading pydoc actually prints ---------------------------------------------------
_out = StringIO()
pydoc.Helper(output=_out)(Color)
_help = _out.getvalue()
r['help_says_data_descriptors'] = repr('Data descriptors inherited from enum.Enum:' in _help)
r['help_says_readonly_props'] = repr('Readonly properties inherited from enum.Enum:' in _help)

# --- the shared behaviour still reaches both ---------------------------------------------
# fget/fset/fdel, the doc handling and __set_name__ live on the abstract base now;
# nothing about either class's descriptor protocol may change.
r['name_fget_present'] = repr(_name_descr.fget is not None)
r['name_doc'] = repr(_name_descr.__doc__)
r['plain_fset_none'] = repr(_plain.fset is None)
r['plain_setter_has_fset'] = repr(_plain.setter(lambda self, v: None).fset is not None)
r['prop_set_name'] = repr(HasProp.__dict__['p'].__name__)

# An enum.property REFUSES class access -- that is the one method the subclass
# adds, and it must survive the reparenting.
try:
    Color.name
    r['class_access'] = repr('no error')
except AttributeError:
    r['class_access'] = repr('AttributeError')


# --- KNOWN GAP, recorded rather than papered over -----------------------------------------
# Upstream these are two classes: ``enum.property'' derives from
# ``types.DynamicClassAttribute''.  Grail's types.py aliases one to the other, so
# they are one object with one __name__.  Splitting them is a separate change and
# nothing in test_enum reads the difference; what test_enum DOES read -- that
# neither is a ``property'' -- is asserted above.
import enum as _enum
r['dca_is_enum_property'] = repr(types.DynamicClassAttribute is _enum.property)

# The DECORATOR form ``@property def q'' is compiled by ClassDefAst into a plain
# getter METHOD, so no descriptor is stored and both classifiers answer 'method'.
# Long-standing and orthogonal to this change -- the CALL form above, which does
# store one, is what exercises the isinstance this file is about.
r['decorated_pydoc_kind'] = repr(_kind(pydoc.classify_class_attrs, HasDecoratedProp, 'q'))
r['decorated_inspect_kind'] = repr(_kind(inspect.classify_class_attrs, HasDecoratedProp, 'q'))


EXPECTED = {
    'dca_is_property': repr(False),
    'property_is_dca': repr(False),
    'name_isinstance_property': repr(False),
    'name_isinstance_dca': repr(True),
    'plain_isinstance_property': repr(True),
    'plain_isinstance_dca': repr(False),
    'property_mro_len': repr(2),
    'property_mro_tail': repr(True),
    'dca_mro_len': repr(2),
    'dca_mro_tail': repr(True),
    'name_isdatadescriptor': repr(True),
    'pydoc_kind_name': repr('data descriptor'),
    'pydoc_kind_value': repr('data descriptor'),
    'inspect_kind_name': repr('data'),
    'inspect_kind_value': repr('data'),
    'pydoc_kind_prop': repr('readonly property'),
    'inspect_kind_prop': repr('property'),
    'help_says_data_descriptors': repr(True),
    'help_says_readonly_props': repr(False),
    'name_fget_present': repr(True),
    'name_doc': repr('The name of the Enum member.'),
    'plain_fset_none': repr(True),
    'plain_setter_has_fset': repr(True),
    'prop_set_name': repr('p'),
    'class_access': repr('AttributeError'),
}

GRAIL_ONLY = {
    'dca_is_enum_property': repr(True),
    'decorated_pydoc_kind': repr('method'),
    'decorated_inspect_kind': repr('method'),
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-28s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
