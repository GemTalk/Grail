"""Deployed by tests/module_globals/session_globals.py's first session; the
second checks that the signature and annotations survive the bind."""


def f(a, /, b: int = 3, *, c: str = 'x', **kw) -> list:
    return [a, b, c]
