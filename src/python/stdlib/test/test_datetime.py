"""Test the datetime module.

CPython's test_datetime is a thin loader that runs test.datetimetester
twice (the pure-Python and C implementations) through a ``load_tests``
hook.  Grail has a single native datetime, and its unittest loader does
not honor ``load_tests``, so this module simply imports the (Grail-
trimmed) tester's TestCase classes for the default loader to discover.

See test/datetimetester.py for the trimming and Grail adaptations."""
import unittest

from test.datetimetester import (
    TestModule,
    TestTZInfo,
    TestTimeZone,
    TestTimeDelta,
)


if __name__ == "__main__":
    unittest.main()
