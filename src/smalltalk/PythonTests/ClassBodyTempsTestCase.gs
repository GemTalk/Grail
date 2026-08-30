! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyTempsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyTempsTestCase'
  instVarNames: #( module probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyTempsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyTempsTestCase
!
! A class body never declared its codegen temporaries.
!
! Grail gives a class body a scope of its own -- a BlockAst, the same kind a
! function body gets -- and BlockAst >> allocateTemp hands out the ``___t_N''
! helper temps that codegen needs to cache an operand (a chained comparison's
! shared middle term, the temps an ``in'' link wants).  But only BlockAst >>
! printSmalltalkOn: ever DECLARES them, and ClassDefAst never calls it: it
! emits the body's statements one at a time, inlined into the enclosing
! method's block.  So the declaration was simply absent, and every class-body
! construct needing a temp emitted a reference to an undefined symbol.
!
! The cost of that was out of all proportion to the shape: a Smalltalk
! CompileError (error 1001) is not a Python exception, so ``except
! BaseException'' cannot see it and it takes down the WHOLE module compile --
! and, in a probe that imports several modules, the whole process.  ``import
! urllib3'' and ``import kaggle'' both died here and nowhere else, on
!
!     if sys.version_info < (3, 11, 9) or ((3, 12) <= sys.version_info < (3, 12, 3)):
!
! in urllib3/connection.py's HTTPConnection body.
!
! Reported as a chained-comparison bug, which it is not.  The measurement that
! settles it is the WALRUS: ``class C: z = (n := 7) + n'' failed on ``n'' -- a
! name the programmer wrote, not a generated one -- while ``1 < x'' (a
! comparison needing no cache) compiled, and ``1 < x < 10'' one line further
! in, inside a method, compiled too.  The scope is what is broken; the
! constructs are just the ones that ask it for anything.
!
! Two fixes, because there are two ways a class-body scope can want a name:
!
!   * ClassDefAst >> ___classBodyHelperTemps___ collects the body's ``___t_N''
!     names and declares them on the block that wraps the class emit.  That
!     block existed already for a module-scope class (it carries the class
!     temp); it is now opened for the temps alone when the class is nested in
!     a function or in another class body, which failed identically.
!
!   * a WALRUS binds a real Python name, and PEP 572 puts it in the scope
!     containing the expression -- for a class body that is the class
!     NAMESPACE, so CPython leaves C.n beside the attribute it fed.  The store
!     routes through ___classBodyDefinitionalStore___ (which answers the VALUE,
!     so it composes inside a larger expression) and the name joins
!     ___classBodyConditionalNames___ so a later class-body read finds it.
!     Conditional is the right home: whether a walrus ran is a runtime fact --
!     ``False and (never := 1)'' binds nothing at all.
!
! The fixture is tests/python/class_body_temps.py, which carries its own
! CPython-measured EXPECTED table and is self-running under ``python3'', so
! scripts/check_python_fixtures.sh holds the expectations honest.
! testGrailAgreesWithTheCPythonTable below asserts the whole table at once;
! the named tests exist so a failure says WHICH shape broke.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyTempsTestCase removeAllMethods.
ClassBodyTempsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyTempsTestCase
setUp
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
%

category: 'Grail-Private'
method: ClassBodyTempsTestCase
reprAt: aKey
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

! ---- the blanket check ------------------------------------------------------

category: 'Grail-Tests - Whole Table'
method: ClassBodyTempsTestCase
testGrailAgreesWithTheCPythonTable
	"The fixture's own diffs() compares every observation against the
	EXPECTED table measured under CPython 3.13, so a new entry added to the
	fixture is covered here without a new SUnit method.  Asserted on the
	repr of the key list, so a failure names the shapes that diverged."

	self assert: (module @env1:diffs) @env1:__repr__ @env0:asString equals: '[]'.
%

! ---- ___t_N: the generated temp ---------------------------------------------

category: 'Grail-Tests - Chained Comparison'
method: ClassBodyTempsTestCase
testAChainedComparisonCompilesInAClassBody
	"The minimal repro.  ``class C: x = 5; y = 1 < x < 10'' was CompileError
	1001, undefined symbol ___t_1 -- and took the enclosing module with it."

	self assert: (self reprAt: 'simple') equals: 'True'.
	self assert: (self reprAt: 'from_globals') equals: 'True'.
%

category: 'Grail-Tests - Chained Comparison'
method: ClassBodyTempsTestCase
testAnUnchainedComparisonWasNeverBroken
	"The control that localises the defect: a comparison with ONE link needs
	no cached operand, so it compiled before the fix and must still."

	self assert: (self reprAt: 'unchained') equals: 'True'.
%

