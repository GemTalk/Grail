! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WithItemPositionsTestCase'
  instVarNames: #( testModule )
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

category: 'Grail-Private'
method: WithItemPositionsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
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
