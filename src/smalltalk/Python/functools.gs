! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- functools class (Python 'functools' module)
expectvalue /Class
doit
module subclass: 'functools'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools comment:
'Python functools module.

Provides higher-order functions and operations on callable objects.
Currently implements lru_cache as a pass-through (no caching) and reduce.
See https://docs.python.org/3/library/functools.html
'
%

expectvalue /Class
doit
functools category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
functools removeAllMethods: 1.
functools class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: functools
initialize
	"No-op — all methods are real fast-path methods."
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_ASSIGNMENTS
	"Tuple of attribute names ``functools.update_wrapper`` copies
	from wrapped to wrapper.  Matches CPython 3.x.  Grail's
	update_wrapper stub doesn't actually copy anything, but the
	constant is exported for callers that read it (jinja2.compiler
	splices it into a decorator's signature)."

	^ tuple @env0:withAll: #('__module__' '__name__' '__qualname__' '__annotations__' '__type_params__' '__doc__')
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_UPDATES
	"Tuple of attribute names ``functools.update_wrapper`` MERGES
	from wrapped into wrapper (default: just ``__dict__``)."

	^ tuple @env0:withAll: #('__dict__')
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: functools
lru_cache: maxsize
	"lru_cache(maxsize) -> decorator.
	The decorator wraps the user function in a LruCacheWrapper that
	is callable (delegates to the wrapped function) and exposes the
	``cache_clear`` / ``cache_info`` attributes Jinja2 + downstream
	consumers expect.  Caching itself is a no-op for now — every
	call re-invokes the wrapped function.  Adequate for Flask
	hello-world; revisit when render perf matters."

	^ [:positional2 :keywords2 |
		LruCacheWrapper @env1:___wrap___: (positional2 @env0:at: 1)]
%

category: 'Grail-Built-in Functions'
method: functools
_lru_cache: positional kw: kwargs
	"Varargs entry — ``lru_cache(maxsize=128, typed=False)`` from
	user code.  Ignores the keyword args; returns the same wrapper-
	emitting decorator the fixed-arity form does."

	^ [:positional2 :keywords2 |
		LruCacheWrapper @env1:___wrap___: (positional2 @env0:at: 1)]
%

category: 'Grail-Built-in Functions'
method: functools
cache: aFunction
	"``@cache'' (Python 3.9+) — shorthand for ``@lru_cache(maxsize=None)''
	with unbounded cache.  Grail wraps the function in a LruCacheWrapper
	the same way ``lru_cache(...)'' does — no caching today (every call
	re-invokes), but the wrapper is callable and exposes
	``cache_clear'' / ``cache_info''."

	^ LruCacheWrapper @env1:___wrap___: aFunction
%

category: 'Grail-Built-in Functions'
method: functools
cached_property: aFunction
	"cached_property(fn) — CPython decorator that turns a unary
	method into a lazily-computed, per-instance cached attribute.
	Grail stub: pass the function through as-is.  Callers that
	read `obj.attr` get a BoundMethod they can call; nothing
	gets cached.  Replace with real semantics if we start
	hitting hot-path attribute reads."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
wraps: wrapped
	"wraps(wrapped) → decorator that copies metadata from wrapped
	onto the wrapper.  Stub: identity decorator."

	^ [:positional :keywords | positional @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
_wraps: positional kw: kwargs
	"Varargs form of wraps for the ``assigned=...'' / ``updated=...''
	keyword variants used by jinja2.async_utils and CPython
	decorator chains.  Same identity-decorator stub — the kwargs
	carry attribute-list tuples that the real implementation would
	copy through; Grail's BoundMethod / closure shapes don't honour
	user-stamped ``__name__'' / ``__doc__'' anyway, so dropping them
	matches the behaviour of the 1-arg form."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
update_wrapper: wrapper _: wrapped
	"functools.update_wrapper(wrapper, wrapped[, ...]) — copy
	identifying metadata (``__module__``, ``__name__``, ``__doc__``,
	``__dict__``, ``__wrapped__``) from wrapped onto wrapper.  Used
	by Jinja2's ``optimizeconst`` (and the rest of the decorator
	ecosystem) at module-init time.  Stub: return wrapper
	unchanged.  Grail's BoundMethod / closure shapes don't honor
	user-stamped ``__name__`` anyway, so the copy is a no-op until
	there's a real need."

	^ wrapper
%

category: 'Grail-Built-in Functions'
method: functools
_update_wrapper: positional kw: kwargs
	"Varargs form of update_wrapper for the ``assigned=`` /
	``updated=`` keyword variants — same identity stub."

	^ positional @env0:at: 1
%

category: 'Grail-Built-in Functions'
method: functools
partial: aFunction
	"partial(fn, *args, **kwargs) — bind some arguments now and
	return a callable that fills the rest in later.  The 1-arg form
	(no pre-bound args) returns the function untouched; the
	``_partial:kw:'' varargs form handles pre-bound positional /
	keyword arguments."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
_partial: positional kw: kwargs
	"functools.partial(fn, *bound, **boundKw) — return a callable that,
	when later invoked with ``(*more, **moreKw)'', calls
	``fn(*bound, *more, **boundKw, **moreKw)''.  Pre-bound positional
	args come first; later kwargs override earlier ones.  Used e.g. by
	werkzeug.wsgi's ``partial(next, iterator)''."

	| fn boundArgs boundKw |
	(positional @env0:isNil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError @env1:___signal___: 'partial expected at least 1 argument, got 0'
	].
	fn := positional @env0:at: 1.
	boundArgs := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	boundKw := kwargs.
	^ [:morePositional :moreKwargs |
		| allArgs allKw |
		allArgs := boundArgs @env0:, (morePositional @env0:ifNil: [#()]).
		allKw := (boundKw @env0:isNil or: [boundKw @env0:isEmpty])
			ifTrue: [moreKwargs]
			ifFalse: [
				(moreKwargs @env0:isNil or: [moreKwargs @env0:isEmpty])
					ifTrue: [boundKw]
					ifFalse: [
						| merged |
						merged := boundKw @env0:copy.
						moreKwargs @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
						merged]].
		fn @env1:___pyCallValue___: allArgs kw: allKw]
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable
	"reduce(function, iterable) -> value.
	Apply function of two arguments cumulatively to the items of
	iterable, from left to right."

	| result iter item |
	iter := iterable __iter__.
	result := iter __next__.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable _: initial
	"reduce(function, iterable, initial) -> value.
	Like reduce/2 but uses initial as the starting value."

	| result iter item |
	iter := iterable __iter__.
	result := initial.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

set compile_env: 0
