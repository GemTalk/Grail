# str(bytes, encoding[, errors]) -- the only multi-argument spelling of str(),
# and what it does when the arguments are wrong.
#
# CPython checks both extra arguments before decoding anything:
#
#     str(b'2', sys.getdefaultencoding)
#         TypeError: str() argument 'encoding' must be str, not builtin_function_or_method
#
# Grail handed whatever it was given straight to ``decode'', which tried to
# ITERATE it -- so this surfaced as a Smalltalk MessageNotUnderstood ("a
# BoundMethod does not understand #do:") rather than a TypeError.  Inside a class
# body that meant an enum definition died with an internal error instead of the
# constructor's complaint.
#
# The same spelling is how a str-mixed enum writes a member whose value needs
# decoding, and that path could not call str() with two arguments at all.
#
# test_enum TestSpecial.test_custom_strenum.

import sys
from enum import Enum

r = {}

# --- the constructor itself ------------------------------------------------------

r['decode_2'] = str(b'3', 'ascii')
r['decode_3'] = str(b'4', 'latin1', 'strict')


def complaint(fn):
    try:
        fn()
    except TypeError as e:
        return str(e)
    return 'NOT RAISED'


# The trailing type name is Grail's Python-visible name for the object, which is
# not CPython's for a builtin function -- so the shared part is what is pinned.
r['bad_encoding'] = complaint(lambda: str(b'2', sys.getdefaultencoding)).split(', not ')[0]
r['bad_errors'] = complaint(lambda: str(b'2', 'ascii', 9)).split(', not ')[0]

# Encoding is checked BEFORE errors, so a call with both wrong names the encoding.
r['both_bad'] = complaint(lambda: str(b'2', 9, 9)).split(', not ')[0]

# A str first argument is still refused, as before -- str(str, encoding) is not
# a decode.
r['decoding_str'] = complaint(lambda: str('already text', 'ascii'))

# --- the same spelling as an enum member value -----------------------------------


class GoodStrEnum(str, Enum):
    one = '1'
    three = b'3', 'ascii'
    four = b'4', 'latin1', 'strict'


r['member_values'] = '%s,%s,%s' % (GoodStrEnum.one.value, GoodStrEnum.three.value,
                                   GoodStrEnum.four.value)
r['member_repr'] = repr(GoodStrEnum.three)


def class_complaint(fn):
    try:
        fn()
    except TypeError as e:
        return str(e)
    return 'NOT RAISED'


def _bad_encoding_member():
    class Bad(str, Enum):
        one = '1'
        two = b'2', sys.getdefaultencoding


def _bad_errors_member():
    class Bad(str, Enum):
        one = '1'
        two = b'2', 'ascii', 9


r['member_bad_encoding'] = class_complaint(_bad_encoding_member).split(', not ')[0]
r['member_bad_errors'] = class_complaint(_bad_errors_member).split(', not ')[0]

# --- a multi-element value that is NOT a decode ----------------------------------
# A tuple member value usually means the argument list to the class's own
# __new__, and handing THAT to str() is how this went wrong the first time:
# ``key_type = 'An$(Bn)', 0'' answered "decoding str is not supported" and
# displaced the complaint CPython actually makes.  Keying on a BYTES first
# element is what separates the two.


def _no_value_set():
    class Combined(str, Enum):
        def __new__(cls, value, sequence):
            enum = str.__new__(cls, value)
            enum.sequence = sequence
            return enum
        key_type = 'An$(Bn)', 0


r['own_new_complaint'] = class_complaint(_no_value_set).split(',')[0]

# And when that __new__ does its job, the tuple is its arguments, untouched.


class Fields(str, Enum):
    def __new__(cls, value, sequence):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.sequence = sequence
        return obj

    key_type = 'An$(Bn)', 0
    company_id = 'An$(Cn)', 1


r['own_new_ok'] = '%s/%d/%s/%d' % (Fields.key_type.value, Fields.key_type.sequence,
                                   Fields.company_id.value, Fields.company_id.sequence)
