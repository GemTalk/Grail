# Grail's `errno`: the RUNNING PLATFORM's error numbers, as CPython's is.
#
# It used to be the macOS table on every platform.  That was self-consistent
# for the names Python code compares against, but not with the numbers the
# kernel actually reports: os raises the raw errno, and on Linux 36 is
# ENAMETOOLONG where the macOS table said EINPROGRESS.  So the module said one
# thing and every OSError another, and the socket layer had to translate
# Linux numbers to macOS ones to keep its own side of the story straight.
#
# The table lives in OSError (``___errnoPairsFor___:``), copied from CPython
# 3.14.8's errno on each platform, because Grail's Smalltalk side needs the
# same numbers: OSError picks its subclass by them (EAGAIN raises
# BlockingIOError), and the socket layer raises them.  One table, read from
# both sides, cannot disagree with itself.
import sys

_pairs = OSError.___errnoPairsFor___(sys.platform)
for _i in range(0, len(_pairs), 2):
    globals()[_pairs[_i]] = _pairs[_i + 1]


# CPython publishes the reverse map too, and code that formats an OSError
# reaches for it (``errno.errorcode[e.errno]``).  The table lists the name
# CPython's errorcode answers FIRST for a number with several (EAGAIN before
# EWOULDBLOCK), so the first one seen wins.
errorcode = {}
for _i in range(0, len(_pairs), 2):
    errorcode.setdefault(_pairs[_i + 1], _pairs[_i])
del _i, _pairs, sys
