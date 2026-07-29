"""Runs the tz-aware datetime split (see test/datetimetester_tz.py).

Kept separate from test_datetime because the combined tester exceeds
Grail's whole-module compile budget; this module carries only
TestDateTimeTZ (which subclasses TestDateTime, so date + datetime tests
run against tz-aware datetime here too)."""
import unittest

from test.datetimetester_tz import (
    TestDateTimeTZ,
)


if __name__ == "__main__":
    unittest.main()
