! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodySourceOrderTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodySourceOrderTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodySourceOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodySourceOrderTestCase
!
! A class body runs TOP TO BOTTOM, once.  Grail compiles one STRUCTURALLY -- it
! scans for the names the body binds and emits one store per name -- and the
! statements binding no name it can see (``for'', ``while'', ``try'', ``with'',
! ``if'', a bare expression, an augmented assignment) were emitted in a pass
! AFTER all of those stores.
!
! Invisible until a loop DEFINES a name that a later attribute READS:
!
!     class Period(timedelta, Enum):
!         Period = vars()
!         for i in range(32):
!             Period['day_%d' % i] = i, 'day'
!         OneDay = day_1          -- NameError: name 'day_1' is not defined
!
! The dynamic read (NameAst's ___classBodyDynamicRead___ probe) was already in
! place and correct.  What was wrong was WHEN the loop ran.  These statements now
! emit at their own source position, through the same flush the ``global'' /
! subscript / ``del'' statements already used -- and for the same stated reason,
! that a later attribute value must see what the statement left.
!
! Also here because the fixture found it: ``with X() as c'' bound c on the class
! but was not among the class body's CONDITIONAL NAMES, so a read of c -- inside
! the with body or anywhere later -- fell through to module scope.  Loop targets
! and ``except E as e'' were both already collected; this one was missed.
!
! Drives tests/python/class_body_source_order.py.  test_enum
! TestSpecial.test_ignore.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodySourceOrderTestCase removeAllMethods.
ClassBodySourceOrderTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodySourceOrderTestCase
setUp
	"Reload tests/python/class_body_source_order.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_source_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_source_order.py')
		name: 'class_body_source_order'.
%

category: 'Grail-Private'
method: ClassBodySourceOrderTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A statement runs before what reads it'
method: ClassBodySourceOrderTestCase
testALoopDefinesWhatALaterAttributeReads
	"The shape test_enum's test_ignore is built out of: names no statement in
	the body mentions, written through vars() by a loop, then read by name."

	self assert: (self resultAt: 'loop_defines_then_read') asString equals: '(9, 5)'.
%

category: 'Grail-Tests - A statement runs before what reads it'
method: ClassBodySourceOrderTestCase
testEveryCompoundStatementRunsInItsPlace
	"``while'' / ``try'' / ``with'' / ``if'' / augmented assignment / a bare
	expression -- the whole set the trailing pass used to hold back.  Each binds
	a name that the attribute below it reads."

	self assert: (self resultAt: 'while_then_read') asString equals: '(3, 6)'.
	self assert: (self resultAt: 'try_then_read') asString equals: '''try/finally'''.
	self assert: (self resultAt: 'with_then_read') asString equals: '''entered'''.
	self assert: (self resultAt: 'if_then_read') asString equals: '''yes'''.
	self assert: (self resultAt: 'augassign_then_read') asString equals: '(42, 84)'.
	self assert: (self resultAt: 'bare_expr_then_read') asString equals: '7'.
%

category: 'Grail-Tests - Order is order, both ways'
method: ClassBodySourceOrderTestCase
testAStatementAfterAnAttributeIsNotPulledForward
	"The check that this is an INTERLEAVE and not a blanket move to the front:
	the loop appends between the two attribute appends, not before both."

	self assert: (self resultAt: 'interleaved_order') asString
		equals: '(''first'', ''loop'', ''last'')'.
%

category: 'Grail-Tests - Order is order, both ways'
method: ClassBodySourceOrderTestCase
testTheLastWriteWinsWhicheverKindItIs
	"A loop overwriting an earlier attribute, and an attribute overwriting what
	a loop left -- the same rule a pair of assignments follows.  With the loop
	pinned to the end, the second of these answered 'from-loop'."

	self assert: (self resultAt: 'loop_overwrites_attribute') asString
		equals: '''from-loop'''.
	self assert: (self resultAt: 'attribute_overwrites_loop') asString
		equals: '''from-attribute'''.
%
