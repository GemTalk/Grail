Class {
	#name : 'ExceptClauseShieldTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExceptClauseShieldTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
ExceptClauseShieldTestCase >> reprAt: aKey [
	"The fixture's entries are Python lists of log strings; compare their repr
	so a failure prints the whole sequence."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
ExceptClauseShieldTestCase >> setUp [
	probe := self ___loadProbe___: 'except_clause_shield'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testABareExceptAsALaterClauseIsStillShielded [
	self assert: (self reprAt: 'bare_except_as_a_later_clause')
		equals: '[''in-A'', ''outer-caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testABareExceptStillCatchesFromACallee [
	"The same bug in its bare-``except:'' form.  A bare clause must be LAST, so
	it is always shielded and always took the wrong branch here."

	self assert: (self reprAt: 'bare_except_still_catches_from_a_callee')
		equals: '[''caught-bare'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testACalleesHandlerDoesNotShieldMyLaterClauses [
	"THE BUG.  No handler of MINE is running -- the callee's is not my business
	-- so my later clause must catch.  It did not, and nothing announced it: the
	exception simply passed a clause written for it."

	self assert: (self reprAt: 'body_calls_fn') equals: '[''caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testAGeneratorParkedInItsHandlerDoesNotShieldItsConsumer [
	"THE SHIELD MUST NOT CROSS A CALL STACK.

	A generator body is a second thread of execution -- it runs on its own
	forked process -- and it can suspend INSIDE an except handler, leaving a
	handler counted while control is back with the consumer.  That bookkeeping
	(the depth, and the try-token stack beside it) lived in ONE session-wide
	place, so the consumer's own handler then unwound the GENERATOR's entry and
	left its own behind.  Its try site looked permanently ``already handling''
	from then on, and the shield refused every later clause of it.

	So the failure is not a mis-matched handler, it is an UNCAUGHT exception --
	a bare ``except BaseException'' is refused too.  Silent, and permanent for
	the rest of the session.

	This is the synchronous statement of a bug that showed up as an ASGI server
	dying on its first request: two coroutines both parked inside
	``except BlockingIOError: await ...'' -- the canonical asyncio retry, and the
	shape of every socket coroutine in the event loop -- so connect() answered
	EISCONN straight past an ``except OSError'' written to catch exactly that.
	See AsgiServerTestCase, and BaseException >> ___captureHandlerState___ for
	the fix: save and restore it across every suspension, the way the
	currently-handled exception already was."

	self assert: (self reprAt:
			'generator_parked_in_handler_does_not_shield_its_consumer')
		equals: '[''A'', ''parked'', ''B'', ''done'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testAHandlersExceptionPropagatesWhenThereIsNoLaterClause [
	self assert: (self reprAt: 'no_later_clause') equals: '[''outer-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testASingleClauseTryIsUntouched [
	"One clause has no sibling to shield, so it emits exactly what it always
	did -- no token, no push, no test.  That is the common case, and keeping it
	byte-for-byte is what bounds this change."

	self assert: (self reprAt: 'single_clause_is_untouched')
		equals: '[''caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testATryInsideAHandlerCatchesFromItsOwnBody [
	"Nesting: the inner try is a different try, so the outer's shield says
	nothing about it."

	self assert: (self reprAt: 'try_inside_handler')
		equals: '[''inner-caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testElseAndFinallyStillRun [
	"The emit threads else/finally around the same nest the token now wraps."

	self assert: (self reprAt: 'else_and_finally_still_run')
		equals: '[''body'', ''else'', ''finally'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testMyOwnHandlersExceptionIsNotCaughtBySibling [
	"WHAT THE SHIELD IS FOR, and what a fix that merely removed it would break.
	Python's clauses are alternatives for the BODY; B raised by my ``except A:''
	belongs to my caller."

	self assert: (self reprAt: 'sibling_not_caught')
		equals: '[''in-A'', ''outer-caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testRecursionCatchesAtTheRaisingFrame [
	"The same try SITE active several times over.  The token is per-site, so
	this is the case that pins where that is sound: no handler is running as the
	recursion descends, so the deepest activation catches its own raise."

	self assert: (self reprAt: 'recursive') equals: '[''B0'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testStillMineWhenMyHandlerCallsSomething [
	"The subtle half of the shield: the raise happens a call away, inside
	SOMEONE ELSE's handler, but my handler is still running -- so it is still
	mine.  This is why the token stack is searched whole rather than just its
	top."

	self assert: (self reprAt: 'handler_calls_fn')
		equals: '[''in-A'', ''outer-caught-B'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testTheMatchMayBeInTheThirdClause [
	"The shield applied to EVERY clause after the first, so this was about
	depth, not about being second.  A fix that only repaired the second clause
	would pass the test above and fail here."

	self assert: (self reprAt: 'body_calls_fn_three_clauses')
		equals: '[''caught-C'']'.

]

{ #category : 'Grail-Tests' }
ExceptClauseShieldTestCase >> testTheOrdinaryPathIsUnaffected [
	"Clause one matches and runs."

	self assert: (self reprAt: 'first_clause_still_matches') equals: '[''A'']'.

]
