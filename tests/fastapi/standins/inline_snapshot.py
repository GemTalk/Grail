"""Stand-in for inline_snapshot (docs/Support_FastAPI.md, Phase 5).

FastAPI's tests write expectations as ``snapshot(<value>)`` and compare with
``==``.  With inline_snapshot's pytest plugin inactive -- which is how the
runner here runs them, under Grail and under CPython alike -- the real
``snapshot(value)`` answers ``value`` itself, and ``Is(value)`` likewise, so
this is the whole of what a comparison needs.  The real package pulls in
asttokens, executing, rich and pytest, none of which the tests exercise.
"""

__all__ = ['snapshot', 'Is', 'external', 'outsource']


def snapshot(value=None):
    return value


def Is(value):
    return value


def external(name=None):
    raise NotImplementedError('external snapshots are not supported here')


def outsource(data, **kwargs):
    raise NotImplementedError('outsourced snapshots are not supported here')
