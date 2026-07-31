# Fixture for PythonParserTestCase>>test_compile_illegal_assignment_messages.
#
# compile() must raise SyntaxError for an illegal assignment target AND the
# raised exception's Python str(e) must carry the message (assertRaisesRegex in
# test_dictcomps.test_illegal_assignment checks it).  The env-0 parser can set
# only GemStone's messageText, so builtins._compile re-raises through the env-1
# ___signal___: that populates the args tuple BaseException.__str__ reads.


def _regular_comprehension_message():
    # ``{...} = 5'' -> "cannot assign to dict comprehension"
    try:
        compile("{x: y for y, x in ((1, 2), (3, 4))} = 5", "<test>", "exec")
    except SyntaxError as e:
        return "cannot assign" in str(e)
    return False


def _augmented_comprehension_message():
    # ``{...} += 5'' -> "... illegal expression for augmented assignment"
    try:
        compile("{x: y for y, x in ((1, 2), (3, 4))} += 5", "<test>", "exec")
    except SyntaxError as e:
        return "illegal expression" in str(e)
    return False


def _valid_assignment_still_compiles():
    # A legitimate program still round-trips through compile() unchanged.
    return compile("a = 1\nb, c = 2, 3\nd += 4", "<test>", "exec") is not None


RESULTS = {
    'regular_comprehension_message': _regular_comprehension_message(),
    'augmented_comprehension_message': _augmented_comprehension_message(),
    'valid_assignment_still_compiles': _valid_assignment_still_compiles(),
}