category: 'Grail-Tests - Chained Comparison'
method: ClassBodyTempsTestCase
testMembershipLinksAllocateTheirOwnTemps
	"``in'' and ``not in'' links take a SECOND temp each on top of the shared
	operand cache (CompareAst >> setParent:), so they are a distinct way to
	reach the same missing declaration."

	self assert: (self reprAt: 'membership') equals: 'True'.
	self assert: (self reprAt: 'negated') equals: 'True'.
%

category: 'Grail-Tests - Chained Comparison'
method: ClassBodyTempsTestCase
testThreeLinksNeedTwoTemps
	"More than one cache in one expression -- the declaration list has to
	carry all of them, not just the first."

	self assert: (self reprAt: 'longer') equals: 'True'.
%

category: 'Grail-Tests - Chained Comparison'
method: ClassBodyTempsTestCase
testAMethodBodyWasAlwaysFine
	"The measurement that made this a SCOPE bug rather than a lowering one:
	the same expression one line further in, inside a method, compiled before
	the fix -- a method's temps come from its own BlockAst, which IS asked to
	declare them."

	self assert: (self reprAt: 'method') equals: 'True'.
%

! ---- everything that can CONTAIN a chained comparison ------------------------

category: 'Grail-Tests - Containing Forms'
method: ClassBodyTempsTestCase
testComprehensionFiltersInAClassBody
	"A comprehension in a class body has no scope of its own in Grail's emit
	-- its filter's temp lands on the CLASS body -- so all four forms failed
	while the same comprehension with no chained filter worked."

	self assert: (self reprAt: 'listed') equals: '[1, 2]'.
	self assert: (self reprAt: 'setted') equals: '[1, 2]'.
	self assert: (self reprAt: 'dicted') equals: '[(1, 2), (2, 4)]'.
	self assert: (self reprAt: 'genned') equals: '[1, 2]'.
%

category: 'Grail-Tests - Containing Forms'
method: ClassBodyTempsTestCase
testConditionalExpressionInAClassBody
	"``a if 1 < x < 10 else b'' -- the same temp, one level down."

	self assert: (self reprAt: 'ternary') equals: '''in-range'''.
	self assert: (self reprAt: 'doubled') equals: 'True'.
%

category: 'Grail-Tests - Containing Forms'
method: ClassBodyTempsTestCase
testANestedClassBodyHasTheSameScope
	"A class nested in a class body never reaches the module-binding block
	that used to be the only place a class-body temp could be declared, so
	the wrapper is now opened for the temps alone."

	self assert: (self reprAt: 'nested_ok') equals: 'True'.
%

category: 'Grail-Tests - Containing Forms'
method: ClassBodyTempsTestCase
testAClassInsideAFunctionHasTheSameScope
	"The third emit route -- no module binding, no enclosing class -- and it
	failed identically."

	self assert: (self reprAt: 'local_ok') equals: 'True'.
	self assert: (self reprAt: 'local_vals') equals: '[3, 4]'.
%

! ---- the walrus: a USER-written name -----------------------------------------

category: 'Grail-Tests - Walrus'
method: ClassBodyTempsTestCase
testAWalrusBindsInTheClassNamespace
	"The proof that the comparison lowering was innocent: this failed on
	``n'', not on a generated ___t_N.  PEP 572 binds the target in the scope
	containing the expression, and CPython leaves BOTH C.n and C.z behind."

	self assert: (self reprAt: 'walrus_z') equals: '14'.
	self assert: (self reprAt: 'walrus_n') equals: '7'.
%

category: 'Grail-Tests - Walrus'
method: ClassBodyTempsTestCase
testALaterStatementReadsTheWalrusTarget
	"``echo = n * 2'' after ``z = (n := 7) + n''.  The read side needed the
	name in ___classBodyConditionalNames___; without it the store landed and
	the next line raised NameError, which is how this looked in a class-body
	``for'' even before the compile error was fixed."

	self assert: (self reprAt: 'walrus_echo') equals: '14'.
%

category: 'Grail-Tests - Walrus'
method: ClassBodyTempsTestCase
testAWalrusOnADeadBranchBindsNothing
	"``False and (never := 1)'' never evaluates the walrus, so CPython leaves
	no attribute at all -- which is exactly why the target belongs among the
	CONDITIONAL names rather than the ordinary attributes."

	self assert: (self reprAt: 'walrus_guarded') equals: 'False'.
	self assert: (self reprAt: 'walrus_has_never') equals: 'False'.
%

category: 'Grail-Tests - Walrus'
method: ClassBodyTempsTestCase
testAWalrusInsideAClassBodyCompoundStatement
	"A class-body ``for'' / ``if'' already routed its bindings through the
	definitional store, so the STORE half of a walrus there compiled -- and
	then the read raised NameError.  Both halves now agree."

	self assert: (self reprAt: 'walrus_looped') equals: '6'.
	self assert: (self reprAt: 'walrus_m') equals: '3'.
	self assert: (self reprAt: 'walrus_branched') equals: '40'.
	self assert: (self reprAt: 'walrus_flag') equals: '4'.
%

set compile_env: 0
