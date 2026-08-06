# Fixture for PrintableReprAndPrintfTestCase>>testStrCharConversionRangeIsCatchable.
#
# Deliberately its OWN file.  An out-of-range %c code point used to reach
# GemStone's Character class>>codePoint:, whose OutOfRange is a Smalltalk error
# that Python "except" cannot catch -- so it aborted the enclosing module LOAD
# rather than raising.  Kept alongside the other printf expectations, that abort
# made every one of them unreachable, and a regression in any of them would have
# looked identical to this one.

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


_run("str_c_negative", lambda: '%c' % -1)
_run("str_c_too_big", lambda: '%c' % 0x110000)
_run("str_c_huge", lambda: '%c' % 2**128)
# the boundary values that must still work
_run("str_c_zero", lambda: '%c' % 0 == '\x00')
_run("str_c_max", lambda: '%c' % 0x10FFFF == chr(0x10FFFF))

RESULTS = out
