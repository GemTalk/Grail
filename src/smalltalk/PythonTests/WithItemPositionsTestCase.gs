! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WithItemPositionsTestCase'
  instVarNames: #( testModule irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WithItemPositionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WithItemPositionsTestCase
!
! A traceback from a ``with'' must blame the CONTEXT MANAGER EXPRESSION -- not
! the statement, and not the body.
!
! CPython pins a raise from a manager's __init__ / __enter__ / __exit__ to the
! manager expression precisely so ``with A(), B(), C():'' says WHICH one failed.
! It is the only position that can tell them apart.
!
! Grail reported whatever ___curPos___ happened to hold, which is the enclosing
! STATEMENT's position, and the three cases failed differently:
!
!   * __enter__ raising looked correct BY ACCIDENT -- the body had not run yet,
!     so ___curPos___ still pointed at the ``with'' line.
!   * __init__ raising (evaluating the manager expression) and __exit__ raising
!     (after the body) both reported the BODY's last statement instead.
!
! That an accident covered one of the three is why this reads as an off-by-one
! rather than as a missing position: two of the three answers were simply the
! wrong line, and only a test with managers that raise in all three places
! distinguishes them.
!
! THE FIX stores the item's own span into ___curPos___ before the expression is
! evaluated and again before __exit__ (the body has moved it on by then), using
! the same literal-array form ___emitCurPosBefore:on: emits for a statement.  So
! ___pushFrameFromPos___ reads it back identically and the frame gains PEP 657
! COLUMNS as well as the right line -- which is what actually identifies the
! failing manager.
!
! A NESTED function needs a SECOND fix, because its frame never reads the live
! ___curPos___ at all.  A nested ``def'' compiles to a Smalltalk block, so its
! frame is reconstructed by WALKING the stack, and that walk could only ever
! answer a LINE -- it pushed colno/end_colno as None.  The walk's catching-frame
! branch now takes codegen''s recorded span, exactly as the method branch beside
! it already did.  Narrower than that one on purpose: only when the span''s line
! already agrees with the derived one, so it can add columns but never move a
! line an ordinary nested try/except depends on.
!
! That is the shape test_with''s testExceptionLocation actually has -- its
! manager expressions sit in functions nested inside the test METHOD -- and with
! both halves in place test_with is at 54/54.
!
! TWO THINGS THE COLUMN FIX LEFT, both about a SINGLE-item ``with''.
!
! Every ``with'' in the fixture had a ``pass'' body, and PassAst stamps no
! position at all -- so with no following item to drift to, there was nothing
! for a mis-stamped __exit__ to land on, and the one-item case looked correct.
! Give the body a real statement and the same drift shows up as a wrong LINE
! (measured [15, 12, 17], the ``y = 1'').
!
! And ``return'' inside the body reaches __exit__ down a THIRD route, where the
! two codegen paths now differ: IR is right, the TEXT path still reports
! ``return y''.  See testAReturnOutOfAWithReachesExitOnAThirdRoute.
!
! THE IR ARM.  The column bug was flag-on only, so it was invisible here until
! someone ran the CPython corpus by hand; this class now loads the fixture a
! SECOND time with the seam forced on and asserts the same answers, so CI on 4.0
! pins them.  Its first test asserts ___irStats___ itself, because a forced flag
! is not a running seam: on 3.7.x ___irCodegenSupported___ is false, the flag is
! a no-op, and the whole arm would pass vacuously through the text path.
!
! Drives tests/python/with_item_positions.py.  test_with
! NestedWith.testExceptionLocation.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WithItemPositionsTestCase removeAllMethods.
WithItemPositionsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WithItemPositionsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_item_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_item_positions.py')
		name: 'with_item_positions'.
%

category: 'Grail-Setup'
method: WithItemPositionsTestCase
tearDown
	"Leave no trace of the IR arm's second import: the sys.modules key AND the
	canonical registries the load wrote (loadModuleFromPath: registers the module
	instance and its source hash, so dropping only the key leaves the fixture
	looking deployed-but-deleted and the NEXT setUp raises).  Also put the IR
	flag back to reading the env var."

	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'with_item_positions_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'with_item_positions_ir'.
	irModule := nil.
%

