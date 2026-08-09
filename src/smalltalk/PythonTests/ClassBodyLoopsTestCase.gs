! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyLoopsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyLoopsTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyLoopsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyLoopsTestCase
!
! ``try'' / ``for'' / ``while'' / ``with'' in a class body.
!
! Grail compiles a class body STRUCTURALLY: each statement announces the
! attributes it contributes (StatementAst >> classBodyAttributePairs) and
! ClassDefAst materialises them as classInstVars plus accessor pairs.  These
! four statement kinds announced nothing, so codegen DROPPED them whole --
! not just their bindings, the statements themselves.  Nothing raised:
!
!     class C:
!         try:
!             x = 1          "<- gone, and no error anywhere"
!         except ValueError:
!             pass
!
! C simply had no ``x'', and the first symptom was an AttributeError far from
! the definition.  Worse than a missing attribute, the statement's SIDE
! EFFECTS were skipped too -- a class-body ``with'' never entered its context
! manager.  test_enum's TestEnumDict.test_enum_dict_in_metaclass was passing
! only because of that: its ``with self.assertRaises(TypeError):'' body never
! ran, so the assertion never fired.
!
! The companion case, ``if'' in a class body, is ClassBodyConditionalTestCase
! -- whose header used to record these four as "still dropped".
!
! The fix emits each through its OWN codegen (rather than re-deriving
! try/except/finally and loop emit), with one compile-context flag,
! CallAst >> classBodyRuntimeClass, set for the duration.  While it is set, a
! bare-NAME binding routes to ___classBodyDefinitionalStore___ -- the same
! runtime accessor-vs-holder dispatch a class-body ``if'' branch uses -- instead
! of ``x := v'', which in class-build code is an undefined symbol.
!
! Four binding forms had to agree, and each was a separate emit site:
!   * AssignAst          -- ``x = 1'', including chained ``a = b = 1''
!   * ForAst             -- the loop VARIABLE, which CPython leaves bound
!   * FunctionDefAst     -- a ``def'', which needs its own block temp first
!   * AbstractNode       -- ``except ... as e'' and ``with ... as x'', which
!                           already shared one seam with the module-scope route
!
! The scope test (___inClassBodyRuntimeScope___) is what keeps this honest: the
! flag stays set through any def nested INSIDE the statement, and there a bare
! name is an ordinary local -- see testANestedDefKeepsItsOwnLocals.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyLoopsTestCase removeAllMethods.
ClassBodyLoopsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyLoopsTestCase
setUp
	"Reload tests/python/class_body_loops.py fresh each test and keep its
	single probe() dict -- the classes are built once at import, so every
	assertion below is a read of that one construction."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_loops' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_loops.py')
		name: 'class_body_loops'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: ClassBodyLoopsTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- for / while ---

category: 'Grail-Tests - Loops'
method: ClassBodyLoopsTestCase
testForLoopBindsWhatItsBodyAssigns
	"The headline case for ``for'': test_enum's Period generates its members
	with a class-body loop, so every one of them was missing."

	self assert: (self at: 'looped_last') equals: 20.
%

category: 'Grail-Tests - Loops'
method: ClassBodyLoopsTestCase
testForLoopVariableItselfSurvives
	"CPython leaves the loop variable bound on the class after the loop
	drains -- it is an ordinary binding in the class namespace, not a
	private index.  ForAst emits the per-iteration target store itself, so
	it needed the routing separately from the body's assignments."

	self assert: (self at: 'looped_i') equals: 2.
%

category: 'Grail-Tests - Loops'
method: ClassBodyLoopsTestCase
testWhileLoopAccumulatesAcrossIterations
	"Both the condition variable and the accumulator are read AND written
	each iteration, so the store and the load have to agree on the same
	home."

	self assert: (self at: 'whiled_n') equals: 3.
	self assert: (self at: 'whiled_total') equals: 6.
%

! --- try, in every clause position ---

category: 'Grail-Tests - Try'
method: ClassBodyLoopsTestCase
testTryBodyBindsAndReadsEarlierAttributes
	"``ok = base + 1'' both writes a new attribute and reads one bound
	unconditionally earlier in the body -- the read must find the accessor
	pair, not fall through to module scope."

	self assert: (self at: 'tried_ok') equals: 2.
%

category: 'Grail-Tests - Try'
method: ClassBodyLoopsTestCase
testTryBodyStillReachesModuleGlobals
	"A name the class does not bind is still a module global from inside the
	statement -- the conditional-name read falls back to module scope when
	the per-class slot is nil."

	self assert: (self at: 'tried_reads_global') @env0:asString
		equals: 'module-global-fallback'.
%

category: 'Grail-Tests - Try'
method: ClassBodyLoopsTestCase
testElseAndFinallyClausesBindToo
	"``else'' and ``finally'' are separate suites on TryAst; each is emitted
	through the same routing, so a binding in either lands on the class."

	self assert: (self at: 'tried_else') @env0:asString equals: 'yes'.
	self assert: (self at: 'tried_finally') @env0:asString equals: 'yes'.
