! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyConditionalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyConditionalTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyConditionalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyConditionalTestCase
!
! ``def'' inside a class-body ``if''.
!
! Grail compiles a class body STRUCTURALLY -- each def becomes a real
! Smalltalk method on the generated class -- rather than executing it as a
! suite the way CPython does.  A conditional def cannot take that route: its
! existence is a runtime fact, and both branches of one ``if'' would install
! the same selector with whichever emitted last winning.  So the whole form
! was dropped, silently: the class simply had no such attribute, and the only
! symptom was an AttributeError far from the definition.
!
! ClassDefAst >> emitClassBodyIfDef:on: emits it as a VALUE instead -- the
! nested-def block form, stored in the per-class dynamic attr store that the
! guarded ASSIGNMENT case (which did already work) has always used.  A plain
! function there binds the receiver on an instance read and comes back raw on
! a class read, which is what CPython does with a function in a class
! namespace.  @staticmethod / @classmethod arrive re-classed by the parser
! rather than carrying a runtime decorator, so the wrapper that would have
! been applied structurally is applied here instead.
!
! Two consequences worth pinning, both covered below:
!   * ``self'' inside such a def is the transported ``_self'' temp, NOT the
!     Smalltalk receiver -- CallAst >> isSelfReference: has to answer false
!     for the whole emit window or the body reads the enclosing MODULE.
!   * a name bound earlier in the same branch has no accessor pair, so
!     NameAst reads it from the dynamic store, falling back to the module
!     global when the slot is nil (the branch did not run) -- which is what
!     Python's class-body lookup does once the class namespace comes up empty.
!
! No longer dropped, and covered by ClassBodyLoopsTestCase instead:
! ``for'' / ``while'' / ``try'' / ``with'' in a class body, which never had
! even the assignment half.  Those four are emitted through their OWN codegen
! with bare-name bindings routed to the same definitional store used here --
! including inside an ``if'' branch, which this emitter now delegates.
!
! The class emit used to run in PHASES (all attribute values, then the ``if''
! statements), so an attribute whose value READ a name a later branch rebinds
! saw the pre-branch value -- pinned here for a long time as a known divergence.
! The body now emits in SOURCE ORDER, which is what CPython does; see
! testAReadAfterTheBranchSeesWhatTheBranchBound and ClassDefAst >>
! ___classBodyOrderedRuntimeStatements___.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyConditionalTestCase removeAllMethods.
ClassBodyConditionalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyConditionalTestCase
setUp
	"Reload tests/python/class_body_conditional.py fresh each test and keep
	its single probe() dict -- the class is built once at import, so every
	assertion below is a read of that one construction."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_conditional' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_conditional.py')
		name: 'class_body_conditional'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: ClassBodyConditionalTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the def forms ---

category: 'Grail-Tests - Def Forms'
method: ClassBodyConditionalTestCase
testGuardedInstanceMethodBindsTheReceiver
	"The headline case, and the one that hid a second bug: emitted as a
	block, ``self'' is a transported temp, so a body reference to it read
	the enclosing MODULE instance until isSelfReference: was scoped."

	self assert: (self at: 'inst') @env0:asString equals: 'inst:Conditional:1'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyConditionalTestCase
testGuardedStaticMethodNeverBinds
	"@staticmethod reaches codegen re-classed by the parser, not as a
	runtime decorator, so the emit has to wrap it in PyStaticMethod itself
	-- otherwise the plain function in the dynamic store would bind the
	receiver on the instance read and pass it as x."

	self assert: (self at: 'static_via_instance') @env0:asString equals: 'static:2'.
	self assert: (self at: 'static_via_class') @env0:asString equals: 'static:2'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyConditionalTestCase
testGuardedClassMethodBindsTheOwner
	"Reached through an instance, through the class, and through a
	SUBCLASS -- the last is what distinguishes binding the owner from
	binding the defining class."

	self assert: (self at: 'cls_via_instance') @env0:asString equals: 'cls:Conditional:3'.
	self assert: (self at: 'cls_via_class') @env0:asString equals: 'cls:Conditional:3'.
	self assert: (self at: 'cls_via_subclass') @env0:asString equals: 'cls:Sub:3'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyConditionalTestCase
testGuardedDefTakesItsDecorators
	"A genuine runtime decorator still applies: FunctionDefAst's own
	decorator chain rebinds the block temp before the store, so nothing
	special is needed here -- this pins that it stays that way."

	self assert: (self at: 'decorated') @env0:asString equals: 'deco(decorated)'.
%

category: 'Grail-Tests - Def Forms'
method: ClassBodyConditionalTestCase
testGuardedDefIsInherited
	"It lands in the per-class dynamic store, which the attribute-load path
	walks up the class chain -- so a subclass sees it."

	self assert: (self at: 'inherited') @env0:asString equals: 'inst:Sub:4'.
%

! --- which branch ran ---

category: 'Grail-Tests - Branches'
method: ClassBodyConditionalTestCase
testTheTakenBranchWins
	"``if flag:'' defines inst_meth one way and ``else:'' another.  Emitting
	both as methods would have installed one selector twice."

	self assert: (self at: 'has_inst_meth') equals: true.
	self assert: (self at: 'inst') @env0:asString equals: 'inst:Conditional:1'.
%

category: 'Grail-Tests - Branches'
method: ClassBodyConditionalTestCase
testAnUntakenBranchDefinesNothing
	self assert: (self at: 'has_not_taken') equals: false.
%

category: 'Grail-Tests - Branches'
method: ClassBodyConditionalTestCase
testTheElseBranchDefines
	self assert: (self at: 'else_meth') @env0:asString equals: 'else_meth'.
%

