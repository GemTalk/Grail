"""Fixtures for CPython's "Did you mean: 'x'?" suggestion on an AttributeError.

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Three things had to exist before a suggestion could be computed at all, and each
is pinned below because each was independently missing:

1. ``dir(instance)'' has to report the class's attributes and the instance's own.
   Grail's object.__dir__ scanned env-1 SELECTORS only, so a class body's data
   attributes (which compile to accessors on the metaclass) and per-instance
   attributes (dynamic instVars) were both invisible -- every candidate list was
   empty.
2. The AttributeError has to carry CPython's ``name'' and ``obj''.  ``name'' is
   the misspelling to match; ``obj'' supplies the candidates.
3. A BARE ``raise AttributeError()'' from a user __getattr__ has to get those
   two stamped on by the attribute machinery, as CPython's
   set_attribute_error_context does.

The distances and tie-breaks are CPython's own (Python/suggestions.c), which is
why the ordering checks below are meaningful rather than arbitrary: they pin
substitution over elimination over addition, and a case change over any of them.

Run this file under CPython (``python3 tests/python/attr_suggestions.py'') to see
what it produces -- that is where the expectations come from.
"""

import traceback


def _render(exc):
    return ''.join(traceback.format_exception_only(exc)).strip()


def _suggestion_for(obj, attr):
    """The rendered exception line for a failed ``obj.attr''."""
    try:
        getattr(obj, attr)
    except AttributeError as e:
        return _render(e)
    return '<no error>'


class Substitution:
    noise = more_noise = a = bc = None
    blech = None


class Elimination:
    noise = more_noise = a = bc = None
    blch = None


class Addition:
    noise = more_noise = a = bc = None
    bluchin = None


class SubstitutionOverElimination:
    blach = None
    bluc = None


class EliminationOverAddition:
    blucha = None
    bluc = None


class CaseChangeOverSubstitution:
    Luch = None
    fluch = None
    BLuch = None


class WithInstanceAttr:
    def __init__(self):
        self.blech = None


class BareRaiser:
    blech = None

    def __getattr__(self, attr):
        raise AttributeError()


class LongNames:
    blech = None


def _render_exc():
    """The traceback of the exception being handled, as text."""
    import traceback
    return traceback.format_exc()


def dir_of_an_instance_reports_class_and_instance_attributes():
    """Rule 1.  Without this every other check here is unreachable."""
    inst = WithInstanceAttr()
    inst.extra = 1
    names = dir(inst)
    return ('blech' in names and 'extra' in names
            and '__init__' in names)


def an_attributeerror_carries_name_and_obj():
    """Rule 2.  CPython has exposed both since 3.10."""
    obj = Substitution()
    try:
        obj.bluch
    except AttributeError as e:
        return (getattr(e, 'name', None) == 'bluch'
                and getattr(e, 'obj', None) is obj)
    return False


def a_close_attribute_is_suggested():
    return "Did you mean: 'blech'?" in _suggestion_for(Substitution(), 'bluch')


def the_suggestion_follows_cpythons_edit_costs():
    """The tie-breaks are the point: each class below offers two candidates and
    CPython picks a specific one."""
    cases = [
        (Substitution(), 'bluch', "'blech'"),
        (Elimination(), 'bluch', "'blch'"),
        (Addition(), 'bluch', "'bluchin'"),
        (SubstitutionOverElimination(), 'bluch', "'blach'"),
        (EliminationOverAddition(), 'bluch', "'bluc'"),
        (CaseChangeOverSubstitution(), 'bluch', "'BLuch'"),
    ]
    for obj, attr, expected in cases:
        if expected not in _suggestion_for(obj, attr):
            return False
    return True


def an_instance_attribute_can_be_suggested():
    """Set in __init__, so it exists only on the instance -- the half dir() used
    to miss entirely."""
    return "'blech'" in _suggestion_for(WithInstanceAttr(), 'bluch')


def a_bare_attributeerror_still_gets_a_suggestion():
    """Rule 3.  ``raise AttributeError()'' carries no message and no name, and
    CPython still suggests -- rendering "AttributeError: . Did you mean: ..." ,
    colon and all, because the suffix alone makes the message non-empty."""
    rendered = _suggestion_for(BareRaiser(), 'bluch')
    return "Did you mean: 'blech'?" in rendered