%

category: 'Grail-Tests - Try'
method: ClassBodyLoopsTestCase
testExceptAsNameIsBoundAndReadable
	"``except ValueError as e'' binds e through the seam AbstractNode shares
	with the module-scope route, and the handler body then READS it -- so
	this pins the store and the load together."

	self assert: (self at: 'tried_caught') @env0:asString equals: 'boom'.
%

category: 'Grail-Tests - Try'
method: ClassBodyLoopsTestCase
testAnUntakenHandlerBindsNothing
	"The whole point of the definitional store: whether a binding happened
	is a RUNTIME fact.  The except clause never ran, so its attribute must
	be absent -- not present-and-nil."

	self deny: (self at: 'has_unreached') == true.
%

! --- def forms inside a try ---

category: 'Grail-Tests - Def Forms'
method: ClassBodyLoopsTestCase
testGuardedInstanceMethodBindsTheReceiver
	"A def inside the statement is emitted as a VALUE into its own block
	temp, then stored -- it cannot become a real Smalltalk method, since
	whether it exists at all is a runtime fact.  A plain function in the
	store binds the receiver on an instance read, as CPython does."

	self assert: (self at: 'in_try') @env0:asString equals: 'in_try:Tried:1'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyLoopsTestCase
testGuardedStaticMethodNeverBinds
	"@staticmethod reaches codegen re-classed by the parser rather than as a
	runtime decorator, so the emit has to apply PyStaticMethod itself --
	otherwise the plain function would bind the receiver and pass it as x."

	self assert: (self at: 'static_via_instance') @env0:asString
		equals: 'static_in_try:2'.
	self assert: (self at: 'static_via_class') @env0:asString
		equals: 'static_in_try:2'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyLoopsTestCase
testGuardedClassMethodBindsTheOwner
	"Through an instance, through the class, and through a SUBCLASS -- the
	last is what distinguishes binding the owner from binding the defining
	class."

	self assert: (self at: 'cls_via_instance') @env0:asString
		equals: 'cls_in_try:Tried:3'.
	self assert: (self at: 'cls_via_class') @env0:asString
		equals: 'cls_in_try:Tried:3'.
	self assert: (self at: 'cls_via_subclass') @env0:asString
		equals: 'cls_in_try:Sub:3'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyLoopsTestCase
testGuardedMethodIsInherited
	"The store is a real class attribute, so a subclass finds it through the
	normal lookup chain."

	self assert: (self at: 'inherited') @env0:asString equals: 'in_try:Sub:4'.
%

! --- with ---

category: 'Grail-Tests - With'
method: ClassBodyLoopsTestCase
testWithBindsItsBodyAndItsAsTarget
	"``with Ctx() as handle:'' binds both the as-target and whatever the
	body assigns."

	self assert: (self at: 'withed_inside') @env0:asString equals: 'ran'.
	self assert: (self at: 'withed_handle') @env0:asString equals: 'entered'.
%

category: 'Grail-Tests - With'
method: ClassBodyLoopsTestCase
testWithActuallyEntersTheContextManager
	"The sharpest statement of what dropping the statement really cost: not
	a missing attribute but a SKIPPED SIDE EFFECT.  __enter__/__exit__ never
	ran, which is why test_enum's assertRaises-in-a-class-body test passed
	while asserting nothing."

	self assert: (self at: 'withed_log') @env0:size equals: 2.
	self assert: ((self at: 'withed_log') @env1:__getitem__: 0) @env0:asString
		equals: 'enter'.
	self assert: ((self at: 'withed_log') @env1:__getitem__: 1) @env0:asString
		equals: 'exit'.
%

! --- nesting, both directions ---

category: 'Grail-Tests - Nesting'
method: ClassBodyLoopsTestCase
testTryNestedInsideAClassBodyIf
	"The ``if'' branch emitter honours only the forms it knows, so it had to
	learn this one too -- otherwise ``if flag: try: ...'' stayed dropped
	even after the top-level case worked."

	self assert: (self at: 'try_in_if') @env0:asString equals: 'yes'.
%

category: 'Grail-Tests - Nesting'
method: ClassBodyLoopsTestCase
testIfAndForNestedInsideAClassBodyTry
	"The other direction: because the statement is emitted through its own
	codegen, anything legal inside it works without further cases."

	self assert: (self at: 'if_in_try') @env0:asString equals: 'yes'.
	self assert: (self at: 'for_in_try') equals: 7.
%

! --- scoping ---

category: 'Grail-Tests - Scoping'
method: ClassBodyLoopsTestCase
testANestedDefKeepsItsOwnLocals
	"The routing flag stays set for the WHOLE statement emit, nested defs
	included, so the scope walk is the only thing stopping a method's local
	from being hoisted into the class namespace.  Both halves matter: the
	local must not leak, and the method must still work."

	self deny: (self at: 'not_hoisted') == true.
	self assert: (self at: 'method_still_works') @env0:asString equals: 'local'.
%
