! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptClauseShieldTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptClauseShieldTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExceptClauseShieldTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptClauseShieldTestCase
!
! WHICH ``except'' CLAUSE CATCHES AN EXCEPTION RAISED IN A HANDLER.
!
! Python's except clauses are alternatives for the try BODY only.  An exception
! raised inside one clause's handler is not offered to the other clauses of that
! same try.  Grail's clauses compile to NESTED protected blocks -- the later
! clauses' on:do: enclose the earlier clauses' bodies -- so that rule has to be
! enforced explicitly, by SHIELDING a later clause while an earlier one's handler
! runs.
!
! THE SHIELD WAS TOO WIDE.  It was keyed to BaseException ___handlerDepth___, a
! session-wide count of running handler bodies, so it fired for any handler at
! all -- including one inside a function the try BODY merely called:
!
!     def g():
!         try:    raise ValueError()
!         except: raise B()          # a handler, but g's, not mine
!
!     try:      g()
!     except A: ...                  # does not match
!     except B: ...                  # CPython catches here; Grail did not
!
! A count cannot tell those apart, so B escaped uncaught.  The shape is ordinary
! -- anything that converts one exception into another inside a handler -- and
! the failure is SILENT: the exception passes a clause written to catch it.
!
! IDENTITY, NOT DEPTH, is the fix: a token names the try, handlers push it while
! they run, and a later clause shields only when its OWN token is on the stack
! (BaseException >> ___handlerTokenActive___:).  The stack is searched whole
! rather than just its top, so ``my handler called something whose handler
! raised'' still counts as mine.
!
! THE TOKEN IS A SYMBOL LITERAL, and that choice is forced.  The obvious design
! -- a fresh object per try ENTRY, held in an enclosing block's temp -- is
! per-ACTIVATION and strictly more correct.  It is also a design this codebase
! had already tried and rejected, and re-deriving it reproduced the rejection
! exactly: the extra stack frame per try turned test_richcmp's test_recursion
! (which runs under support.infinite_recursion(25)) into a RecursionError.  The
! comment on PyLazyExceptSelector class >> on:shieldedAbove: records that
! history.  A Symbol is a literal in the compiled method: no allocation, and no
! frame.
!
! WHAT PER-SITE GIVES UP, precisely: a function that recurses FROM INSIDE one of
! its own handlers, where the inner activation's later clause should catch
! something the outer activation's handler is not responsible for.  The token is
! on the stack from the outer activation, so the inner clause shields where
! CPython would catch.  Recursion that does not pass through a handler of the
! same try -- the ordinary kind, and what testRecursionCatchesAtTheRaisingFrame
! covers -- is unaffected.  That is a deliberate trade of a rare wrong answer for
! a common one, made because the alternative has a measured cost.
!
! Fixture: tests/python/except_clause_shield.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: ExceptClauseShieldTestCase
setUp
	probe := self ___loadProbe___: 'except_clause_shield'.
%

category: 'Grail-Private'
method: ExceptClauseShieldTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: ExceptClauseShieldTestCase
reprAt: aKey
	"The fixture's entries are Python lists of log strings; compare their repr
	so a failure prints the whole sequence."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testACalleesHandlerDoesNotShieldMyLaterClauses
	"THE BUG.  No handler of MINE is running -- the callee's is not my business
	-- so my later clause must catch.  It did not, and nothing announced it: the
	exception simply passed a clause written for it."

	self assert: (self reprAt: 'body_calls_fn') equals: '[''caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testTheMatchMayBeInTheThirdClause
	"The shield applied to EVERY clause after the first, so this was about
	depth, not about being second.  A fix that only repaired the second clause
	would pass the test above and fail here."

	self assert: (self reprAt: 'body_calls_fn_three_clauses')
		equals: '[''caught-C'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testABareExceptStillCatchesFromACallee
	"The same bug in its bare-``except:'' form.  A bare clause must be LAST, so
	it is always shielded and always took the wrong branch here."

	self assert: (self reprAt: 'bare_except_still_catches_from_a_callee')
		equals: '[''caught-bare'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testMyOwnHandlersExceptionIsNotCaughtBySibling
	"WHAT THE SHIELD IS FOR, and what a fix that merely removed it would break.
	Python's clauses are alternatives for the BODY; B raised by my ``except A:''
	belongs to my caller."

	self assert: (self reprAt: 'sibling_not_caught')
		equals: '[''in-A'', ''outer-caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testStillMineWhenMyHandlerCallsSomething
	"The subtle half of the shield: the raise happens a call away, inside
	SOMEONE ELSE's handler, but my handler is still running -- so it is still
	mine.  This is why the token stack is searched whole rather than just its
	top."

	self assert: (self reprAt: 'handler_calls_fn')
		equals: '[''in-A'', ''outer-caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testABareExceptAsALaterClauseIsStillShielded
	self assert: (self reprAt: 'bare_except_as_a_later_clause')
		equals: '[''in-A'', ''outer-caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testATryInsideAHandlerCatchesFromItsOwnBody
	"Nesting: the inner try is a different try, so the outer's shield says
	nothing about it."

	self assert: (self reprAt: 'try_inside_handler')
		equals: '[''inner-caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testRecursionCatchesAtTheRaisingFrame
	"The same try SITE active several times over.  The token is per-site, so
	this is the case that pins where that is sound: no handler is running as the
	recursion descends, so the deepest activation catches its own raise."

	self assert: (self reprAt: 'recursive') equals: '[''B0'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testAHandlersExceptionPropagatesWhenThereIsNoLaterClause
	self assert: (self reprAt: 'no_later_clause') equals: '[''outer-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testASingleClauseTryIsUntouched
	"One clause has no sibling to shield, so it emits exactly what it always
	did -- no token, no push, no test.  That is the common case, and keeping it
	byte-for-byte is what bounds this change."

	self assert: (self reprAt: 'single_clause_is_untouched')
		equals: '[''caught-B'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testTheOrdinaryPathIsUnaffected
	"Clause one matches and runs."

	self assert: (self reprAt: 'first_clause_still_matches') equals: '[''A'']'.
%

category: 'Grail-Tests'
method: ExceptClauseShieldTestCase
testElseAndFinallyStillRun
	"The emit threads else/finally around the same nest the token now wraps."

	self assert: (self reprAt: 'else_and_finally_still_run')
		equals: '[''body'', ''else'', ''finally'']'.
%
