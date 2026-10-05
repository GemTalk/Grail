"""BaseExceptionGroup's constructor, fields, split/subgroup and generic alias,
as CPython 3.14's test_exception_group drives them.

The module scored 23 failures and 1 error, and nearly all of them were things
Grail did not check or did not copy:

* construction validated NOTHING -- no arguments, three arguments, a non-str
  message, a set, None, an empty list and a list of classes all built a group,
  and an ExceptionGroup (or a subclass of one) happily held a KeyboardInterrupt;
* ``message`` and ``exceptions`` were read from ``args`` on every access, so
  clearing the list a group was built from emptied the group, and both could be
  assigned;
* split/subgroup only ever tested LEAVES, so ``eg.split(ExceptionGroup)`` matched
  nothing; a bad condition was accepted; the parts lost the original's
  traceback, cause, context and notes; and a group nested past the recursion
  limit split without complaint (``deep_split_outcome``, checked from
  Smalltalk -- see there);
* ``ExceptionGroup[OSError]`` was the class itself, and ``Exception[OSError]``
  was not refused;
* ``class MyEG(BaseExceptionGroup, ValueError)`` took ValueError as its storage
  base, so it had no ``exceptions`` at all.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import collections
import sys
import types


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def _kind(fn):
    return _outcome(fn)[0]


def _raised(exc):
    try:
        raise exc
    except BaseException as e:
        return e


# -------------------------------------------------------------- construction

def bad_constructor_arguments():
    return (_outcome(lambda: ExceptionGroup('no errors')),
            _outcome(lambda: ExceptionGroup('eg', [ValueError()], [TypeError()])),
            _outcome(lambda: ExceptionGroup(None, [ValueError(12)])),
            _outcome(lambda: ExceptionGroup('eg', {ValueError(42)})),
            _outcome(lambda: ExceptionGroup('eg', None)),
            _outcome(lambda: ExceptionGroup('eg', [])),
            _outcome(lambda: ExceptionGroup('eg', [OSError])),
            _outcome(lambda: ExceptionGroup('eg', [ValueError(1), 'not an exception'])))


def which_class_is_built():
    class MyEG(ExceptionGroup):
        pass

    class MyBEG(BaseExceptionGroup):
        pass

    class MixedEG(BaseExceptionGroup, ValueError):
        pass

    return (type(BaseExceptionGroup('m', [ValueError(1)])).__name__,
            type(BaseExceptionGroup('m', [KeyboardInterrupt(1)])).__name__,
            _outcome(lambda: ExceptionGroup('m', [ValueError(1), KeyboardInterrupt(2)])),
            _outcome(lambda: MyEG('m', [ValueError(1), KeyboardInterrupt(2)])),
            _outcome(lambda: MixedEG('m', [ValueError(1), KeyboardInterrupt(2)])),
            type(MyBEG('m', [KeyboardInterrupt(2)])).__name__,
            type(MixedEG('m', [ValueError(1), Exception(2)])).__name__)


def a_subclass_new_takes_its_own_arguments():
    class EG(ExceptionGroup):
        def __new__(cls, message, excs, code):
            obj = super().__new__(cls, message, excs)
            obj.code = code
            return obj

        def derive(self, excs):
            return EG(self.message, excs, self.code)

    eg = EG('m', [ValueError(1), TypeError(2)], 42)
    match, rest = eg.split(ValueError)
    return (type(eg).__name__, eg.code, repr(eg), type(match).__name__,
            match.code, repr(rest),
            _outcome(lambda: EG('m', [KeyboardInterrupt()], 7)))


def a_mixed_base_group_is_a_real_group():
    class MixedEG(BaseExceptionGroup, ValueError):
        pass

    try:
        raise MixedEG('m', [ValueError(1), Exception(2)])
    except ValueError as e:
        caught = e
    return (type(caught).__name__, len(caught.exceptions), caught.message,
            str(caught))


# -------------------------------------------------------------- fields and repr

def fields_are_readonly_snapshots():
    excs = [ValueError(1), TypeError(2)]
    eg = ExceptionGroup('test', excs)
    excs.clear()
    return (type(eg.exceptions).__name__, len(eg.exceptions), repr(eg), eg.args,
            _outcome(lambda: setattr(eg, 'message', 'new')),
            _outcome(lambda: setattr(eg, 'exceptions', [])),
            eg.message)


def repr_keeps_the_argument_shape():
    tup = BaseExceptionGroup('t', (ValueError(1), KeyboardInterrupt(2)))
    dq = collections.deque([ValueError(1), TypeError(2)])
    eg = ExceptionGroup('d', dq)
    dq.clear()
    return (repr(tup), repr(eg))


def a_broken_repr_fails_construction():
    class Seq(collections.abc.Sequence):
        def __init__(self, raises):
            self.raises = raises

        def __len__(self):
            return 1

        def __getitem__(self, index):
            if index == 0:
                return ValueError(1)
            raise IndexError

        def __repr__(self):
            if self.raises:
                raise self.raises
            return None

    return (_outcome(lambda: ExceptionGroup('test', Seq(None))),
            _kind(lambda: BaseExceptionGroup('test', Seq(ValueError))))


# -------------------------------------------------------------- split / subgroup

def _simple():
    return _raised(ExceptionGroup('simple', [_raised(ValueError(1)),
                                             _raised(TypeError(2))]))


def a_matching_group_is_answered_itself():
    eg = _simple()
    return (eg.subgroup(Exception) is eg, eg.subgroup(ExceptionGroup) is eg,
            eg.split(BaseExceptionGroup)[0] is eg, eg.split(BaseExceptionGroup)[1],
            eg.subgroup(ValueError) is eg,
            eg.subgroup(lambda e: isinstance(e, ExceptionGroup)) is eg)


def a_bad_condition_is_refused():
    eg = _simple()

    class C:
        pass

    return tuple(_kind(lambda a=a: eg.split(a))
                 for a in ['bad arg', C, OSError('x'), [OSError, TypeError],
                           (OSError, 42)])


def parts_carry_the_original_state():
    eg = _simple()
    try:
        raise eg from KeyError('cause')
    except ExceptionGroup as e:
        eg = e
    eg.add_note('note1')
    match, rest = eg.split(TypeError)
    match.add_note('match only')
    return (match.__traceback__ is eg.__traceback__,
            rest.__traceback__ is eg.__traceback__,
            match.__cause__ is eg.__cause__, rest.__context__ is eg.__context__,
            match.__suppress_context__, eg.__notes__, match.__notes__,
            rest.__notes__)


def non_sequence_notes_are_not_copied():
    eg = ExceptionGroup('eg', [ValueError(1), TypeError(2)])
    eg.__notes__ = 123
    match, rest = eg.split(TypeError)
    return (hasattr(match, '__notes__'), hasattr(rest, '__notes__'))


def derive_must_answer_a_group():
    class MyEg(ExceptionGroup):
        def derive(self, excs):
            return 42

    eg = MyEg('eg', [TypeError(1), ValueError(2)])
    return (_outcome(lambda: eg.split(TypeError)),
            _outcome(lambda: eg.subgroup(TypeError)))


def deep_split_outcome(depth):
    """split/subgroup of a group nested ``depth`` deep -- NOT one of the
    CPython-compared CHECKS, because the two runtimes bound this walk
    differently: CPython 3.14 by its C stack (measured: 50,000 levels split,
    150,000 do not), Grail at sys.getrecursionlimit(), the depth Grail's
    vendored test.support sizes test_exception_group's
    DeepRecursionInSplitAndSubgroup for.  Agreeing with CPython would mean
    building a 150,000-deep group on every import of this module, so the
    Smalltalk test calls this at the vendored depth instead and pins Grail's
    bound there."""
    e = TypeError(1)
    for i in range(depth):
        e = ExceptionGroup('eg', [e])
    return (_kind(lambda: e.split(TypeError)), _kind(lambda: e.subgroup(TypeError)))


# -------------------------------------------------------------- generics and except*

def only_the_groups_are_generic():
    return (isinstance(ExceptionGroup[OSError], types.GenericAlias),
            isinstance(BaseExceptionGroup[OSError], types.GenericAlias),
            _outcome(lambda: Exception[OSError]))


def except_star_on_a_naked_exception():
    try:
        raise ValueError(5)
    except* ValueError as e:
        caught = repr(e)
    try:
        try:
            raise ValueError(6)
        except* TypeError:
            pass
    except ValueError as e:
        passed_on = repr(e)
    return (caught, passed_on)


CHECKS = [
    bad_constructor_arguments, which_class_is_built,
    a_subclass_new_takes_its_own_arguments, a_mixed_base_group_is_a_real_group,
    fields_are_readonly_snapshots, repr_keeps_the_argument_shape,
    a_broken_repr_fails_construction, a_matching_group_is_answered_itself,
    a_bad_condition_is_refused, parts_carry_the_original_state,
    non_sequence_notes_are_not_copied, derive_must_answer_a_group,
    only_the_groups_are_generic,
    except_star_on_a_naked_exception,
]

EXPECTED = {
    'bad_constructor_arguments': (('TypeError', 'BaseExceptionGroup.__new__() takes exactly 2 arguments (1 given)'), ('TypeError', 'BaseExceptionGroup.__new__() takes exactly 2 arguments (3 given)'), ('TypeError', 'BaseExceptionGroup.__new__() argument 1 must be str, not None'), ('TypeError', 'second argument (exceptions) must be a sequence'), ('TypeError', 'second argument (exceptions) must be a sequence'), ('ValueError', 'second argument (exceptions) must be a non-empty sequence'), ('ValueError', 'Item 0 of second argument (exceptions) is not an exception'), ('ValueError', 'Item 1 of second argument (exceptions) is not an exception')),
    'which_class_is_built': ('ExceptionGroup', 'BaseExceptionGroup', ('TypeError', 'Cannot nest BaseExceptions in an ExceptionGroup'), ('TypeError', "Cannot nest BaseExceptions in 'MyEG'"), ('TypeError', "Cannot nest BaseExceptions in 'MixedEG'"), 'MyBEG', 'MixedEG'),
    'a_subclass_new_takes_its_own_arguments': ('EG', 42, "EG('m', [ValueError(1), TypeError(2)])", 'EG', 42, "EG('m', [TypeError(2)])", ('TypeError', "Cannot nest BaseExceptions in 'EG'")),
    'a_mixed_base_group_is_a_real_group': ('MixedEG', 2, 'm', 'm (2 sub-exceptions)'),
    'fields_are_readonly_snapshots': ('tuple', 2, "ExceptionGroup('test', [ValueError(1), TypeError(2)])", ('test', []), ('AttributeError', 'readonly attribute'), ('AttributeError', 'readonly attribute'), 'test'),
    'repr_keeps_the_argument_shape': ("BaseExceptionGroup('t', (ValueError(1), KeyboardInterrupt(2)))", "ExceptionGroup('d', deque([ValueError(1), TypeError(2)]))"),
    'a_broken_repr_fails_construction': (('TypeError', '__repr__ returned non-string (type NoneType)'), 'ValueError'),
    'a_matching_group_is_answered_itself': (True, True, True, None, False, True),
    'a_bad_condition_is_refused': ('TypeError', 'TypeError', 'TypeError', 'TypeError', 'TypeError'),
    'parts_carry_the_original_state': (True, True, True, True, True, ['note1'], ['note1', 'match only'], ['note1']),
    'non_sequence_notes_are_not_copied': (False, False),
    'derive_must_answer_a_group': (('TypeError', 'derive must return an instance of BaseExceptionGroup'), ('TypeError', 'derive must return an instance of BaseExceptionGroup')),
    'only_the_groups_are_generic': (True, True, ('TypeError', "type 'Exception' is not subscriptable")),
    'except_star_on_a_naked_exception': ("ExceptionGroup('', (ValueError(5),))", 'ValueError(6)'),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
