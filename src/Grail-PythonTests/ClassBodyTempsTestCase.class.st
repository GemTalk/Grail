Class {
	#name : 'ClassBodyTempsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'module',
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyTempsTestCase >> reprAt: aKey [
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
ClassBodyTempsTestCase >> setUp [
	"Reload tests/python/class_body_temps.py fresh each test.  The classes are
	built once at import, so every assertion below reads that construction --
	which is the point: the defect was at class-BUILD time, and before the fix
	this import did not complete at all."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_temps' ifAbsent: [].
	module := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_temps.py')
		name: 'class_body_temps'.
	probe := module @env1:probe.

]

{ #category : 'Grail-Tests - Chained Comparison' }
ClassBodyTempsTestCase >> testAChainedComparisonCompilesInAClassBody [
	"The minimal repro.  ``class C: x = 5; y = 1 < x < 10'' was CompileError
	1001, undefined symbol ___t_1 -- and took the enclosing module with it."

	self assert: (self reprAt: 'simple') equals: 'True'.
	self assert: (self reprAt: 'from_globals') equals: 'True'.

]

{ #category : 'Grail-Tests - Containing Forms' }
ClassBodyTempsTestCase >> testAClassInsideAFunctionHasTheSameScope [
	"The third emit route -- no module binding, no enclosing class -- and it
	failed identically."

	self assert: (self reprAt: 'local_ok') equals: 'True'.
	self assert: (self reprAt: 'local_vals') equals: '[3, 4]'.

]

{ #category : 'Grail-Tests - Walrus' }
ClassBodyTempsTestCase >> testALaterStatementReadsTheWalrusTarget [
	"``echo = n * 2'' after ``z = (n := 7) + n''.  The read side needed the
	name in ___classBodyConditionalNames___; without it the store landed and
	the next line raised NameError, which is how this looked in a class-body
	``for'' even before the compile error was fixed."

	self assert: (self reprAt: 'walrus_echo') equals: '14'.

]

{ #category : 'Grail-Tests - Chained Comparison' }
ClassBodyTempsTestCase >> testAMethodBodyWasAlwaysFine [
	"The measurement that made this a SCOPE bug rather than a lowering one:
	the same expression one line further in, inside a method, compiled before
	the fix -- a method's temps come from its own BlockAst, which IS asked to
	declare them."

	self assert: (self reprAt: 'method') equals: 'True'.

]

{ #category : 'Grail-Tests - Containing Forms' }
ClassBodyTempsTestCase >> testANestedClassBodyHasTheSameScope [
	"A class nested in a class body never reaches the module-binding block
	that used to be the only place a class-body temp could be declared, so
	the wrapper is now opened for the temps alone."

	self assert: (self reprAt: 'nested_ok') equals: 'True'.

]

{ #category : 'Grail-Tests - Chained Comparison' }
ClassBodyTempsTestCase >> testAnUnchainedComparisonWasNeverBroken [
	"The control that localises the defect: a comparison with ONE link needs
	no cached operand, so it compiled before the fix and must still."

	self assert: (self reprAt: 'unchained') equals: 'True'.

]

{ #category : 'Grail-Tests - Walrus' }
ClassBodyTempsTestCase >> testAWalrusBindsInTheClassNamespace [
	"The proof that the comparison lowering was innocent: this failed on
	``n'', not on a generated ___t_N.  PEP 572 binds the target in the scope
	containing the expression, and CPython leaves BOTH C.n and C.z behind."

	self assert: (self reprAt: 'walrus_z') equals: '14'.
	self assert: (self reprAt: 'walrus_n') equals: '7'.

]

{ #category : 'Grail-Tests - Walrus' }
ClassBodyTempsTestCase >> testAWalrusInsideAClassBodyCompoundStatement [
	"A class-body ``for'' / ``if'' already routed its bindings through the
	definitional store, so the STORE half of a walrus there compiled -- and
	then the read raised NameError.  Both halves now agree."

	self assert: (self reprAt: 'walrus_looped') equals: '6'.
	self assert: (self reprAt: 'walrus_m') equals: '3'.
	self assert: (self reprAt: 'walrus_branched') equals: '40'.
	self assert: (self reprAt: 'walrus_flag') equals: '4'.

]

{ #category : 'Grail-Tests - Walrus' }
ClassBodyTempsTestCase >> testAWalrusOnADeadBranchBindsNothing [
	"``False and (never := 1)'' never evaluates the walrus, so CPython leaves
	no attribute at all -- which is exactly why the target belongs among the
	CONDITIONAL names rather than the ordinary attributes."

	self assert: (self reprAt: 'walrus_guarded') equals: 'False'.
	self assert: (self reprAt: 'walrus_has_never') equals: 'False'.

]

{ #category : 'Grail-Tests - Containing Forms' }
ClassBodyTempsTestCase >> testComprehensionFiltersInAClassBody [
	"A comprehension in a class body has no scope of its own in Grail's emit
	-- its filter's temp lands on the CLASS body -- so all four forms failed
	while the same comprehension with no chained filter worked."

	self assert: (self reprAt: 'listed') equals: '[1, 2]'.
	self assert: (self reprAt: 'setted') equals: '[1, 2]'.
	self assert: (self reprAt: 'dicted') equals: '[(1, 2), (2, 4)]'.
	self assert: (self reprAt: 'genned') equals: '[1, 2]'.

]

{ #category : 'Grail-Tests - Containing Forms' }
ClassBodyTempsTestCase >> testConditionalExpressionInAClassBody [
	"``a if 1 < x < 10 else b'' -- the same temp, one level down."

	self assert: (self reprAt: 'ternary') equals: '''in-range'''.
	self assert: (self reprAt: 'doubled') equals: 'True'.

]

{ #category : 'Grail-Tests - Whole Table' }
ClassBodyTempsTestCase >> testGrailAgreesWithTheCPythonTable [
	"The fixture's own diffs() compares every observation against the
	EXPECTED table measured under CPython 3.13, so a new entry added to the
	fixture is covered here without a new SUnit method.  Asserted on the
	repr of the key list, so a failure names the shapes that diverged."

	self assert: (module @env1:diffs) @env1:__repr__ @env0:asString equals: '[]'.

]

{ #category : 'Grail-Tests - Chained Comparison' }
ClassBodyTempsTestCase >> testMembershipLinksAllocateTheirOwnTemps [
	"``in'' and ``not in'' links take a SECOND temp each on top of the shared
	operand cache (CompareAst >> setParent:), so they are a distinct way to
	reach the same missing declaration."

	self assert: (self reprAt: 'membership') equals: 'True'.
	self assert: (self reprAt: 'negated') equals: 'True'.

]

{ #category : 'Grail-Tests - Chained Comparison' }
ClassBodyTempsTestCase >> testThreeLinksNeedTwoTemps [
	"More than one cache in one expression -- the declaration list has to
	carry all of them, not just the first."

	self assert: (self reprAt: 'longer') equals: 'True'.

]
