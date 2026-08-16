# inspect.Signature / inspect.Parameter as VALUES -- built by hand, compared,
# and rendered.
#
# Three faults, all of them in the way the objects were constructed rather than
# in what introspection produced:
#
# 1. ``Signature([Parameter(...), ...])`` -- the spelling every caller writing an
#    EXPECTED signature uses -- stashed the list as the pre-rendered TEXT,
#    because Grail's first positional argument was ``text`` where CPython's is
#    ``parameters``.  __str__ then handed the list back unrendered and __repr__
#    concatenated a string with it:
#
#        TypeError: unsupported operand type(s) for +:
#                   'Unicode7' and 'OrderedCollection'
#
#    so a hand-built signature could not even be printed.
#
# 2. ``Parameter('module', KEYWORD_ONLY, default=None)`` meant "no default".
#    None was the marker for absent, so a parameter whose default genuinely IS
#    None rendered as a bare ``module`` -- indistinguishable from one with no
#    default.  CPython uses a distinct ``empty`` sentinel, and now so does this.
#
# 3. Neither class defined __eq__, so two of them compared by IDENTITY and an
#    expected signature could never equal an introspected one.
#
# test_enum test_inspect_signatures, which builds its expectation exactly this
# way.  That test still fails -- signature(Enum) answers () rather than the
# functional API's parameters, and enum.FlagBoundary does not exist -- but it
# fails now on the assertion rather than dying in the comparison.

from inspect import signature, Signature, Parameter


def _f(a, b=1, *args, c, d=None, **kw):
    pass


def a_hand_built_signature_renders():
    """Fault 1: this raised TypeError from repr()."""
    sig = Signature([
        Parameter('new_class_name', Parameter.POSITIONAL_ONLY),
        Parameter('names', Parameter.POSITIONAL_OR_KEYWORD),
        Parameter('module', Parameter.KEYWORD_ONLY, default=None),
    ])
    return repr(sig) == '<Signature (new_class_name, /, names, *, module=None)>'


def a_default_of_none_is_not_the_same_as_no_default():
    """Fault 2.  Both spellings are legal and they mean different things."""
    with_default = Parameter('x', Parameter.KEYWORD_ONLY, default=None)
    without = Parameter('y', Parameter.KEYWORD_ONLY)
    return (repr(with_default) == '<Parameter "x=None">'
            and repr(without) == '<Parameter "y">'
            and with_default.default is None
            and without.default is Parameter.empty)


def signatures_compare_by_value():
    """Fault 3: identity comparison meant an expected signature never matched."""
    built = Signature([
        Parameter('a', Parameter.POSITIONAL_OR_KEYWORD),
        Parameter('b', Parameter.POSITIONAL_OR_KEYWORD, default=1),
    ])
    same = Signature([
        Parameter('a', Parameter.POSITIONAL_OR_KEYWORD),
        Parameter('b', Parameter.POSITIONAL_OR_KEYWORD, default=1),
    ])
    other = Signature([Parameter('a', Parameter.POSITIONAL_OR_KEYWORD)])
    return built == same and built != other


def parameters_compare_by_value():
    p = Parameter('a', Parameter.POSITIONAL_OR_KEYWORD, default=1)
    return (p == Parameter('a', Parameter.POSITIONAL_OR_KEYWORD, default=1)
            and p != Parameter('a', Parameter.POSITIONAL_OR_KEYWORD, default=2)
            and p != Parameter('b', Parameter.POSITIONAL_OR_KEYWORD, default=1))


def an_introspected_signature_still_renders():
    """Guard rail: the introspection path is untouched by all of this."""
    return repr(signature(_f)) == '<Signature (a, b=1, *args, c, d=None, **kw)>'


def an_introspected_signature_equals_the_same_one_built_by_hand():
    """The whole point -- what test_inspect_signatures does."""
    return signature(_f) == Signature([
        Parameter('a', Parameter.POSITIONAL_OR_KEYWORD),
        Parameter('b', Parameter.POSITIONAL_OR_KEYWORD, default=1),
        Parameter('args', Parameter.VAR_POSITIONAL),
        Parameter('c', Parameter.KEYWORD_ONLY),
        Parameter('d', Parameter.KEYWORD_ONLY, default=None),
        Parameter('kw', Parameter.VAR_KEYWORD),
    ])


def the_empty_marker_is_shared():
    return Parameter.empty is Signature.empty


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_hand_built_signature_renders,
        a_default_of_none_is_not_the_same_as_no_default,
        signatures_compare_by_value,
        parameters_compare_by_value,
        an_introspected_signature_still_renders,
        an_introspected_signature_equals_the_same_one_built_by_hand,
        the_empty_marker_is_shared,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
