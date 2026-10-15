Class {
	#name : 'TryElseScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TryElseScopeTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
TryElseScopeTestCase >> setUp [
	"Reload tests/python/try_else_scope.py fresh each test.  The module body runs
	every probe at import, so a shared instance would let one test's loop
	counters and appended lists be read by the next."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'try_else_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/try_else_scope.py')
		name: 'try_else_scope'.

]

{ #category : 'Grail-Tests - When The Else Runs At All' }
TryElseScopeTestCase >> testControlFlowOutOfTheElseItself [
	"A return or break in the else has to leave the statement, from its new
	position outside the handler nest as it did from inside it."

	self assertMatchesCPythonAt: 'return_in_else'.
	self assertMatchesCPythonAt: 'break_in_else'.

]

{ #category : 'Grail-Tests - But Finally Still Covers It' }
TryElseScopeTestCase >> testFinallyStillCoversTheElse [
	"The half a naive fix breaks.  Moving the else out of the handlers must not
	move it out of the ensure: the finally runs when the else raises, and after a
	quiet else, and its own raise supersedes the else's -- leaving the displaced
	one as __context__."

	self assertMatchesCPythonAt: 'finally_runs_when_else_raises'.
	self assertMatchesCPythonAt: 'finally_runs_after_quiet_else'.
	self assertMatchesCPythonAt: 'finally_raise_replaces_else_raise'.

]

{ #category : 'Grail-Tests - What The Else Can Still See' }
TryElseScopeTestCase >> testNothingIsBeingHandledDuringTheElse [
	"The else runs on the SUCCESS path, so sys.exc_info() is empty, an exception
	raised there has no __context__, and a bare ``raise'' has nothing to re-raise
	and is a RuntimeError."

	self assertMatchesCPythonAt: 'exc_info_in_else_is_clear'.
	self assertMatchesCPythonAt: 'else_raise_has_no_context'.
	self assertMatchesCPythonAt: 'bare_raise_in_else'.

]

{ #category : 'Grail-Tests - The Else Escapes Its Own Handlers' }
TryElseScopeTestCase >> testTheElseEscapesEveryHandlerNotJustTheFirst [
	"Handlers compile to a NESTED chain of protected blocks, so escaping only
	the innermost would still leave the else caught by the second clause.  Three
	clauses, and the raise matches the middle one."

	self assertMatchesCPythonAt: 'else_not_caught_by_any_handler'.

]

{ #category : 'Grail-Tests - The Else Escapes Its Own Handlers' }
TryElseScopeTestCase >> testTheElseIsNotCaughtByItsOwnExceptClause [
	"THE TEST THIS EXISTS FOR.  A bare ``except:'' and a typed one alike: an
	exception raised in the else belongs to the ENCLOSING statement, not this
	one."

	self assertMatchesCPythonAt: 'else_not_caught_by_own_bare_except'.
	self assertMatchesCPythonAt: 'else_not_caught_by_own_typed_except'.

]

{ #category : 'Grail-Tests - The Else Escapes Its Own Handlers' }
TryElseScopeTestCase >> testTheElseReachesTheCallerWhenNothingEncloses [
	"With no outer try at all the exception has to leave the function.  Before,
	the handler returned instead and the caller saw a perfectly ordinary value --
	the failure mode that makes this bug hard to notice."

	self assertMatchesCPythonAt: 'else_escapes_to_the_caller'.

]

{ #category : 'Grail-Tests - When The Else Runs At All' }
TryElseScopeTestCase >> testTheElseRunsOnlyWhenTheBodyFellThrough [
	"The other half of the marker: ``false'' from a handler, and nothing at all
	from a body that left by return / break / continue, all have to skip the
	else."

	self assertMatchesCPythonAt: 'else_skipped_when_body_raises'.
	self assertMatchesCPythonAt: 'else_skipped_when_handler_ran'.
	self assertMatchesCPythonAt: 'else_skipped_when_body_returns'.
	self assertMatchesCPythonAt: 'else_skipped_when_body_breaks'.
	self assertMatchesCPythonAt: 'else_skipped_when_body_continues'.

]

{ #category : 'Grail-Tests - What The Else Can Still See' }
TryElseScopeTestCase >> testTheElseStillSeesWhatTheBodyBound [
	"Moving the emit out of the body block must not move the else out of the
	body's SCOPE -- ``x'' is assigned in the try and read in the else, which is
	the whole shape the clause exists for."

	self assertMatchesCPythonAt: 'else_sees_body_locals'.

]

{ #category : 'Grail-Tests - Nesting' }
TryElseScopeTestCase >> testTheFixDoesNotOvershoot [
	"A try INSIDE the else keeps its own handlers -- what is unprotected is this
	statement's clauses, not everything downstream.  And an inner else raising
	inside an OUTER try body is caught by the outer handler, which is the
	original test_exception_variations shape one level up."

	self assertMatchesCPythonAt: 'nested_try_inside_else'.
	self assertMatchesCPythonAt: 'inner_else_inside_outer_body'.

]

{ #category : 'Grail-Tests - The Else Escapes Its Own Handlers' }
TryElseScopeTestCase >> testTheSameRuleHoldsForExceptStar [
	"PEP 654 ``except*'' gets a wholly separate emit in TryAst, so it had its own
	copy of the bug and needs its own coverage."

	self assertMatchesCPythonAt: 'star_else_not_caught_by_own_handler'.
	self assertMatchesCPythonAt: 'star_else_with_finally'.
	self assertMatchesCPythonAt: 'star_else_skipped_when_body_raises'.

]
