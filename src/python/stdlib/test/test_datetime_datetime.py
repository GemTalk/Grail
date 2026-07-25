"""Runs the datetime-tests split (see test/datetimetester_datetime.py).

Kept separate from test_datetime because the combined tester exceeds
Grail's whole-module compile budget; this module carries only the large
TestDateTime class (which subclasses TestDate, so the date tests run
against datetime here too)."""
import unittest

from test.datetimetester_datetime import (
    TestDateTime,
)


if __name__ == "__main__":
    unittest.main()
