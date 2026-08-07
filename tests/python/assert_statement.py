# Regression fixture: the `assert` statement.
#
# Two bugs, both in AssertAst's codegen, which emitted a bare
# `<test> ifFalse: [...]`:
#
#   1. GemStone INLINES ifFalse: when its argument is a literal block, and
#      then statically requires a Boolean receiver.  A constant condition
#      is provably not one, so `assert 0` / `assert 1` -- CPython's idiom
#      for an unreachable branch -- did not merely misbehave at runtime:
#      the whole enclosing METHOD failed to compile, taking every test in
#      it down with "Grail could not compile this method".
#
#   2. Python's assert tests TRUTHINESS, not identity with True, so a
#      non-Boolean condition was a runtime doesNotUnderstand rather than
#      a pass/fail.
#
# Plus: the failure message was raised with Smalltalk's signal: at env 0,
# which sets the Smalltalk messageText but not the Python exception's
# args -- so str(e) came back empty.

RESULTS = {}


def _check(key, fn, want):
    try:
        got = fn()
    except AssertionError as e:
        got = 'AssertionError:' + str(e)
    except Exception as e:
        got = type(e).__name__ + ':' + str(e)
    RESULTS[key] = (got == want)


# --- 1. Constant conditions: these are what failed to COMPILE. ---
def _const_true():
    assert 1
    return 'passed'


def _const_false():
    assert 0
    return 'passed'


def _const_false_msg():
    assert 0, "impossible"
    return 'passed'


# The exact shape in datetimetester.test_utc_offset_out_of_bounds: an
# unreachable else-branch guarding a type dispatch.
def _unreachable_else():
    cls = int
    if cls is int:
        r = 'int'
    else:
        assert 0, "impossible"
    return r


_check('const_true_passes', _const_true, 'passed')
_check('const_false_raises', _const_false, 'AssertionError:')
_check('const_false_msg_carries_text', _const_false_msg, 'AssertionError:impossible')
_check('unreachable_else_compiles', _unreachable_else, 'int')


# --- 2. Truthiness, not identity with True. ---
def _mk(v):
    def f():
        assert v
        return 'passed'
    return f


for _key, _v, _want in [
    ('falsy_empty_list', [], 'AssertionError:'),
    ('truthy_list', [1], 'passed'),
    ('falsy_empty_str', '', 'AssertionError:'),
    ('truthy_str', 'x', 'passed'),
    ('falsy_zero', 0, 'AssertionError:'),
    ('falsy_zero_float', 0.0, 'AssertionError:'),
    ('truthy_float', 0.5, 'passed'),
    ('falsy_none', None, 'AssertionError:'),
    ('falsy_empty_dict', {}, 'AssertionError:'),
    ('truthy_dict', {1: 2}, 'passed'),
    ('falsy_empty_tuple', (), 'AssertionError:'),
    ('truthy_tuple_of_zero', (0,), 'passed'),
    ('falsy_False', False, 'AssertionError:'),
    ('truthy_True', True, 'passed'),
]:
    _check(_key, _mk(_v), _want)


class _Falsy:
    def __bool__(self):
        return False


class _Empty:
    def __len__(self):
        return 0


class _Full:
    def __len__(self):
        return 3


_check('falsy_via_dunder_bool', _mk(_Falsy()), 'AssertionError:')
_check('falsy_via_dunder_len', _mk(_Empty()), 'AssertionError:')
_check('truthy_via_dunder_len', _mk(_Full()), 'passed')


# --- 3. The message expression must not be evaluated when the assert passes. ---
_SIDE = []


def _msg_effect():
    _SIDE.append('evaluated')
    return 'boom'


def _passing_with_msg():
    assert 1, _msg_effect()
    return 'passed'


_check('passing_assert_with_msg', _passing_with_msg, 'passed')
RESULTS['msg_not_evaluated_when_passing'] = (len(_SIDE) == 0)