! --- name resolution inside the branch ---

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testABranchNameIsVisibleLaterInTheSameBranch
	"``marker = 'yes''' then ``echo = marker''.  The name has no accessor
	pair -- it is in the dynamic store -- so NameAst needs the conditional-
	name set to know where to read it.  test_functools' TestLRUC does this
	with ``module = c_functools'' and then ``@module.lru_cache()''."

	self assert: (self at: 'echo') @env0:asString equals: 'yes'.
%

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testAnUnboundNameFallsBackToTheModuleGlobal
	"``from_global = helper'' where helper is a module global, not a class
	attribute.  The dynamic-store read answers nil and the emit falls
	through -- matching Python, whose class-body lookup consults the
	enclosing scope once the class namespace comes up empty."

	self assert: (self at: 'from_global') @env0:asString
		equals: 'module-global-helper'.
%

! --- no collateral damage ---

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testAnUnguardedDefStillCompilesAsAMethod
	"The structural path is untouched for everything outside an ``if''."

	self assert: (self at: 'unconditional') @env0:asString equals: 'unconditional'.
%

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testABranchOverwritesAnUnconditionalBinding
	"``both = 1'' then ``if flag: both = 2''.  A name assigned anywhere
	unconditionally in the body gets an accessor pair (a real classInstVar);
	a name bound only in a branch gets a dynInstVars entry.  A conditional
	binding cannot know at emit time which it faces, and writing to the
	wrong one is not a near-miss: ___pyAttrLoad___ consults the accessor
	BEFORE the holder, so storing 2 in the holder left the read answering
	the 1 it was supposed to replace.  Hence
	___classBodyDefinitionalStore___, which asks.

	Nothing in the vendored corpus binds a name both ways, so this test is
	the only thing standing between that emit and a silent wrong answer."

	self assert: (self at: 'both') equals: 2.
%

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testAnUnrunBranchLeavesTheUnconditionalBindingAlone
	"The other half: ``not_overridden = 10'' with an ``if other:'' branch
	that does not run.  Nothing is stored, so the accessor value stands --
	and ``kept = not_overridden'' reads it through the conditional path's
	accessor fallback rather than escaping to module scope."

	self assert: (self at: 'not_overridden') equals: 10.
	self assert: (self at: 'kept') equals: 10.
%

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testAReadAfterTheBranchSeesWhatTheBranchBound
	"``both = 1; if flag: both = 2; taken = both'' leaves taken == 2, as
	CPython, which runs a class body top to bottom.

	This was pinned as a KNOWN DIVERGENCE answering 1, because the class emit
	ran in PHASES -- all attribute values first, the ``if'' statements after --
	so ``taken'' was computed before the branch that changes ``both'' had run.
	The note here said statement-order emit was the fix and would be a good deal
	larger than anything nearby.  It was not: the positional flush that the
	``global'' / subscript / ``del'' statements already used took the ``if'' and
	the try/for/while/with set as they were, and the attr loop, the nested-class
	pass and the decorator scopes needed no changes at all.  See
	ClassDefAst >> ___classBodyOrderedRuntimeStatements___.

	The two halves that were already right are unchanged: the branch's own
	binding (testABranchOverwritesAnUnconditionalBinding) and a read of a name
	the branch itself bound (testABranchNameIsVisibleLaterInTheSameBranch)."

	self assert: (self at: 'taken') equals: 2.
%

category: 'Grail-Tests - Name Resolution'
method: ClassBodyConditionalTestCase
testANameWhoseBranchDidNotRunKeepsItsUnconditionalValue
	"The other half: ``not_overridden = 10'' with an ``if other:'' branch
	that does NOT run.  The dynamic slot is nil, so the accessor -- holding
	10 -- is the answer."

	self assert: (self at: 'not_overridden') equals: 10.
	self assert: (self at: 'kept') equals: 10.
%

! --- re-import under canonical classes ---

category: 'Grail-Tests - Reimport'
method: ClassBodyConditionalTestCase
testEveryBindingSurvivesReimport
	"REGRESSION.  Every class-body ``if'' binding used to survive the first
	import of a module and vanish from every one after it, whenever
	canonical classes were on -- which is how the SUnit gate runs.  Not the
	def work: plain guarded ASSIGNMENTS, shipped long before, were lost the
	same way; this is simply the first test to re-import such a class.

	The stores went through ___pyAttrStore___, which diverts to the
	session-local overlay once the class is in the canonical set.  On the
	first import it is not yet (registration is the last step of the build),
	so the store landed on the class.  On a REBUILD it already is, so the
	store went to the overlay -- and ___resetClassAttrOverlay___, emitted
	right after the class-build guard, wiped it.  Meanwhile the rebuild's
	own ``dynInstVars: (Object new)'' had cleared the committed value.  The
	binding ended up in neither place.

	setUp re-imports on every test, so the whole suite exercises the warm
	path; this test pins the cold-then-warm transition explicitly."

	| first |
	first := (self at: 'inst') @env0:asString.
	self setUp.
	self assert: (self at: 'inst') @env0:asString equals: first.
	self assert: (self at: 'marker' ) @env0:asString equals: 'yes'.
	self assert: (self at: 'echo') @env0:asString equals: 'yes'.
	self assert: (self at: 'static_via_class') @env0:asString equals: 'static:2'.
	self assert: (self at: 'cls_via_subclass') @env0:asString equals: 'cls:Sub:3'.
%

category: 'Grail-Tests - Reimport'
method: ClassBodyConditionalTestCase
testANestedClassSurvivesReimport
	"A nested class is stored by the same emit and was losable the same way.
	Kept honest here because the fix changed that store too."

	self assert: (self at: 'nested_tag') @env0:asString equals: 'nested'.
	self setUp.
	self assert: (self at: 'nested_tag') @env0:asString equals: 'nested'.
%

set compile_env: 0
