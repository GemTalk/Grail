# GRAIL asyncio.coroutines stub.
#
# asgiref (pre-3.12 fallback path) tags objects with
# `func._is_coroutine = asyncio.coroutines._is_coroutine` and later
# compares identity.  Provide the marker and the predicate.

import inspect as _inspect

_is_coroutine = object()

iscoroutinefunction = _inspect.iscoroutinefunction
iscoroutine = _inspect.iscoroutine
