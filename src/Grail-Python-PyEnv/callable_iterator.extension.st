Extension { #name : 'callable_iterator' }

{ #category : 'Grail-Instance Creation' }
callable_iterator class >> ___on: aCallable sentinel: aSentinel [
	"Create a callable_iterator for iter(aCallable, aSentinel)."

	| instance |
	instance := self ___new___.
	instance ___callable: aCallable sentinel: aSentinel.
	^ instance

]

{ #category : 'Grail-Private' }
callable_iterator >> ___callable: aCallable sentinel: aSentinel [
	callable := aCallable.
	sentinel := aSentinel.
	exhausted := false

]

{ #category : 'Grail-Iterator Protocol' }
callable_iterator >> __iter__ [
	"An iterator is its own iterator.  Defined HERE, not only inherited from
	the Smalltalk ``iterator'' class, because that class is not in this
	type's Python __mro__ -- and collections.abc.Iterator is
	_check_methods over the MRO's __dict__s, so an inherited __iter__ left
	``isinstance(iter(seq), Iterator)'' False.  CPython registers neither
	type, and needs not: its own classes carry the method."

	^ self

]

{ #category : 'Grail-Iterator Protocol' }
callable_iterator >> __next__ [
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

]

{ #category : 'Grail-Pickle Protocol' }
callable_iterator >> _getstate [
	"Answer (callable, sentinel) for pickling.  CPython's calliter_reduce is
	(iter, (callable, sentinel)) with no resume index -- the callable carries
	its own state, and `exhausted' is a runtime latch that re-derives from the
	callable on reload, so it is deliberately NOT part of the reduction.
	pickle.py's save_iterator turns this into save_reduce(iter, (callable,
	sentinel)).  A plain Python-visible method (no ___ prefix) so pickle.py can
	call it, the same convention as tuple_iterator/seq_iterator _getstate."

	^ tuple @env0:withAll: { callable. sentinel }

]
