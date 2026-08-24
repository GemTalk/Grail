"""PEP 654: BaseExceptionGroup(msg, excs) answers an ExceptionGroup when it can.

    BaseExceptionGroup('m', [ValueError()])          -> ExceptionGroup
    BaseExceptionGroup('m', [KeyboardInterrupt()])   -> BaseExceptionGroup

This is what makes the ordinary spellings work -- ``except ExceptionGroup`` and
``except* ValueError`` both want the narrowed class.  Grail always built a
BaseExceptionGroup, so a group of ordinary errors escaped ``except
ExceptionGroup`` entirely.

Found by vendoring asyncio.TaskGroup, which raises
``BaseExceptionGroup('unhandled errors in a TaskGroup', self._errors)`` and whose
tests all catch ExceptionGroup: 17 of the 96 in
test.test_asyncio.test_taskgroups.

THE NESTED CASE IS THE INTERESTING ONE, and it is why the check cannot be a
plain isinstance test in the implementation.  CPython declares ``class
ExceptionGroup(BaseExceptionGroup, Exception)`` -- two bases -- so an
ExceptionGroup is itself an Exception and a group OF groups narrows.  GemStone
is single-inheritance, so Grail's ExceptionGroup descends from
BaseExceptionGroup alone; the rule that makes ``except Exception`` catch one
lives in Exception class >> handles:, and the narrowing consults that rather
than the class hierarchy.  Nested TaskGroups -- what anyio and FastAPI actually
build -- are exactly this case.
"""


def a_group_of_exceptions_narrows():
    return type(BaseExceptionGroup('m', [ValueError('a'), TypeError('b')])) is ExceptionGroup


def a_group_containing_a_baseexception_does_not():
    g = BaseExceptionGroup('m', [KeyboardInterrupt(), ValueError('a')])
    return type(g) is BaseExceptionGroup and not isinstance(g, ExceptionGroup)


def the_narrowed_group_is_caught_as_an_exceptiongroup():
    try:
        raise BaseExceptionGroup('m', [ValueError('a')])
    except ExceptionGroup:
        return True
    except BaseException:
        return False


def a_group_of_groups_narrows_too():
    """The nested case: a sub-exception that is itself an ExceptionGroup counts
    as an Exception, so the outer group narrows as well."""
    inner = ExceptionGroup('inner', [ValueError('a')])
    return type(BaseExceptionGroup('outer', [inner])) is ExceptionGroup


def a_group_of_groups_does_not_narrow_if_one_carries_a_baseexception():
    """A BaseExceptionGroup sub-exception is NOT an Exception, so the outer
    group must stay a BaseExceptionGroup -- this is the check that stops
    ``except Exception`` from swallowing a KeyboardInterrupt two levels down."""
    inner = BaseExceptionGroup('inner', [KeyboardInterrupt()])
    return type(BaseExceptionGroup('outer', [inner])) is BaseExceptionGroup


def a_subclass_of_baseexceptiongroup_is_never_replaced():
    """CPython narrows only when cls IS BaseExceptionGroup.  A user subclass
    keeps its own identity even when every member is an Exception."""
    class MyGroup(BaseExceptionGroup):
        pass

    return type(MyGroup('m', [ValueError('a')])) is MyGroup


def exceptiongroup_itself_is_unaffected():
    """Constructing an ExceptionGroup directly must not recurse into the
    narrowing and must not be re-pointed at anything."""
    return type(ExceptionGroup('m', [ValueError('a')])) is ExceptionGroup


def except_star_matches_inside_a_narrowed_group():
    """The other spelling people reach for.

    A GUARD rather than a discriminator, and worth saying so: measured with the
    narrowing reverted, this one still passed, because Grail's except* machinery
    matches against BaseExceptionGroup directly and never needed the narrowed
    class.  It is here so that stays true.
    """
    seen = []
    try:
        raise BaseExceptionGroup('m', [ValueError('a'), TypeError('b')])
    except* ValueError:
        seen.append('ValueError')
    except* TypeError:
        seen.append('TypeError')
    return seen == ['ValueError', 'TypeError']


CHECKS = (
    a_group_of_exceptions_narrows,
    a_group_containing_a_baseexception_does_not,
    the_narrowed_group_is_caught_as_an_exceptiongroup,
    a_group_of_groups_narrows_too,
    a_group_of_groups_does_not_narrow_if_one_carries_a_baseexception,
    a_subclass_of_baseexceptiongroup_is_never_replaced,
    exceptiongroup_itself_is_unaffected,
    except_star_matches_inside_a_narrowed_group,
)

r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
