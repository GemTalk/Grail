Class {
	#name : 'RaiseSemanticsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
RaiseSemanticsTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
RaiseSemanticsTestCase >> setUp [
	"Reload tests/python/raise_semantics.py fresh each test -- every entry in
	``r'' is a measurement taken while a particular exception was in flight and
	cannot be recomputed afterwards."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'raise_semantics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/raise_semantics.py')
		name: 'raise_semantics'.

]

{ #category : 'Grail-Tests - Bare Raise' }
RaiseSemanticsTestCase >> testABareRaiseInACalleeSeesItsCallersException [
	"Handling is a property of the THREAD.  A bare raise inside a function
	called from an except block re-raises that block's exception, even though
	the text of the function contains no handler at all -- which is exactly what
	a compile-time decision cannot see."

	self assertMatchesCPythonAt: 'nested_reraise'.

]

{ #category : 'Grail-Tests - Bare Raise' }
RaiseSemanticsTestCase >> testABareRaiseInAFinallyTakesTheExceptionInFlight [
	"The mirror-image error, and the reason the fix is a runtime lookup rather
	than a wider lexical search: here the raise IS inside an except handler
	textually, and the right answer is still not that handler's exception but
	the one passing through the finally."

	self assertMatchesCPythonAt: 'finally_reraise'.

]

{ #category : 'Grail-Tests - Bare Raise' }
RaiseSemanticsTestCase >> testABareRaiseWithNothingActiveIsARuntimeError [
	"Including the exact wording: CPython spells it ``reraise'', unhyphenated,
	and Grail spelled it ``re-raise''.  test_raise's own check matches only the
	``No active exception'' prefix, so nothing in the corpus caught it."

	self assertMatchesCPythonAt: 'reraise_nothing_active'.

]

{ #category : 'Grail-Tests - The from Clause' }
RaiseSemanticsTestCase >> testAClassCauseIsInstantiated [
	"``raise IndexError from KeyError'' must leave __cause__ holding a KeyError
	INSTANCE.  Grail stored the class, and nothing complained at the point the
	``from'' was written -- the type only surfaced wherever someone treated
	__cause__ as an exception."

	self assertMatchesCPythonAt: 'class_cause'.

]

{ #category : 'Grail-Tests - The from Clause' }
RaiseSemanticsTestCase >> testAFailingCauseConstructionPropagates [
	"Instantiating the cause is a real construction, with the same two failure
	modes as the raised operand: an __init__ that raises reports itself, and a
	__new__ answering a non-exception is a TypeError."

	self assertMatchesCPythonAt: 'cause_init_raises'.
	self assertMatchesCPythonAt: 'cause_new_junk'.

]

{ #category : 'Grail-Tests - Implicit Context' }
RaiseSemanticsTestCase >> testAnExceptionInsideExitIsChainedToTheOneItWasCalledAbout [
	"__exit__ runs ON BEHALF of the in-flight exception, so that exception is
	what sys.exc_info() reports while it runs -- and therefore what anything it
	raises is chained to."

	self assertMatchesCPythonAt: 'context_inside_exit'.

]

{ #category : 'Grail-Tests - Still Legal' }
RaiseSemanticsTestCase >> testIdentityAndSuppressionSurvive [
	"``except E: raise'' must re-raise the SAME object -- contextlib's
	@contextmanager is ``if exc is not value: raise'', so a copy breaks every
	one of them -- and ``from None'' must still record the context while
	suppressing its rendering."

	self assertMatchesCPythonAt: 'reraise_same_object'.
	self assertMatchesCPythonAt: 'instance_cause'.
	self assertMatchesCPythonAt: 'from_none'.

]

{ #category : 'Grail-Tests - Still Legal' }
RaiseSemanticsTestCase >> testOrdinaryRaisesAreUnchanged [
	"THE TESTS THAT MATTER MOST HERE.  Every fix above moved an ordinary raise
	onto a different path -- ``raise KeyError'' now consults two class-chain
	probes before the fast signal, and every hand-built runtime exception now
	runs the chaining check.  Args, message and instance-ness are what a
	mis-routed fast path would lose."

	self assertMatchesCPythonAt: 'plain_class'.
	self assertMatchesCPythonAt: 'plain_call'.
	self assertMatchesCPythonAt: 'user_init_runs'.

]

{ #category : 'Grail-Tests - Raising A Class' }
RaiseSemanticsTestCase >> testRaisingAClassRunsItsInit [
	"``raise Cls'' is ``raise Cls()'', so an __init__ that raises surfaces ITS
	exception.  Grail reported Cls -- the exception the user was trying to
	construct -- and only when nothing happened to be in flight, because the
	other path already built the instance."

	self assertMatchesCPythonAt: 'bare_class_init_raises'.
	self assertMatchesCPythonAt: 'handled_class_init_raises'.

]

{ #category : 'Grail-Tests - Raising A Class' }
RaiseSemanticsTestCase >> testRaisingAClassRunsItsNewAndChecksTheResult [
	"A user __new__ can SUCCEED and answer something that is not an exception,
	which is the case allocation cannot detect however carefully it is done --
	only CALLING the class reveals it.  CPython's message names both the class
	called and the class it wrongly answered."

	self assertMatchesCPythonAt: 'bare_class_new_junk'.
	self assertMatchesCPythonAt: 'handled_class_new_junk'.

]

{ #category : 'Grail-Tests - Raising A Class' }
RaiseSemanticsTestCase >> testTheCallFormGetsTheOtherMessage [
	"``raise Cls()'' evaluates the call first, so what fails is the VALUE, and
	CPython says ``exceptions must derive from BaseException'' rather than
	``calling ... should have returned''.  Two messages for one mistake, and
	which one appears says where it was noticed."

	self assertMatchesCPythonAt: 'call_form_new_junk'.

]

{ #category : 'Grail-Tests - Implicit Context' }
RaiseSemanticsTestCase >> testTheRuntimesOwnExceptionsAreChainedToo [
	"__context__ was applied only on the paths a ``raise'' STATEMENT takes.  An
	undefined name and a missing attribute are raised by the runtime on the
	user's behalf and got nothing, so the report lost the half that says why."

	self assertMatchesCPythonAt: 'context_of_name_error'.
	self assertMatchesCPythonAt: 'context_of_attribute_error'.

]
