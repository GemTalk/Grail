"""Helpers for LoggingLastResortTestCase (#2159): leave a handler on the root
logger, as an earlier test in the session may, and list the checks of
tests/python/logging_last_resort.py that did not pass."""

import logging


def add_root_handler():
    handler = logging.NullHandler()
    logging.root.addHandler(handler)
    return handler


def remove_root_handler(handler):
    logging.root.removeHandler(handler)


def failing(results):
    return sorted(name for name, ok in results.items() if ok is not True)
