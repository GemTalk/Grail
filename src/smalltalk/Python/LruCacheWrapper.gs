! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- LruCacheWrapper class definition
expectvalue /Class
doit
Object subclass: 'LruCacheWrapper'
  instVarNames: #( wrapped )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LruCacheWrapper comment:
'Wrapper returned by ``functools.lru_cache`` so the decorated
function exposes the ``cache_clear`` / ``cache_info`` attributes
CPython callers rely on.  Caching itself is a no-op in this
build — every invocation re-delegates to the wrapped function.

A real lru_cache implementation would intern call results in a
dictionary keyed by a freeze of the positional + keyword args;
the surface here is intentionally minimal — enough to let
``@lru_cache(maxsize=10)``-decorated functions import and run
without ``MessageNotUnderstood: cache_clear``.'
%

expectvalue /Class
doit
LruCacheWrapper category: 'Grail-Modules'
%

removeallmethods LruCacheWrapper
removeallclassmethods LruCacheWrapper

set compile_env: 0

category: 'Grail-Private'
method: LruCacheWrapper
_setWrapped: aFunction

	wrapped := aFunction
%

set compile_env: 1

! ------- Class-side construction (env-1 entry from functools)

category: 'Grail-Instance Creation'
classmethod: LruCacheWrapper
___wrap___: aFunction
	"Build a wrapper around aFunction.  ``functools.lru_cache``
	uses this as the decoration step."

	| inst |
	inst := self @env0:new.
	inst @env0:_setWrapped: aFunction.
	^ inst
%

! ------- Instance-side dispatch (env-1)

category: 'Grail-Calling'
method: LruCacheWrapper
value: positional value: kwargs
	"Plain call site: ``wrapped_fn(*args, **kwargs)``.  Delegates
	to the wrapped function; the wrapped function is itself a
	closure / BoundMethod that already accepts the
	``value:value:`` 2-arg call convention."

	^ wrapped @env1:value: positional value: kwargs
%

category: 'Grail-Calling'
method: LruCacheWrapper
___call___: positional kw: kwargs
	"Same dispatch via the Python varargs convention — Grail's
	CallAst fast path tries ``___call___:kw:`` when the receiver
	doesn't match a simpler shape."

	^ wrapped @env1:value: positional value: kwargs
%

category: 'Grail-Calling'
method: LruCacheWrapper
___pyCallValue___: positional kw: kwargs
	"Indirect call protocol — ``f = lru_cached_fn; f(x)`` and any
	call site that reaches the object through a variable dispatches
	here (object>>___pyCallValue___ otherwise raises ``not
	callable'').  django.utils.inspect._get_func_parameters is
	@lru_cache-decorated and invoked indirectly through
	_get_callable_parameters."

	^ wrapped @env1:value: positional value: kwargs
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_clear
	"``functools.lru_cache``: clear the (no-op) cache.  Real
	implementation would reset the cache dict."

	^ None
%

category: 'Grail-Attributes'
method: LruCacheWrapper
cache_info
	"``functools.lru_cache``: return a ``CacheInfo`` named-tuple
	(hits, misses, maxsize, currsize).  Stub: a tuple of zeros."

	^ tuple @env0:withAll: #(0 0 nil 0)
%

category: 'Grail-Attributes'
method: LruCacheWrapper
__wrapped__
	"CPython exposes the wrapped function via ``__wrapped__``."

	^ wrapped
%

set compile_env: 0
