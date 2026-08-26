! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AwaitablePlumbingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AwaitablePlumbingTestCase comment:
'Three small awaitable-protocol contracts, one increment.

THE REAL-ITERATOR JUDGEMENT.  ``__await__''''s result must be an iterator,
judged as CPython judges it -- by the TYPE, not an attribute probe.
___respondsTo___: could not make that call: PythonInstance defines a
fallback __next__/__iter__ pair every user-class instance inherits, so the
probe answered true about EVERYTHING, and test_await_13''s self-returning
awaitable slipped past the non-iterator check to fail later with the wrong
message.  PythonGenerator >> ___isRealIterator___: asks whether the class
chain defines __next__ BELOW the PythonInstance fallback (or a class
attribute supplies one -- the _operator_fallbacks idiom).

THE LEGACY THROW.  ``throw(type, value, tb)'''' -- the pre-3.12 signature --
works with CPython''s normalisation (None constructs the type bare, an
instance travels as-is, anything else becomes the type''s argument) and
CPython''s DeprecationWarning, emitted UNGUARDED through the vendored
warnings machinery: assertWarns sees it (test_func_10), and a
simplefilter(''error'') promotion raises it out of throw() exactly as
upstream''s does.  PyCoroutineWrapper forwards both arities.

ANEXT WITH A DEFAULT.  ``anext(ait, default)'''' answers CPython''s
anext_awaitable (PyAnextAwaitable): nothing advances until driven,
exhaustion becomes StopIteration carrying the default so the await
evaluates to it, close() on an undriven one is a quiet no-op, close(1) is
the arity TypeError (test_await_17).  The one-arg rejection message moved
to CPython 3.14''s wording: ``''X'' object is not an async iterator''.

See tests/python/awaitable_plumbing.py (10 checks, CPython-validated
first).'
%

expectvalue /Class
doit
AwaitablePlumbingTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AwaitablePlumbingTestCase removeAllMethods: 0.
AwaitablePlumbingTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AwaitablePlumbingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'awaitable_plumbing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/awaitable_plumbing.py')
		name: 'awaitable_plumbing'.
%

category: 'Grail-Helpers'
method: AwaitablePlumbingTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AwaitablePlumbingTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - real iterators'
method: AwaitablePlumbingTestCase
testAwaitResultsAreJudgedByType
	"The self-returning awaitable and the sequence-protocol object are both
	rejected with CPython's message naming THEIR type; a real user iterator
	is accepted and driven to its StopIteration value."

	self assertAll: #('self_returning_await_is_non_iterator'
		'sequence_protocol_is_not_an_iterator_either'
		'a_real_user_iterator_is_driven')
%

category: 'Grail-Tests - legacy throw'
method: AwaitablePlumbingTestCase
testLegacyThrowSignatures
	"Both arities, CPython's normalisation, and the DeprecationWarning
	observed the strict way: promoted to a raise by simplefilter('error')."

	self assertAll: #('three_arg_throw_normalises_the_instance'
		'two_arg_throw_with_none_constructs_the_type'
		'legacy_throw_emits_the_deprecation_warning')
%

category: 'Grail-Tests - anext default'
method: AwaitablePlumbingTestCase
testAnextWithDefault
	self assertAll: #('await_anext_default_at_exhaustion'
		'await_anext_default_delivers_the_item'
		'anext_awaitable_close_contracts'
		'anext_still_rejects_a_sync_iterator')
%
