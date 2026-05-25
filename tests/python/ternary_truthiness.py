# Fixture for TernaryTruthinessTestCase.
#
# Python's conditional expression ``a if cond else b'' evaluates
# ``cond'' for truthiness using Python's broader rule:
#   - None is falsy
#   - 0, 0.0 are falsy; other numbers are truthy
#   - '' is falsy; non-empty strings are truthy
#   - (), [], {} are falsy; non-empty containers are truthy
#   - User-defined classes follow __bool__ / __len__ protocol
#
# Pre-fix, Grail's IfExpAst emitted ``test ifTrue: [...] ifFalse:
# [...]'' which only accepts Boolean on the Smalltalk side — a
# non-Boolean test value (tuple, list, str, int, None) tripped
# ``ImproperOperation: Expected <value> to be a Boolean.''  Surfaced
# while writing VarargsNamingTestCase (a fixture used
# ``positional[0] if positional else 'EMPTY''' where ``positional''
# was a tuple).
#
# Fix wraps ``test'' with ``___isTruthy___'' to honor Python's
# rule.  Statement-form ``if'' (IfAst) and ``while'' (WhileAst)
# already do the wrap.


def ternary_tuple_truthy():
    """Non-empty tuple is truthy."""
    t = (1, 2, 3)
    return 'non-empty' if t else 'empty'


def ternary_tuple_falsy():
    """Empty tuple is falsy."""
    t = ()
    return 'non-empty' if t else 'empty'


def ternary_list_truthy():
    """Non-empty list is truthy."""
    return 'non-empty' if [1] else 'empty'


def ternary_list_falsy():
    """Empty list is falsy."""
    return 'non-empty' if [] else 'empty'


def ternary_string_truthy():
    """Non-empty string is truthy."""
    return 'non-empty' if 'hello' else 'empty'


def ternary_string_falsy():
    """Empty string is falsy."""
    return 'non-empty' if '' else 'empty'


def ternary_int_truthy():
    """Non-zero int is truthy."""
    return 'non-zero' if 42 else 'zero'


def ternary_int_falsy():
    """Zero is falsy."""
    return 'non-zero' if 0 else 'zero'


def ternary_none_is_falsy():
    """None is falsy."""
    return 'value' if None else 'none'


def ternary_dict_truthy():
    """Non-empty dict is truthy."""
    return 'non-empty' if {'a': 1} else 'empty'


def ternary_dict_falsy():
    """Empty dict is falsy."""
    return 'non-empty' if {} else 'empty'
