"""An override without a docstring reports None, not its base's docstring.

A class-body def's docstring lives in its class's method doc table, and the
read walks the superclass chain to find it.  The table held documented defs
only, so an undocumented override had no entry, the walk went on to the
base, and ``Sub.refresh.__doc__`` answered ``Base.refresh``'s docstring.
CPython says None.

google-auth's ``_helpers.copy_docstring(Base)`` decorator raises
``Method already has a docstring`` when the method it is handed has one, and
it decorates overrides throughout, so 18 of its submodules failed to import
(#1650).

Every expectation was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


SEEN = {}


def show(f):
    SEEN[f.__name__] = f.__doc__
    return f


class Base:
    def refresh(self):
        """Base doc."""

    async def fetch(self):
        """Async base."""

    @property
    def prop(self):
        """Property base."""

    @classmethod
    def make(cls):
        """Classmethod base."""

    @staticmethod
    def util():
        """Staticmethod base."""


class Decorated(Base):
    @show
    def refresh(self):
        pass

    @show
    async def fetch(self):
        pass

    @show
    def fresh(self):
        pass


check('a_decorator_sees_no_docstring_on_an_override',
      [SEEN['refresh'], SEEN['fetch'], SEEN['fresh']], [None, None, None])


class Plain(Base):
    def refresh(self):
        pass

    @property
    def prop(self):
        pass

    @classmethod
    def make(cls):
        pass

    @staticmethod
    def util():
        pass


check('an_undocumented_override_is_none',
      [Plain.refresh.__doc__, Plain().refresh.__doc__], [None, None])
check('every_method_kind_is_none_when_overridden',
      [Plain.prop.__doc__, Plain.make.__doc__, Plain.util.__doc__,
       Plain().make.__doc__, Plain().util.__doc__],
      [None, None, None, None, None])


class Inherits(Base):
    pass


check('an_inherited_method_still_reports_its_base',
      [Inherits.refresh.__doc__, Inherits().refresh.__doc__,
       Inherits.prop.__doc__, Inherits.make.__doc__, Inherits.util.__doc__],
      ['Base doc.', 'Base doc.', 'Property base.', 'Classmethod base.',
       'Staticmethod base.'])


class Documented(Base):
    def refresh(self):
        """Own doc."""


class Grandchild(Plain):
    pass


check('the_nearest_definition_decides',
      [Documented.refresh.__doc__, Grandchild.refresh.__doc__,
       Grandchild().refresh.__doc__],
      ['Own doc.', None, None])


class Alias(Base):
    refresh = Base.refresh


check('an_alias_is_the_base_function', Alias.refresh.__doc__, 'Base doc.')


class Mixin:
    def refresh(self):
        pass


class Other:
    def other(self):
        pass


class MixinFirst(Mixin, Base):
    pass


class BaseFirst(Base, Mixin):
    pass


class OtherFirst(Other, Base):
    pass


check('several_bases_follow_the_mro',
      [MixinFirst.refresh.__doc__, BaseFirst.refresh.__doc__,
       OtherFirst.refresh.__doc__],
      [None, 'Base doc.', 'Base doc.'])


def copy_docstring(source_class):
    """google-auth's _helpers.copy_docstring, verbatim but for the error."""
    def decorator(method):
        if method.__doc__:
            raise ValueError('Method already has a docstring.')
        source_method = getattr(source_class, method.__name__)
        method.__doc__ = source_method.__doc__
        return method
    return decorator


def _copy_docstring_on_an_override():
    try:
        class Credentials(Base):
            @copy_docstring(Base)
            def refresh(self):
                pass
    except ValueError as exc:
        return 'ValueError: %s' % exc
    return Credentials.refresh.__doc__


check('google_auth_copy_docstring_decorates_an_override',
      _copy_docstring_on_an_override(), 'Base doc.')


class WithSetter:
    @property
    def spam(self):
        """Getter doc."""

    @spam.setter
    def spam(self, value):
        pass


class Redefined:
    def twice(self):
        """First."""

    def twice(self):
        pass


check('a_setter_keeps_the_getter_docstring', WithSetter.spam.__doc__,
      'Getter doc.')
check('a_redefinition_without_a_docstring_is_none', Redefined.twice.__doc__,
      None)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
