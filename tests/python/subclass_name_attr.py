# Fixture for SubclassNameAttrTestCase.
#
# A Python class that declares ``name: str'' as a bare annotation
# triggers Grail's auto-generated ``name'' classInstVar accessor +
# setter pair on the metaclass.  Pre-fix, the
# ``___inheritClassAttrs___'' inheritance copy then read the parent
# class's Smalltalk-side ``name'' instVar (= the class's printed
# name) and wrote it into every subclass's ``name'' slot —
# overwriting the subclass's actual class name.
#
# Surfaced in jinja2.nodes: ``class _FilterTestCommon(Expr):''
# has ``name: str'' and ``class Filter(_FilterTestCommon):'' picks
# up the inheritance copy.  Result: Filter.__name__ ==
# '_FilterTestCommon' — visitor dispatch by name failed
# silently, ``isinstance(node, Filter)'' couldn't distinguish
# Filter from Test, and the compiler dropped every ``|filter''
# expression.
#
# Fix: ``___inheritClassAttrs___'' excludes kernel metaclass
# instVar names (``name'', ``category'', ``superClass'', ...)
# from the inheritance copy.


class WithNameField:
    """Parent declares a 'name: str' annotation that conflicts with
    the Smalltalk-kernel metaclass 'name' instVar."""

    name: str
    fields = ('name',)


class ChildOfWithName(WithNameField):
    """Subclass that doesn't redeclare 'name'.  Its __name__ must
    stay 'ChildOfWithName', not get overwritten to 'WithNameField'
    by the inheritance copy."""

    pass


parent_name = WithNameField.__name__              # 'WithNameField'
child_name = ChildOfWithName.__name__             # 'ChildOfWithName'
parent_and_child_differ = parent_name != child_name


# Same shape with 'category' (another kernel metaclass slot).
class WithCategoryField:
    category: str
    fields = ('category',)


class ChildOfCategory(WithCategoryField):
    pass


child_category_name = ChildOfCategory.__name__    # 'ChildOfCategory'
