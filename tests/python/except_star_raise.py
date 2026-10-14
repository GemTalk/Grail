"""Fixture: what an ``except*'' clause raises, and what the statement raises.

test_except_star failed 20 of its 60 tests, in four groups, all fixed here:

* A group raised a SECOND time vanished.  Once an exception has escaped a
  handler, raising it again signals a CARRIER (an empty instance of its class
  that refers to it), and ``except*'' matched the carrier instead of the
  exception: nothing matched, nothing was left over, and the statement
  finished as if the ``try'' had succeeded.  The split tests raise one group
  through four helpers, so every helper after the first saw ``None''.

* An exception raised INSIDE a clause escaped at once.  CPython runs every
  clause, then raises the new exceptions first, in order, followed by what is
  left of the original as one group -- ``ExceptionGroup('', [TypeError(3),
  ExceptionGroup('eg', [ValueError(1)])])'' -- or the single exception
  itself when that is all there is.  It tells a re-raise from a new raise by
  METADATA, so ``raise e'' of the matched part is a new raise (it gained a
  traceback entry) where a bare ``raise'' is not.

* ``except* ExceptionGroup'' (or a tuple holding one, or a non-class) is a
  TypeError when the clause is reached; Grail matched nothing.

* A group subclass's own ``split'' decides the match, and must return a
  tuple of at least two.

The unhandled remainder now propagates the way RERAISE does, without a new
traceback entry, so it keeps the very traceback object the matched parts hold.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _frames(e):
    out = []
    tb = e.__traceback__
    while tb is not None:
        out.append((tb.tb_frame.f_code.co_name, tb.tb_lineno - _BASE))
        tb = tb.tb_next
    return out


def _outcome(thunk):
    try:
        thunk()
    except BaseException as e:
        parts = getattr(e, 'exceptions', None)
        if parts is None:
            return (repr(e), repr(e.__context__))
        return (repr(e), [repr(p.__context__) for p in parts])
    return 'no exception'


# ---- a group raised again is still matched -------------------------------

def _reused_group():
    g = ExceptionGroup('t', [ValueError('V'), TypeError('T')])
    seen = []
    for i in range(3):
        try:
            try:
                raise g
            except* ValueError as m:
                seen.append(('matched', m is g, repr(m)))
        except BaseException as e:
            seen.append(('rest', repr(e)))
    return seen


r['a_group_raised_three_times_is_matched_each_time'] = _reused_group()


def _reused_unmatched():
    g = ExceptionGroup('t', [ValueError('V')])
    out = []
    for i in range(3):
        try:
            try:
                raise g
            except* SyntaxError:
                pass
        except BaseException as e:
            out.append(e is g)
        else:
            out.append('lost')
    return out


r['an_unmatched_group_propagates_every_time'] = _reused_unmatched()


# ---- what a clause raises -----------------------------------------------

def _new_with_rest():
    try:
        raise ExceptionGroup('eg', [ValueError(1), OSError(2)])
    except* OSError:
        raise TypeError(3)


def _new_covers_all():
    try:
        raise ExceptionGroup('eg', [TypeError(1), ValueError(2)])
    except* (TypeError, ValueError):
        raise SyntaxError(3)


def _two_new():
    try:
        raise ExceptionGroup('eg', [TypeError(1), ValueError(2)])
    except* TypeError:
        raise SyntaxError(3)
    except* ValueError:
        raise SyntaxError(4)


def _new_and_bare_reraise():
    try:
        raise ExceptionGroup('eg', [TypeError(1), ValueError(2), KeyError(5)])
    except* TypeError:
        raise SyntaxError(3)
    except* ValueError:
        raise


def _named_reraise_is_new():
    try:
        raise ExceptionGroup('eg', [ValueError(1), TypeError(2)])
    except* ValueError as e:
        raise e


def _bare_reraise_is_not():
    try:
        raise ExceptionGroup('eg', [ValueError(1), TypeError(2)])
    except* ValueError:
        raise


def _naked_new():
    try:
        raise ValueError(1)
    except* ValueError:
        raise TypeError(2)


def _naked_reraise():
    try:
        raise ValueError(1)
    except* ValueError:
        raise


def _base_exception_part():
    try:
        raise ExceptionGroup('eg', [ValueError(1), TypeError(2)])
    except* ValueError:
        raise KeyboardInterrupt()
    except* TypeError:
        raise SyntaxError(9)


for _name, _thunk in [
        ('a_new_exception_comes_first_then_the_rest', _new_with_rest),
        ('a_lone_new_exception_is_raised_as_itself', _new_covers_all),
        ('every_clause_runs_and_both_are_grouped', _two_new),
        ('a_bare_raise_joins_the_rest', _new_and_bare_reraise),
        ('raise_e_counts_as_a_new_raise', _named_reraise_is_new),
        ('a_bare_raise_gives_back_the_original', _bare_reraise_is_not),
        ('a_naked_exception_new_raise', _naked_new),
        ('a_naked_exception_bare_raise', _naked_reraise),
        ('a_keyboardinterrupt_makes_it_a_base_group', _base_exception_part)]:
    r[_name] = _outcome(_thunk)


# ---- what an except* clause may name ------------------------------------

def _type_error(thunk):
    try:
        thunk()
    except TypeError as e:
        return (str(e), repr(e.__context__))
    except BaseException as e:
        return 'not a TypeError: ' + repr(e)
    return 'no TypeError'


def _eg_single():
    try:
        raise OSError('blah')
    except* ExceptionGroup:
        pass


def _eg_in_tuple():
    try:
        raise ExceptionGroup('eg', [ValueError(42)])
    except* (TypeError, ExceptionGroup):
        pass


def _not_a_class():
    try:
        raise ValueError(1)
    except* 42:
        pass


def _a_predicate():
    try:
        raise ExceptionGroup('eg', [ValueError(42)])
    except* (lambda e: True):
        pass


r['except_star_exceptiongroup'] = _type_error(_eg_single)
r['except_star_exceptiongroup_in_a_tuple'] = _type_error(_eg_in_tuple)
r['except_star_a_non_class'] = _type_error(_not_a_class)
r['except_star_a_predicate'] = _type_error(_a_predicate)


# ---- a split() override decides ------------------------------------------

class _NotATuple(ExceptionGroup):
    def split(self, *args):
        return 'NOT A 2-TUPLE!'


class _ShortTuple(ExceptionGroup):
    def split(self, *args):
        return ('NOT A 2-TUPLE!',)


class _LongTuple(ExceptionGroup):
    def split(self, *args):
        return super().split(*args) + ('anything', 123456, None)


def _raise_through(cls):
    def thunk():
        try:
            raise cls('eg', [OSError(123), ValueError(456)])
        except* ValueError:
            pass
    return thunk


def _long_tuple():
    try:
        raise _LongTuple('eg', [OSError(123), ValueError(456)])
    except* OSError as e:
        oeg = e
    except* ValueError as e:
        veg = e
    return (repr(oeg), repr(veg))


r['split_returning_a_str'] = _type_error(_raise_through(_NotATuple))
r['split_returning_a_1_tuple'] = _type_error(_raise_through(_ShortTuple))
r['split_returning_a_5_tuple'] = _long_tuple()


# ---- tracebacks -------------------------------------------------------------

_BASE = 0
_BASE = _frames.__code__.co_firstlineno


class _EG(ExceptionGroup):
    def derive(self, excs):
        return _EG(self.message, excs)


def _remainder_shares_the_traceback():
    out = []
    for cls in (ExceptionGroup, _EG):
        orig = cls('eg', [ValueError(1), TypeError(2)])
        try:
            try:
                raise orig
            except* ValueError as eg:
                veg = eg
        except BaseException as eg:
            teg = eg
        out.append((veg.__traceback__ is orig.__traceback__,
                    teg.__traceback__ is orig.__traceback__))
    return out


r['the_remainder_keeps_the_original_traceback'] = _remainder_shares_the_traceback()


def _leaf():
    raise ExceptionGroup('eg', [ValueError(1), TypeError(2)])


def _rest_leaves_the_function():
    try:
        _leaf()
    except* ValueError:
        pass


def _bare_reraise_leaves_the_function():
    try:
        _leaf()
    except* ValueError:
        raise


def _naked_rest_leaves_the_function():
    try:
        raise KeyError(3)
    except* ValueError:
        pass


def _merged_group_leaves_the_function():
    try:
        _leaf()
    except* ValueError:
        raise OSError(4)


def _caught_frames(f):
    try:
        f()
    except BaseException as e:
        return _frames(e)


r['frames_of_a_remainder'] = _caught_frames(_rest_leaves_the_function)
r['frames_of_a_bare_reraise'] = _caught_frames(_bare_reraise_leaves_the_function)
r['frames_of_a_naked_remainder'] = _caught_frames(_naked_rest_leaves_the_function)
r['frames_of_a_merged_group'] = _caught_frames(_merged_group_leaves_the_function)


EXPECTED = {
    'a_group_raised_three_times_is_matched_each_time': [('matched', False, "ExceptionGroup('t', [ValueError('V')])"),
                                                        ('rest', "ExceptionGroup('t', [TypeError('T')])"),
                                                        ('matched', False, "ExceptionGroup('t', [ValueError('V')])"),
                                                        ('rest', "ExceptionGroup('t', [TypeError('T')])"),
                                                        ('matched', False, "ExceptionGroup('t', [ValueError('V')])"),
                                                        ('rest', "ExceptionGroup('t', [TypeError('T')])")],
    'an_unmatched_group_propagates_every_time': [False, False, False],
    'a_new_exception_comes_first_then_the_rest': ("ExceptionGroup('', [TypeError(3), ExceptionGroup('eg', "
                                                  '[ValueError(1)])])',
                                                  ["ExceptionGroup('eg', [OSError(2)])", 'None']),
    'a_lone_new_exception_is_raised_as_itself': ('SyntaxError(3)',
                                                 "ExceptionGroup('eg', [TypeError(1), ValueError(2)])"),
    'every_clause_runs_and_both_are_grouped': ("ExceptionGroup('', [SyntaxError(3), SyntaxError(4)])",
                                               ["ExceptionGroup('eg', [TypeError(1)])",
                                                "ExceptionGroup('eg', [ValueError(2)])"]),
    'a_bare_raise_joins_the_rest': ("ExceptionGroup('', [SyntaxError(3), ExceptionGroup('eg', "
                                    '[ValueError(2), KeyError(5)])])',
                                    ["ExceptionGroup('eg', [TypeError(1)])", 'None']),
    'raise_e_counts_as_a_new_raise': ("ExceptionGroup('', [ExceptionGroup('eg', [ValueError(1)]), "
                                      "ExceptionGroup('eg', [TypeError(2)])])",
                                      ['None', 'None']),
    'a_bare_raise_gives_back_the_original': ("ExceptionGroup('eg', [ValueError(1), TypeError(2)])",
                                             ['None', 'None']),
    'a_naked_exception_new_raise': ('TypeError(2)', "ExceptionGroup('', (ValueError(1),))"),
    'a_naked_exception_bare_raise': ("ExceptionGroup('', (ValueError(1),))", ['None']),
    'a_keyboardinterrupt_makes_it_a_base_group': ("BaseExceptionGroup('', [KeyboardInterrupt(), SyntaxError(9)])",
                                                  ["ExceptionGroup('eg', [ValueError(1)])",
                                                   "ExceptionGroup('eg', [TypeError(2)])"]),
    'except_star_exceptiongroup': ('catching ExceptionGroup with except* is not allowed. Use except '
                                   'instead.',
                                   "OSError('blah')"),
    'except_star_exceptiongroup_in_a_tuple': ('catching ExceptionGroup with except* is not allowed. Use except '
                                              'instead.',
                                              "ExceptionGroup('eg', [ValueError(42)])"),
    'except_star_a_non_class': ('catching classes that do not inherit from BaseException is not '
                                'allowed',
                                'ValueError(1)'),
    'except_star_a_predicate': ('catching classes that do not inherit from BaseException is not '
                                'allowed',
                                "ExceptionGroup('eg', [ValueError(42)])"),
    'split_returning_a_str': ('_NotATuple.split must return a tuple, not str',
                              "_NotATuple('eg', [OSError(123), ValueError(456)])"),
    'split_returning_a_1_tuple': ('_ShortTuple.split must return a 2-tuple, got tuple of size 1',
                                  "_ShortTuple('eg', [OSError(123), ValueError(456)])"),
    'split_returning_a_5_tuple': ("ExceptionGroup('eg', [OSError(123)])",
                                  "ExceptionGroup('eg', [ValueError(456)])"),
    'the_remainder_keeps_the_original_traceback': [(True, True), (True, True)],
    'frames_of_a_remainder': [('_caught_frames', 293),
                              ('_rest_leaves_the_function', 265),
                              ('_leaf', 260)],
    'frames_of_a_bare_reraise': [('_caught_frames', 293),
                                 ('_bare_reraise_leaves_the_function', 272),
                                 ('_leaf', 260)],
    'frames_of_a_naked_remainder': [('_caught_frames', 293), ('_naked_rest_leaves_the_function', 279)],
}

KNOWN_DIVERGENCES = {
    # CPython: [('_caught_frames', 293)] -- the group the except* builds is
    # re-raised by RERAISE, so the function that built it adds no entry.
    # Grail's traceback starts at the raise that signals it.
    'frames_of_a_merged_group': [('_caught_frames', 293), ('_merged_group_leaves_the_function', 287)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-46s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
