"""Test the datetime module.

CPython's test_datetime is a thin loader that, via a ``load_tests`` hook,
runs test.datetimetester twice (pure-Python ``_pydatetime`` and the C
``_datetime``).  Grail has a single native datetime and its unittest loader
does not honor ``load_tests``, so this module imports the tester's TestCase
classes for the default loader to discover.

test/datetimetester.py is vendored from CPython 3.14 with only the
adaptations GemStone forces (each marked ``# GRAIL:``).  CapiTest and
ExtensionModuleTests are intentionally NOT imported here: they exercise the
C ``_datetime`` / ``_testcapi`` extension, which Grail (native datetime)
does not provide."""
import unittest

from test.datetimetester import (
    TestModule,
    TestTZInfo,
    TestTimeZone,
    TestTimeDelta,
    TestDateOnly,
    TestDate,
    TestDateTime,
    TestSubclassDateTime,
    TestTime,
    TestTimeTZ,
    TestDateTimeTZ,
    TestTimezoneConversions,
    Oddballs,
    TestLocalTimeDisambiguation,
    ZoneInfoTest,
    IranTest,
)


if __name__ == "__main__":
    unittest.main()
