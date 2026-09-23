# Regression fixture: a private (name-mangled) method recursion must raise a
# CATCHABLE RecursionError, at a normal depth.
#
# Split out of private_name_mangling.py.  Mangled METHOD calls must still take
# the direct-send fast path; when they did not, a private recursion bottomed
# out at ~1/3 the depth of a public one and died uncatchably instead of raising
# RecursionError (which crashed test_richcmp's MiscTest.test_recursion).
#
# Its own file because, on an interpreted gem, a GemStone VM defect (Kermit
# 52108: resignalAs: re-trips the stack limit) can let the RecursionError
# escape the except clause below.  At module level that aborts the load, which
# would lose every other mangling check if they shared a module.
# PrivateNameManglingTestCase>>testPrivateRecursionIsCatchable skips this
# fixture on interpreted gems for that reason.

RESULTS = {}


class Deep:
    def __go(self, n):
        return self.__go(n + 1)
    def run(self):
        try:
            self.__go(1)
            return 'no-error'
        except RecursionError:
            return 'recursion-error'

RESULTS['private_recursion_is_catchable'] = (Deep().run() == 'recursion-error')
