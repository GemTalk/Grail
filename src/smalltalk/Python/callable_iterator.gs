! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- callable_iterator class (Python 'callable_iterator' type)
expectvalue /Class
doit
iterator subclass: 'callable_iterator'
  instVarNames: #( callable sentinel exhausted)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
callable_iterator comment:
'CPython''s callable_iterator (calliterobject): the iterator returned by the
two-argument form ``iter(callable, sentinel)''.  Each __next__ calls
``callable()'' with no arguments and returns the result, UNTIL the result is
equal (Python ==) to the sentinel, at which point it raises StopIteration.

Exhaustion is latched (CPython clears it_callable): once the sentinel has been
seen -- or the callable raised StopIteration -- a spent iterator stays spent
and does NOT call the callable again.  The post-call re-check of ``exhausted''
covers gh-101892 (test_iter_function_concealing_reentrant_exhaustion): a
callable that re-entrantly exhausts THIS iterator mid-call must leave it spent,
so the value it finally returns is discarded and StopIteration is raised.

Instance variables:
  callable  - the zero-argument callable (a function, or an instance whose
              class defines __call__)
  sentinel  - the stop value; a returned value == sentinel ends iteration
  exhausted - latched true once StopIteration has been raised, so the spent
              iterator stays spent (matches CPython clearing it_callable)
'
%

expectvalue /Class
doit
callable_iterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
callable_iterator removeAllMethods: 1.
callable_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: callable_iterator
___on: aCallable sentinel: aSentinel
	"Create a callable_iterator for iter(aCallable, aSentinel)."

	| instance |
	instance := self ___new___.
	instance ___callable: aCallable sentinel: aSentinel.
	^ instance
%

category: 'Grail-Private'
method: callable_iterator
___callable: aCallable sentinel: aSentinel
	callable := aCallable.
	sentinel := aSentinel.
	exhausted := false
%

category: 'Grail-Iterator Protocol'
method: callable_iterator
__next__
	"Call callable(); stop when the result equals the sentinel.  Mirrors
	CPython calliter_iternext:

	  * a spent iterator (exhausted) always raises StopIteration without
	    calling the callable again;
	  * StopIteration raised BY the callable latches exhaustion and
	    propagates (the caller treats it as the normal end of iteration);
	  * any OTHER exception from the callable propagates unchanged
	    (test_exception_function: a RuntimeError surfaces mid-iteration);
	  * a re-entrant call may exhaust THIS iterator mid-call (gh-101892), so
	    re-check exhausted after the call before honouring the result;
	  * a result equal (Python ==, sentinel first, as CPython's
	    RichCompareBool(sentinel, result)) to the sentinel latches exhaustion
	    and raises StopIteration."

	| result |
	exhausted @env0:ifTrue: [StopIteration @env0:signal].
	result := [callable value: { } value: nil]
		@env0:on: StopIteration
		do: [:ex | exhausted := true. ex @env0:pass].
	exhausted @env0:ifTrue: [StopIteration @env0:signal].
	(sentinel ___pyRichEqBool___: result) @env0:ifTrue: [
		exhausted := true.
		StopIteration @env0:signal].
	^ result
%

category: 'Grail-Pickle Protocol'
method: callable_iterator
_getstate
	"Answer (callable, sentinel) for pickling.  CPython's calliter_reduce is
	(iter, (callable, sentinel)) with no resume index -- the callable carries
	its own state, and `exhausted' is a runtime latch that re-derives from the
	callable on reload, so it is deliberately NOT part of the reduction.
	pickle.py's save_iterator turns this into save_reduce(iter, (callable,
	sentinel)).  A plain Python-visible method (no ___ prefix) so pickle.py can
	call it, the same convention as tuple_iterator/seq_iterator _getstate."

	^ tuple @env0:withAll: { callable. sentinel }
%

set compile_env: 0
