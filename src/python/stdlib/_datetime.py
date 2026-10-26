"""Grail's ``_datetime``: the name of CPython's C datetime accelerator.

CPython's datetime.py re-exports ``_datetime`` when the C module is built and
falls back to ``_pydatetime`` otherwise.  Grail's datetime is native, so this
module answers the same classes under the accelerator's name -- test_types
imports it at module level.  ``datetime_CAPI``, the C API capsule, has no
Grail counterpart and is left out, so code that probes for it still sees it
missing.
"""

from datetime import (MAXYEAR, MINYEAR, UTC, date, datetime, time, timedelta,
                      timezone, tzinfo)
