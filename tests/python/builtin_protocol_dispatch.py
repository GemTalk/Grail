"""Builtins that computed a result instead of dispatching to the protocol.

Four entry points stood for a Python protocol without actually asking it. Each
is invisible for the built-in types, because for those the shortcut and the
protocol agree -- and each surfaces the moment a class implements the protocol
and nothing else. All four were found by `test.test_decimal`, which is exactly
such a class; they are unrelated to decimal otherwise.

  * `%` with a MAPPING on the right. CPython keeps the mapping for `%(name)s`
    lookups AND, because the operand is not a tuple, lets an UNKEYED specifier
    consume the mapping itself, once. Grail treated "operand is a mapping" as
    "keys are mandatory", so `'%s' % {}` raised `format requires a mapping` --
    a message that belongs on the opposite case, a KEYED specifier whose
    operand is not a mapping.

  * `divmod()`. A binary operator dispatched on `__divmod__`/`__rdivmod__`,
    exactly as `+` is on `__add__`/`__radd__` -- NOT sugar for
    `(a // b, a % b)`. Grail computed the pair, so a class defining
    `__divmod__` and no `__floordiv__` was never asked, and the failure named
    an operator the call never used.

  * three-argument `pow()`. Dispatched on `__pow__`/`__rpow__` with the
    modulus passed through. Grail implemented it for integers only, so
    `pow(Decimal(10), 2, 7)` was a TypeError. The MODULUS is never dispatched
    on, which is why `pow(10, 2, Decimal(7))` stays a TypeError.

  * `threading.Thread(context=...)`, 3.14's way of giving a thread a KNOWN
    contextvars context rather than whatever `thread_inherit_context` would
    hand it. Grail's Thread did not accept the keyword at all.

The classes below are defined INSIDE a function because that is how
`test_decimal.ImplicitConstructionTest.test_rop` defines its own, and a
method-local class is a different compilation path in Grail from a
module-level one.

Every expectation here was measured against CPython 3.14.
"""

import contextvars
import threading

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


def raises(name, fn, want_type, want_fragment=None):
    try:
        got = fn()
    except want_type as exc:
        if want_fragment is not None and want_fragment not in str(exc):
            RESULTS[name] = 'message: ' + repr(str(exc))[:120]
        else:
            RESULTS[name] = True
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, str(exc)[:80])
    else:
        RESULTS[name] = 'no raise, got: ' + repr(got)[:120]


# --------------------------------------------- % with a mapping on the right

check('percent_s_renders_an_empty_mapping', '%s' % {}, '{}')

check('percent_s_renders_a_populated_mapping', '%s' % {'a': 1}, "{'a': 1}")

check('percent_s_still_renders_a_list', '%s' % [1, 2], '[1, 2]')

check('a_keyed_specifier_still_reads_the_mapping', '%(a)s' % {'a': 1}, '1')

check('a_mapping_key_may_be_read_twice', '%(a)s %(a)s' % {'a': 7}, '7 7')

check('unreferenced_keys_are_fine', '%(a)s' % {'a': 1, 'b': 2}, '1')

# A format with no specifier at all consumes nothing, and with a mapping that
# is not an error -- the "not all arguments converted" check is for sequences.
check('an_unread_mapping_is_not_an_error', 'no fmt' % {}, 'no fmt')

raises('a_sequence_operand_must_be_consumed',
       lambda: 'no fmt' % 5, TypeError, 'not all arguments converted')

# The mapping is a SINGLE positional, so a second unkeyed specifier is short.
raises('a_mapping_is_one_positional_only',
       lambda: '%s %s' % {}, TypeError, 'not enough arguments')

# ...and this is where 'format requires a mapping' actually belongs.
raises('a_keyed_specifier_needs_a_mapping',
       lambda: '%(a)s' % 5, TypeError, 'format requires a mapping')


# ------------------------------------------------ divmod() and 3-arg pow()

def operator_protocol_checks():
    class Divmod:
        def __divmod__(self, other):
            return 'divmod ' + str(other)

        def __rdivmod__(self, other):
            return str(other) + ' rdivmod'

    class Pow:
        def __pow__(self, other, modulo=None):
            return ('pow', other, modulo)

        def __rpow__(self, other, modulo=None):
            return ('rpow', other, modulo)

    check('divmod_asks_the_left_operand', divmod(Divmod(), 10), 'divmod 10')
    check('divmod_asks_the_right_operand', divmod(10, Divmod()), '10 rdivmod')
    check('three_arg_pow_asks_the_base', pow(Pow(), 2, 7), ('pow', 2, 7))
    check('three_arg_pow_asks_the_exponent', pow(10, Pow(), 7), ('rpow', 10, 7))
    check('two_arg_pow_passes_no_modulus', pow(Pow(), 2), ('pow', 2, None))


operator_protocol_checks()

# The built-in types keep working, and keep their types: CPython's float
# divmod answers two floats.
check('divmod_of_two_ints', divmod(7, 3), (2, 1))
check('divmod_rounds_toward_negative_infinity', divmod(-7, 3), (-3, 2))
check('divmod_of_a_float_answers_floats', divmod(7.5, 2), (3.0, 1.5))
check('three_arg_pow_of_ints', pow(10, 2, 7), 2)
check('three_arg_pow_accepts_a_negative_exponent', pow(2, -1, 5), 3)

raises('divmod_by_zero_is_catchable',
       lambda: divmod(7, 0), ZeroDivisionError, 'division by zero')

# A type with none of the protocol raises, naming divmod() as CPython does
# rather than the // it no longer uses.
raises('divmod_names_itself_when_unsupported',
       lambda: divmod('a', 2), TypeError, 'divmod')

# The third argument is NOT dispatched on -- pinned by test_decimal itself
# ("there is no special method to dispatch on the third arg").
def modulus_is_not_dispatched_on():
    class Mod:
        def __rpow__(self, other, modulo=None):
            return 'should not be reached'

    raises('the_modulus_is_never_dispatched_on',
           lambda: pow(10, 2, Mod()), TypeError)


modulus_is_not_dispatched_on()


# ------------------------------------------- threading.Thread(context=...)

def thread_context_checks():
    var = contextvars.ContextVar('builtin_protocol_dispatch_var',
                                 default='outer')
    seen = []

    def body():
        seen.append(var.get())

    # An EMPTY context, which is the point of passing one explicitly: the
    # thread must not see the caller's binding.
    var.set('caller')
    thread = threading.Thread(target=body, context=contextvars.Context())
    thread.start()
    thread.join()
    check('a_thread_runs_in_the_context_it_was_given', seen, ['outer'])

    # No context argument keeps the previous behaviour.
    seen2 = []

    def body2():
        seen2.append('ran')

    plain = threading.Thread(target=body2)
    plain.start()
    plain.join()
    check('a_thread_without_a_context_still_runs', seen2, ['ran'])


thread_context_checks()


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
