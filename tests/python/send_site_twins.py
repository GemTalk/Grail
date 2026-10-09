"""Fixture for PythonCallSitePositionsTestCase: when two sends are one Python call.

Text codegen wraps a call to a BUILTIN in a global-shadow probe and prints the
arguments once per branch, so ``iter(self._dict())`` sends ``_dict`` twice
for one Python call.  ``self._dict().update(self._dict())`` is two genuine
calls in one statement.  BaseException pythonSendSitesIn:selector: tells them
apart by the PEP 657 span of each site's position, not by its node range.

Driven from Smalltalk only; there is nothing here to compare with CPython.
"""


class SessionLike:
    def _dict(self):
        return {}

    def twins(self):
        return iter(self._dict())

    def two_calls(self):
        return self._dict().update(self._dict())