def a_wildly_wrong_name_gets_no_suggestion():
    """No more than a third of the characters involved may need changing."""
    rendered = _suggestion_for(LongNames(), 'somethingverywrong')
    return 'Did you mean' not in rendered and 'blech' not in rendered


def an_exact_match_is_never_suggested():
    """A name that IS a candidate is not a typo -- it failed for another reason,
    so suggesting it back would be noise."""
    class OnlyDir:
        def __dir__(self):
            return ['blech']

    return 'Did you mean' not in _suggestion_for(OnlyDir(), 'blech')


def an_underscored_candidate_is_hidden_from_a_plain_typo():
    """CPython offers ``_bluch'' for ``_blach'' but not for ``bluch''."""
    class Underscored:
        _bluch = None

    return ("'_bluch'" in _suggestion_for(Underscored(), '_blach')
            and "'_bluch'" not in _suggestion_for(Underscored(), 'bluch'))


def a_non_string_candidate_is_ignored():
    """__dir__ may return anything; only str candidates are considered, and a
    non-str must not raise while rendering the error."""
    class WeirdDir:
        def __dir__(self):
            return [None, 42, 'blech']

    return "'blech'" in _suggestion_for(WeirdDir(), 'bluch')


def an_unrenderable_message_does_not_break_the_line():
    """``AttributeError(obj)'' where str(obj) fails: the formatter has to stay
    total, and the suggestion still has to appear."""
    class NonStringify:
        __str__ = None
        __repr__ = None

    class Raiser:
        blech = None

        def __getattr__(self, attr):
            raise AttributeError(NonStringify())

    return 'blech' in _suggestion_for(Raiser(), 'bluch')



# ---- NameError candidates from the frame's LOCALS ------------------------
#
# CPython's candidates for a misspelled bare name are the frame's locals,
# globals and builtins.  Grail could offer globals and builtins but not locals:
# a Python function's locals are Smalltalk method temporaries, and a traceback is
# rendered after the stack unwound, from a capture holding only
# (method, ip, receiver).  They are snapshotted at RAISE time instead, for the
# three exception types that can carry a suggestion.
#
# These read the RENDERED message, so they say nothing about how it was
# obtained and pass unchanged under CPython -- which is the point: the mechanism
# is Grail-specific and the behaviour is not.


def a_local_name_is_suggested():
    """The candidate that was unreachable: a name bound only in the frame."""
    def f():
        blech = 1
        return bluch
    try:
        f()
    except NameError:
        return "Did you mean: 'blech'?" in _render_exc()
    return 'no error'


def a_local_wins_over_a_worse_global():
    """Locals and globals are pooled, and the NEAREST wins -- so a local must be
    able to beat a global that is merely further away."""
    def f():
        blich = 1
        return bluch
    try:
        f()
    except NameError:
        return "Did you mean: 'blich'?" in _render_exc()
    return 'no error'


def a_local_bound_to_none_is_still_a_candidate():
    """An unassigned temp is omitted from the snapshot, which is right, and is
    only safe because None is distinguishable from unassigned.  A local
    explicitly bound to None must therefore still be offered."""
    def f():
        blech = None
        return bluch
    try:
        f()
    except NameError:
        return "Did you mean: 'blech'?" in _render_exc()
    return 'no error'


def a_wildly_wrong_bare_name_gets_no_local_suggestion():
    """The snapshot must not make Grail MORE helpful than CPython."""
    def f():
        blech = 1
        return zzzzzzzzzzzzzz
    try:
        f()
    except NameError:
        return 'Did you mean' not in _render_exc()
    return 'no error'


if __name__ == '__main__':
    checks = [
        dir_of_an_instance_reports_class_and_instance_attributes,
        an_attributeerror_carries_name_and_obj,
        a_close_attribute_is_suggested,
        the_suggestion_follows_cpythons_edit_costs,
        an_instance_attribute_can_be_suggested,
        a_bare_attributeerror_still_gets_a_suggestion,
        a_wildly_wrong_name_gets_no_suggestion,
        an_exact_match_is_never_suggested,
        an_underscored_candidate_is_hidden_from_a_plain_typo,
        a_non_string_candidate_is_ignored,
        an_unrenderable_message_does_not_break_the_line,
        a_local_name_is_suggested,
        a_local_wins_over_a_worse_global,
        a_local_bound_to_none_is_still_a_candidate,
        a_wildly_wrong_bare_name_gets_no_local_suggestion,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
