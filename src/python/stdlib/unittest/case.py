"""GRAIL: the seam test.test_warnings uses to redirect unittest's warnings.

CPython defines TestCase in unittest/case.py, and that module's global
``warnings`` is what test.test_warnings reassigns to point unittest at the
implementation under test:

    self.old_unittest_module = unittest.case.warnings
    unittest.case.warnings = self.module

Grail defines TestCase in unittest/__init__.py, so there was no unittest.case
at all and that line raised AttributeError -- in setUp, which killed 179 of
test_warnings' 187 tests before any of them ran.

This supplies the seam rather than moving TestCase across, so that reading and
reassigning ``unittest.case.warnings`` both work.

WHAT IT DOES NOT DO: a reassignment does not redirect Grail's assertion
contexts.  _AssertWarnsContext drives Grail's own recording protocol
(``warnings._grail_start_recording``), and that call has to be made on an
import-bound NAME -- reaching a module method through a stored attribute, or
through a local bound from one, trips Grail's unary-getter protocol, which
turns the send into an attribute read answering None and then calls it.  So the
contexts import ``warnings`` directly and always use Grail's.

That is a real limitation and not a silent one: it means the PyWarnTests half
of test_warnings exercises Grail's warnings rather than the vendored
_py_warnings.  Those tests fail on ``_grail_start_recording`` either way -- the
recording protocol is Grail-specific and _py_warnings has no counterpart -- so
honouring the swap would change which error they report, not whether they pass.
"""

import warnings

__all__ = ['warnings']
