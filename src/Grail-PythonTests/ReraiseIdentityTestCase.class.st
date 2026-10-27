Class {
	#name : 'ReraiseIdentityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReraiseIdentityTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ReraiseIdentityTestCase >> setUp [
	"Reload tests/python/reraise_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reraise_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reraise_identity.py')
		name: 'reraise_identity'.

]

{ #category : 'Grail-Tests - Identity' }
ReraiseIdentityTestCase >> testABareReraisePropagatesTheSameObject [
	self assert: (self resultAt: 'bare_reraise') asString
		equals: '[''ValueError'', True]'.

]

{ #category : 'Grail-Tests - Boundaries' }
ReraiseIdentityTestCase >> testAContextManagerExitSeesThePayload [
	"REGRESSION GUARD for the WithAst boundary.  __exit__ receives Python's
	exception; handed the CARRIER it got one with no args, and unittest's
	assertRaisesRegex began reporting ``'...' does not match '''''.  Four
	test_wave cases caught it."

	self assert: (self resultAt: 'exit_sees_payload') asString
		equals: '[''ValueError'', ''seen by exit'', (''seen by exit'',)]'.

]

{ #category : 'Grail-Tests - Identity' }
ReraiseIdentityTestCase >> testAnExceptionSurvivesRepeatedRoundTrips [
	"The payload is never signalled, so it never accumulates frames -- there is
	no count of re-raises after which it stops being raisable."

	self assert: (self resultAt: 'reraised_repeatedly') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Identity' }
ReraiseIdentityTestCase >> testAnExplicitReraisePropagatesTheSameObject [
	"``except E as e: raise e''.  #copy answered a different object that matched
	the same ``except'', so this read as working until something compared with
	``is''."

	self assert: (self resultAt: 'explicit_reraise') asString
		equals: '[''ValueError'', True]'.

]

{ #category : 'Grail-Tests - Traceback' }
ReraiseIdentityTestCase >> testAReraiseDoesNotRecordItsFrameTwice [
	"REGRESSION GUARD for the TryAst frame-push boundary, and the subtlest part
	of this change.  CPython records ONE frame per function unwound through, at
	the line where the exception ENTERED it -- ``_mid'' at its ``_leaf()'' call,
	never at its own ``raise''.  The catching frame push must therefore run on
	the PAYLOAD, whose captured stack dates from the original signal; run on the
	carrier, the walk rebuilt from the re-raise point and reported ``_mid''
	twice."

	self assert: (self resultAt: 'reraise_frame_chain') asString
		equals: '[(''_catch'', 138), (''_mid'', 131), (''_leaf'', 126)]'.

]

{ #category : 'Grail-Tests - Handler search' }
ReraiseIdentityTestCase >> testAReraiseIsCaughtByAHandlerInsideTheExceptBody [
	"What #pass could not do.  The search resumed OUTSIDE the active on:do:, so
	this handler never ran and the exception left the function as an
	UNCATCHABLE Smalltalk error.  A carrier is an ordinary #signal from the
	raise point -- CPython's fresh search."

	self assert: (self resultAt: 'reraise_inside_with') asString
		equals: '[''RuntimeError'', True]'.

]

{ #category : 'Grail-Tests - Boundaries' }
ReraiseIdentityTestCase >> testAReturnThroughAWithAndAFinallyKeepsItsValue [
	"REGRESSION GUARD for the carrier in ___ensureFinally___:finally:.  A
	``return'' travels as PythonReturn, which is a BaseException too; carried
	like an exception, it arrived without its value and the function answered
	nil."

	self assert: (self resultAt: 'return_through_with_and_finally') asString
		equals: '[5, ''zero'']'.

]

{ #category : 'Grail-Tests - Identity' }
ReraiseIdentityTestCase >> testAWithInsideAFinallyKeepsTheObject [
	"REGRESSION GUARD for BaseException class >> ___ensureFinally___:finally:.
	The ``with'' passes the exception on, which leaves it a stale handler
	frame, and the finally re-signalled a COPY -- the FIRST time a given
	exception made the trip, so the second element alone read as working."

	self assert: (self resultAt: 'with_inside_finally') asString
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests - Identity' }
ReraiseIdentityTestCase >> testAWithInsideContextRunKeepsTheObject [
	"contextvars' Context.run is a try/finally, and FastAPI runs every sync
	endpoint through it: the exception its telemetry logged was not ``is'' the
	one the endpoint raised."

	self assert: (self resultAt: 'with_inside_context_run') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Boundaries' }
ReraiseIdentityTestCase >> testTheExceptionsOwnDataSurvives [
	self assert: (self resultAt: 'args_survive') asString
		equals: '[''payload text'', (''payload text'',)]'.

]
