Class {
	#name : 'StopIterationThroughContextManagerTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StopIterationThroughContextManagerTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
StopIterationThroughContextManagerTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stopiteration_through_contextmanager' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/stopiteration_through_contextmanager.py')
		name: 'stopiteration_through_contextmanager'.

]

{ #category : 'Grail-Tests - Through a context manager' }
StopIterationThroughContextManagerTestCase >> testACallThatRaisesBeforeReturningIsEvaluated [
	"``raise f()'' where f raises before returning anything.  The callee was
	rejected before being called, so the diagnosis was about the callee rather
	than about a value that never existed."

	self assert: (self resultAt: 'uninstantiated') asString equals: 'StopIteration: '.

]

{ #category : 'Grail-Tests - Through a context manager' }
StopIterationThroughContextManagerTestCase >> testAnInstantiatedStopIterationSurvivesTheWith [
	"The exception the body raised is what the caller sees.  It used to arrive as
	``RuntimeError: generator raised StopIteration'' -- the PEP 479 wrapper that
	contextlib is supposed to see through."

	self assert: (self resultAt: 'instantiated') asString
		equals: 'StopIteration: from with'.

]

{ #category : 'Grail-Tests - Known gaps' }
StopIterationThroughContextManagerTestCase >> testRaiseSeesABuiltinCallee [
	"WAS a known gap, recorded here rather than endorsed, and separate from
	StopIteration.  ``raise next(iter([]))'' in a module-level function
	answered ``NameError: name 'next' is not defined'': RaiseAst emits its
	callee as a bare-name load, that load missed, and the runtime fallback
	behind the miss knew only about names INJECTED into builtins at run time.
	The same call NOT under ``raise'' resolved fine, which is what made it
	look like a RaiseAst defect.

	It was not one.  Teaching that fallback to resolve REAL builtins -- the
	``global all'' repair, see GlobalBuiltinFallbackTestCase -- closed this
	too, and this assertion is how it was noticed: it started FAILING, which
	is the outcome a recorded gap is written for.  CPython raises the
	StopIteration that evaluating the argument produces, and so does Grail."

	self assert: (self resultAt: 'module_level_raise_builtin') asString
		equals: 'StopIteration: '.

]

{ #category : 'Grail-Tests - PEP 479 is unchanged' }
StopIterationThroughContextManagerTestCase >> testRaisingANonExceptionIsStillATypeError [
	"REGRESSION GUARD for what the rejected-callee branch was protecting.  The
	instance is now constructed first and ___pyRaise___ finds it is not a
	BaseException, so the same TypeError arrives -- from the value."

	self assert: (self resultAt: 'non_exception_value') asString
		equals: 'TypeError: exceptions must derive from BaseException'.

]

{ #category : 'Grail-Tests - PEP 479 is unchanged' }
StopIterationThroughContextManagerTestCase >> testTheWrapperAndItsCauseAreStillCorrect [
	"REGRESSION GUARD, and the reason the fix is an UNWRAP rather than a skip:
	the RuntimeError is right, and only contextlib is entitled to look past it.
	The second element is the identity that entitles it."

	self assert: (self resultAt: 'thrown_in_wraps_and_chains') asString
		equals: '[''generator raised StopIteration'', True]'.
	self assert: (self resultAt: 'raised_by_body_wraps') asString
		equals: '''generator raised StopIteration'''.

]
