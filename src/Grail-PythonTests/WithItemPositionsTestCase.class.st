Class {
	#name : 'WithItemPositionsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
WithItemPositionsTestCase >> irResultAt: key [
	"The same fixture answer, from the copy imported with the direct-to-IR seam
	forced on.  Loaded lazily under a SECOND module name so it cannot collide
	with setUp's text-path instance, and cleaned up by tearDown."

	irModule isNil ifTrue: [self loadIRFixture].
	^ (irModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Private' }
WithItemPositionsTestCase >> loadIRFixture [
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

]

{ #category : 'Grail-Private' }
WithItemPositionsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
WithItemPositionsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_item_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_item_positions.py')
		name: 'with_item_positions'.

]

{ #category : 'Grail-Setup' }
WithItemPositionsTestCase >> tearDown [
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

]

{ #category : 'Grail-Tests - Columns' }
WithItemPositionsTestCase >> testAFunctionNestedInsideAMethodKeepsTheColumns [
	"test_with's testExceptionLocation in miniature: the manager expressions sit
	in functions nested inside a method, which is why the module-scope case
	passing told us nothing about it."

	self assert: (self resultAt: 'nested_inside_a_method') asString
		equals: '[132, 25, 37]'.

]

{ #category : 'Grail-Tests - Line' }
WithItemPositionsTestCase >> testAnEnterRaiseIsStillRight [
	"REGRESSION GUARD, and the case that hid the other two: this was already
	correct BY ACCIDENT -- the body had not run, so ___curPos___ still held the
	``with'' line.  It must stay correct now that the position is deliberate."

	self assert: (self resultAt: 'enter_raises_line') asString equals: '[55, 55]'.
	self assert: (self resultAt: 'end_lineno_matches') asString
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests - Columns' }
WithItemPositionsTestCase >> testANestedFunctionKeepsTheColumnsToo [
	"The same manager expression must report the same span whether it sits at
	module scope or inside a nested ``def''.  It did not: a nested function's
	frame is rebuilt by WALKING the stack, and the walk answered a line only."

	self assert: (self resultAt: 'nested_one_level') asString
		equals: '[108, 26, 38]'.

]

{ #category : 'Grail-Tests - Line' }
WithItemPositionsTestCase >> testAnExitRaiseBlamesTheManagerNotTheBody [
	"__exit__ runs AFTER the body, so ___curPos___ had drifted to the body's last
	statement -- which is why the item span has to be re-stored before the exit
	call and not only before the enter."

	self assert: (self resultAt: 'exit_raises_line') asString equals: '[63, 63]'.

]

{ #category : 'Grail-Tests - Line' }
WithItemPositionsTestCase >> testAnInitRaiseBlamesTheManagerNotTheBody [
	"Evaluating the manager EXPRESSION -- the exception never reaches __enter__.
	Reported the body's ``pass'' one line further down."

	self assert: (self resultAt: 'init_raises_line') asString equals: '[47, 47]'.

]

{ #category : 'Grail-Tests - IR' }
WithItemPositionsTestCase >> testAReturnOutOfAWithReachesExitOnAThirdRoute [
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

]

{ #category : 'Grail-Tests - Line' }
WithItemPositionsTestCase >> testASingleItemWithBlamesTheManagerNotTheBody [
	"The one-item case with a body that is not ``pass''.  Every other ``with'' in
	this fixture has a ``pass'' body, and PassAst stamps no position at all --
	which is exactly why the one-item case looked correct while the multi-item
	one did not: there was nothing for a mis-stamped __exit__ to land on.  With a
	real statement in the body the drift reappears as a wrong LINE, and a line is
	what most traceback assertions read.  MEASURED on the IR path before the emit
	fix: [15, 12, 17], the ``y = 1''."

	self assert: (self resultAt: 'single_item_assign_body') asString
		equals: '[180, 13, 25]'.

]

{ #category : 'Grail-Tests - Columns' }
WithItemPositionsTestCase >> testTheColumnsIdentifyWhichManagerFailed [
	"The point of the whole exercise: in ``with Dummy(), InitRaises() as cm,
	Dummy() as d:'' the line alone cannot say which manager raised.  Storing the
	span as a literal array -- the same shape a statement stores -- gets PEP 657
	columns back out of ___pushFrameFromPos___ for free."

	self assert: (self resultAt: 'init_raises_columns') asString equals: '[22, 34]'.

]

{ #category : 'Grail-Tests - Columns' }
WithItemPositionsTestCase >> testTheColumnsIdentifyWhichManagerFAILEDOnExitToo [
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

]

{ #category : 'Grail-Tests - Columns' }
WithItemPositionsTestCase >> testTheExitCaseSurvivesTwoLevelsOfNesting [
	"__exit__ raising, two ``def''s deep -- the span re-stored before the exit
	call has to survive the stack walk as well as the direct read, and the walk
	has to find the INNERMOST function rather than an enclosing one."

	self assert: (self resultAt: 'nested_two_levels') asString
		equals: '[119, 30, 42]'.

]

{ #category : 'Grail-Tests - IR' }
WithItemPositionsTestCase >> testTheIRPathBlamesASingleItemWithCorrectlyToo [
	"The one-item case through the seam, where it was wrong on the LINE."

	self assert: (self irResultAt: 'single_item_assign_body') asString
		equals: '[180, 13, 25]'.

]

{ #category : 'Grail-Tests - IR' }
WithItemPositionsTestCase >> testTheIRPathBlamesTheExitOnTheRightManager [
	"The flag-on regression itself, now asserted where CI can see it instead of
	only in a hand-run CPython corpus.  Both managers of ``with ExitRaises(),
	Dummy() as d:'' are on line 63, so only the columns can say which was
	blamed -- IR named ``Dummy()''."

	self assert: (self irResultAt: 'exit_raises_columns') asString equals: '[13, 25]'.
	self assert: (self irResultAt: 'exit_raises_line') asString equals: '[63, 63]'.

]

{ #category : 'Grail-Tests - IR' }
WithItemPositionsTestCase >> testTheIRPathKeepsTheOtherManagerPositions [
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

]

{ #category : 'Grail-Tests - IR' }
WithItemPositionsTestCase >> testTheIRSeamActuallyRanForTheSecondImport [
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

]
