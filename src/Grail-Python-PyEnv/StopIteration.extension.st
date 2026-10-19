Extension { #name : 'StopIteration' }

{ #category : 'Grail-Signalling' }
StopIteration class >> ___signalReturn___: aValue [
	"Signal the end of a generator whose body returned ``aValue''.

	Differs from ___signal___: in exactly one way, and it is the way CPython
	behaves: a return value of None produces NO constructor argument, so
	``args'' is the empty tuple and repr is a bare ``StopIteration()''.  Only a
	non-None return becomes ``StopIteration(v)''.  Going through ___signal___:
	made every ordinary generator exhaustion carry a spurious ``(None,)'',
	which surfaced the moment a test rendered the exception --
	test_next_and_return_with_value compares ``%r'' %% (e,) against
	``StopIteration()''.

	``value'' reads the same for both, since it defaults an empty args to
	None."

	| instance |
	instance := self ___new___.
	instance ___args___: (aValue == None ifTrue: [#()] ifFalse: [{ aValue }]).
	instance ___applyImplicitContext___.
	^ instance ___signal___: aValue

]

{ #category : 'Grail-Accessing' }
StopIteration >> value [
	"PEP 380''s ``value'' attribute: what the exhausted iterator returned.

	CPython sets it from the first constructor argument, defaulting to None --
	``StopIteration().value is None'', ``StopIteration(''spam'').value ==
	''spam'''' -- and ``yield from'' reads it to produce the delegation''s
	result.  Grail had the attribute nowhere, so every read raised
	AttributeError (test_yield_from''s
	test_value_attribute_of_StopIteration_exception, and the four
	TestInterestingEdgeCases tests that go through the same door).

	Deriving from args rather than caching in a slot is what makes this hold for
	the raise paths too: ``StopIteration ___signal___: v'' fills args and never
	touches an instVar."

	| a |
	a := self args.
	^ (a @env0:size @env0:> 0)
		ifTrue: [a @env0:at: 1]
		ifFalse: [None]

]
