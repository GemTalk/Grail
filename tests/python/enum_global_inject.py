# Fixture for EnumGlobalInjectTestCase.  Validates that
# ``@enum.global_enum`` (combined with the bare class form of
# ``@enum._simple_enum``) injects every member of the decorated
# enum class into the defining module's globals.
#
# CPython's @enum.global_enum is used by re/__init__.py to put
# RegexFlag.DEBUG, RegexFlag.ASCII, etc. into the re module's
# namespace so user code can write ``if flags & DEBUG:``.

import enum

@enum.global_enum
@enum._simple_enum(enum.IntFlag, boundary=enum.KEEP)
class MyFlag:
    ALPHA = 1
    BETA = 2
    GAMMA = 4

# Access via the class (Phase 2a coverage):
cls_alpha = MyFlag.ALPHA
cls_beta = MyFlag.BETA

# Access via module-level injection (Phase 2c coverage — what
# @global_enum is supposed to do):
direct_alpha = ALPHA
direct_beta = BETA
direct_gamma = GAMMA

# Bitwise ops on enum members — IntFlag in CPython, plain ints in
# Grail.  Either way ``a | b`` and ``a & b`` work.
combined = ALPHA | BETA
has_alpha = (combined & ALPHA) != 0
