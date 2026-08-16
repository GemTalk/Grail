! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- StopIteration
expectvalue /Class
doit
Exception subclass: 'StopIteration'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StopIteration comment:
'Python StopIteration exception.

Carries the iterator''s return value as the ``value'' attribute (PEP 380).
It is DERIVED from args rather than stored: every construction path already
routes through ___args___:, so a single reader keeps ``StopIteration(v).value''
and ``raise StopIteration(v)'' agreeing without each path remembering to set a
slot.  An explicit ``e.value = x'' store lands in dynamic-instVar storage,
which ___pyAttrLoad___ probes BEFORE methods, so the assignment shadows the
derivation with no setter needed.
'
%

expectvalue /Class
doit
StopIteration category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-Accessing'
method: StopIteration
value
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
%

category: 'Grail-Signalling'
classmethod: StopIteration
___signalReturn___: aValue
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
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: StopIteration
___pythonValueAttrs___
	"``e.value'' is the returned VALUE, not a callable, so ___pyAttrLoad___ must
	perform the accessor instead of wrapping it as a BoundMethod -- without this
	``e.value'' answered ``<BoundMethod object ...>'' and every comparison
	against it silently failed rather than erroring.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'value';
		yourself
%