category: 'Grail-Private'
method: WithItemPositionsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Private'
method: WithItemPositionsTestCase
irResultAt: key
	"The same fixture answer, from the copy imported with the direct-to-IR seam
	forced on.  Loaded lazily under a SECOND module name so it cannot collide
	with setUp's text-path instance, and cleaned up by tearDown."

	irModule isNil ifTrue: [self loadIRFixture].
	^ (irModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Private'
method: WithItemPositionsTestCase
loadIRFixture
	"Import the fixture a second time with GRAIL_IR_CODEGEN forced on, leaving
	the ___irStats___ that import produced for testTheIRSeamActuallyRan to
	assert."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_item_positions_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'with_item_positions_ir'.
	irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_item_positions.py')
		name: 'with_item_positions_ir'.
%

category: 'Grail-Tests - Line'
method: WithItemPositionsTestCase
testAnInitRaiseBlamesTheManagerNotTheBody
	"Evaluating the manager EXPRESSION -- the exception never reaches __enter__.
	Reported the body's ``pass'' one line further down."

	self assert: (self resultAt: 'init_raises_line') asString equals: '[47, 47]'.
%

category: 'Grail-Tests - Line'
method: WithItemPositionsTestCase
testAnExitRaiseBlamesTheManagerNotTheBody
	"__exit__ runs AFTER the body, so ___curPos___ had drifted to the body's last
	statement -- which is why the item span has to be re-stored before the exit
	call and not only before the enter."

	self assert: (self resultAt: 'exit_raises_line') asString equals: '[63, 63]'.
%

category: 'Grail-Tests - Line'
method: WithItemPositionsTestCase
testAnEnterRaiseIsStillRight
	"REGRESSION GUARD, and the case that hid the other two: this was already
	correct BY ACCIDENT -- the body had not run, so ___curPos___ still held the
	``with'' line.  It must stay correct now that the position is deliberate."

	self assert: (self resultAt: 'enter_raises_line') asString equals: '[55, 55]'.
	self assert: (self resultAt: 'end_lineno_matches') asString
		equals: '[True, True, True]'.
%

category: 'Grail-Tests - Columns'
method: WithItemPositionsTestCase
testTheColumnsIdentifyWhichManagerFailed
	"The point of the whole exercise: in ``with Dummy(), InitRaises() as cm,
	Dummy() as d:'' the line alone cannot say which manager raised.  Storing the
	span as a literal array -- the same shape a statement stores -- gets PEP 657
	columns back out of ___pushFrameFromPos___ for free."

	self assert: (self resultAt: 'init_raises_columns') asString equals: '[22, 34]'.
%

category: 'Grail-Tests - Columns'
method: WithItemPositionsTestCase
testTheColumnsIdentifyWhichManagerFAILEDOnExitToo
	"THE CASE THIS FILE HAD THE SHAPE FOR AND DID NOT ASSERT.

	``with ExitRaises(), Dummy() as d:'' puts both managers on ONE line, so
	testAnExitRaiseBlamesTheManagerNotTheBody's [63, 63] reads the same whichever
	of the two is blamed.  The line cannot tell them apart; the columns are the
	entire point of this file, and only the INIT case had them.

	The gap was real, not theoretical.  Under GRAIL_IR_CODEGEN the IR emit blamed
	``Dummy()'' for a raise out of ExitRaises.__exit__ -- test.test_with went
	OK -> FAIL 1 on the flag-on arm of the CPython corpus while every test here
	stayed green.  Item N's block emits item N+1 RECURSIVELY, which is how the
	nest is built, so item N's own __exit__ calls are emitted after the recursion
	has re-stamped the builder with N+1's expression.  Fixed by stamping inside
	___emitIRProtocolCall___:...at: -- it cannot be stamped by the caller,
	because building the argument array is itself emission and re-stamps first.

	Enter is asserted alongside for the same reason it is asserted for lines: it
	is the case that can be right by accident."

	self assert: (self resultAt: 'exit_raises_columns') asString equals: '[13, 25]'.
	self assert: (self resultAt: 'enter_raises_columns') asString equals: '[13, 26]'.
%

category: 'Grail-Tests - Columns'
method: WithItemPositionsTestCase
testANestedFunctionKeepsTheColumnsToo
	"The same manager expression must report the same span whether it sits at
	module scope or inside a nested ``def''.  It did not: a nested function's
	frame is rebuilt by WALKING the stack, and the walk answered a line only."

	self assert: (self resultAt: 'nested_one_level') asString
		equals: '[108, 26, 38]'.
%

category: 'Grail-Tests - Columns'
method: WithItemPositionsTestCase
testTheExitCaseSurvivesTwoLevelsOfNesting
	"__exit__ raising, two ``def''s deep -- the span re-stored before the exit
	call has to survive the stack walk as well as the direct read, and the walk
	has to find the INNERMOST function rather than an enclosing one."

	self assert: (self resultAt: 'nested_two_levels') asString
		equals: '[119, 30, 42]'.
%

category: 'Grail-Tests - Columns'
method: WithItemPositionsTestCase
testAFunctionNestedInsideAMethodKeepsTheColumns
	"test_with's testExceptionLocation in miniature: the manager expressions sit
	in functions nested inside a method, which is why the module-scope case
	passing told us nothing about it."

	self assert: (self resultAt: 'nested_inside_a_method') asString
		equals: '[132, 25, 37]'.
%

category: 'Grail-Tests - Line'
method: WithItemPositionsTestCase
testASingleItemWithBlamesTheManagerNotTheBody
	"The one-item case with a body that is not ``pass''.  Every other ``with'' in
	this fixture has a ``pass'' body, and PassAst stamps no position at all --
	which is exactly why the one-item case looked correct while the multi-item
	one did not: there was nothing for a mis-stamped __exit__ to land on.  With a
	real statement in the body the drift reappears as a wrong LINE, and a line is
	what most traceback assertions read.  MEASURED on the IR path before the emit
	fix: [15, 12, 17], the ``y = 1''."

	self assert: (self resultAt: 'single_item_assign_body') asString
		equals: '[180, 13, 25]'.
%

category: 'Grail-Tests - IR'
method: WithItemPositionsTestCase
testTheIRSeamActuallyRanForTheSecondImport
	"The guard for every IR assertion below, and the reason the arm is worth
	having at all.  A forced flag is not a running seam: on 3.7.x
	___irCodegenSupported___ is false, so the flag is a no-op and the fixture
	compiles through the text path -- correct answers that say nothing about IR.
	Assert the platform's own expectation, so a 4.0 build that silently lost IR
	support cannot pass this arm either.

	fallbacks must be 0 as well: an eligible def whose IR build raised falls back
	to text, which is safe and invisible in the answers."

	| stats |
	self irResultAt: 'exit_raises_columns'.
	stats := importlib ___irStats___.
	importlib ___irCodegenSupported___
		ifTrue: [
			self assert: (stats at: #compiled) > 0
				description: 'the IR seam compiled nothing: ' , stats printString.
			self assert: (stats at: #fallbacks) equals: 0]
		ifFalse: [
			self assert: (stats at: #compiled) equals: 0
				description: 'IR is unsupported here, yet the seam compiled '
					, (stats at: #compiled) printString , ' defs'].
%

category: 'Grail-Tests - IR'
method: WithItemPositionsTestCase
testTheIRPathBlamesTheExitOnTheRightManager
	"The flag-on regression itself, now asserted where CI can see it instead of
	only in a hand-run CPython corpus.  Both managers of ``with ExitRaises(),
	Dummy() as d:'' are on line 63, so only the columns can say which was
	blamed -- IR named ``Dummy()''."

	self assert: (self irResultAt: 'exit_raises_columns') asString equals: '[13, 25]'.
	self assert: (self irResultAt: 'exit_raises_line') asString equals: '[63, 63]'.
%

category: 'Grail-Tests - IR'
method: WithItemPositionsTestCase
testTheIRPathBlamesASingleItemWithCorrectlyToo
	"The one-item case through the seam, where it was wrong on the LINE."

	self assert: (self irResultAt: 'single_item_assign_body') asString
		equals: '[180, 13, 25]'.
%

category: 'Grail-Tests - IR'
method: WithItemPositionsTestCase
testAReturnOutOfAWithReachesExitOnAThirdRoute
	"``return'' inside the body reaches __exit__ down a route of its own, and the
	two codegen paths part company there.

	IR compiles ``return'' to a real ``^'' (returnFromHome), so the exit runs
	from the ensure block, whose call site is stamped, and the answer is
	CPython's.  The TEXT path signals PythonReturn instead, and the handler
	branch that filters control-flow signals calls __exit__ with NO ___curPos___
	store of its own -- only the clean-exit branch has one -- so it still reports
	``return y'': MEASURED [24, 19, 20] against CPython's [22, 13, 25] on a
	stand-alone probe.

	A KNOWN GAP ON THE DEFAULT PATH, deliberately not pinned here.  Fixing it
	means a ___curPos___ store inside a Smalltalk block, which needs the
	textual-restore treatment (the span scan is line-granular and knows nothing
	about block nesting, so a store in a block is found by later ips in the
	ENCLOSING frame) plus the same question answered for the exception route.
	That is its own change; this test states which path is right today so the
	difference is recorded rather than discovered twice."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self assert: (self irResultAt: 'single_item_return_body') asString
		equals: '[199, 13, 25]'.
%

category: 'Grail-Tests - IR'
method: WithItemPositionsTestCase
testTheIRPathKeepsTheOtherManagerPositions
	"The rest of the table through the seam, so the stamping cannot buy the exit
	case at the expense of the enter / init ones -- and the nested cases, which
	reach their span through the stack walk rather than a direct read."

	self assert: (self irResultAt: 'init_raises_line') asString equals: '[47, 47]'.
	self assert: (self irResultAt: 'enter_raises_line') asString equals: '[55, 55]'.
	self assert: (self irResultAt: 'end_lineno_matches') asString
		equals: '[True, True, True]'.
	self assert: (self irResultAt: 'init_raises_columns') asString equals: '[22, 34]'.
	self assert: (self irResultAt: 'enter_raises_columns') asString equals: '[13, 26]'.
	self assert: (self irResultAt: 'nested_one_level') asString equals: '[108, 26, 38]'.
	self assert: (self irResultAt: 'nested_two_levels') asString equals: '[119, 30, 42]'.
	self assert: (self irResultAt: 'nested_inside_a_method') asString
		equals: '[132, 25, 37]'.
%
