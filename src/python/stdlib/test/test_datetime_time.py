"""Runs the time-tests split (see test/datetimetester_time.py).

Kept separate from test_datetime because the combined tester exceeds
Grail's whole-module compile budget; this module carries the TestTime
class."""
import unittest

from test.datetimetester_time import (
    TestTime,
)


if __name__ == "__main__":
    unittest.main()
