Class {
	#name : 'ClassBodyConditionalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyConditionalTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassBodyConditionalTestCase >> setUp [
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

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testABranchNameIsVisibleLaterInTheSameBranch [
	"``marker = 'yes''' then ``echo = marker''.  The name has no accessor
	pair -- it is in the dynamic store -- so NameAst needs the conditional-
	name set to know where to read it.  test_functools' TestLRUC does this
	with ``module = c_functools'' and then ``@module.lru_cache()''."

	self assert: (self at: 'echo') @env0:asString equals: 'yes'.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testABranchOverwritesAnUnconditionalBinding [
	"``both = 1'' then ``if flag: both = 2''.  A name assigned anywhere
	unconditionally in the body gets an accessor pair (a real classInstVar);
	a name bound only in a branch gets a ___dynInstVars___ entry.  A conditional
	binding cannot know at emit time which it faces, and writing to the
	wrong one is not a near-miss: ___pyAttrLoad___ consults the accessor
	BEFORE the holder, so storing 2 in the holder left the read answering
	the 1 it was supposed to replace.  Hence
	___classBodyDefinitionalStore___, which asks.

	Nothing in the vendored corpus binds a name both ways, so this test is
	the only thing standing between that emit and a silent wrong answer."

	self assert: (self at: 'both') equals: 2.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testANameWhoseBranchDidNotRunKeepsItsUnconditionalValue [
	"The other half: ``not_overridden = 10'' with an ``if other:'' branch
	that does NOT run.  The dynamic slot is nil, so the accessor -- holding
	10 -- is the answer."

	self assert: (self at: 'not_overridden') equals: 10.
	self assert: (self at: 'kept') equals: 10.

]

{ #category : 'Grail-Tests - Reimport' }
ClassBodyConditionalTestCase >> testANestedClassSurvivesReimport [
	"A nested class is stored by the same emit and was losable the same way.
	Kept honest here because the fix changed that store too."

	self assert: (self at: 'nested_tag') @env0:asString equals: 'nested'.
	self setUp.
	self assert: (self at: 'nested_tag') @env0:asString equals: 'nested'.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testAnUnboundNameFallsBackToTheModuleGlobal [
	"``from_global = helper'' where helper is a module global, not a class
	attribute.  The dynamic-store read answers nil and the emit falls
	through -- matching Python, whose class-body lookup consults the
	enclosing scope once the class namespace comes up empty."

	self assert: (self at: 'from_global') @env0:asString
		equals: 'module-global-helper'.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testAnUnguardedDefStillCompilesAsAMethod [
	"The structural path is untouched for everything outside an ``if''."

	self assert: (self at: 'unconditional') @env0:asString equals: 'unconditional'.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testAnUnrunBranchLeavesTheUnconditionalBindingAlone [
	"The other half: ``not_overridden = 10'' with an ``if other:'' branch
	that does not run.  Nothing is stored, so the accessor value stands --
	and ``kept = not_overridden'' reads it through the conditional path's
	accessor fallback rather than escaping to module scope."

	self assert: (self at: 'not_overridden') equals: 10.
	self assert: (self at: 'kept') equals: 10.

]

{ #category : 'Grail-Tests - Branches' }
ClassBodyConditionalTestCase >> testAnUntakenBranchDefinesNothing [
	self assert: (self at: 'has_not_taken') equals: false.

]

{ #category : 'Grail-Tests - Name Resolution' }
ClassBodyConditionalTestCase >> testAReadAfterTheBranchSeesWhatTheBranchBound [
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

]

{ #category : 'Grail-Tests - Reimport' }
ClassBodyConditionalTestCase >> testEveryBindingSurvivesReimport [
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
	own ``___dynInstVars___: (Object new)'' had cleared the committed value.  The
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

]

{ #category : 'Grail-Tests - Def Forms' }
ClassBodyConditionalTestCase >> testGuardedClassMethodBindsTheOwner [
	"Reached through an instance, through the class, and through a
	SUBCLASS -- the last is what distinguishes binding the owner from
	binding the defining class."

	self assert: (self at: 'cls_via_instance') @env0:asString equals: 'cls:Conditional:3'.
	self assert: (self at: 'cls_via_class') @env0:asString equals: 'cls:Conditional:3'.
	self assert: (self at: 'cls_via_subclass') @env0:asString equals: 'cls:Sub:3'.

]

{ #category : 'Grail-Tests - Def Forms' }
ClassBodyConditionalTestCase >> testGuardedDefIsInherited [
	"It lands in the per-class dynamic store, which the attribute-load path
	walks up the class chain -- so a subclass sees it."

	self assert: (self at: 'inherited') @env0:asString equals: 'inst:Sub:4'.

]

{ #category : 'Grail-Tests - Def Forms' }
ClassBodyConditionalTestCase >> testGuardedDefTakesItsDecorators [
	"A genuine runtime decorator still applies: FunctionDefAst's own
	decorator chain rebinds the block temp before the store, so nothing
	special is needed here -- this pins that it stays that way."

	self assert: (self at: 'decorated') @env0:asString equals: 'deco(decorated)'.

]

{ #category : 'Grail-Tests - Def Forms' }
ClassBodyConditionalTestCase >> testGuardedInstanceMethodBindsTheReceiver [
	"The headline case, and the one that hid a second bug: emitted as a
	block, ``self'' is a transported temp, so a body reference to it read
	the enclosing MODULE instance until isSelfReference: was scoped."

	self assert: (self at: 'inst') @env0:asString equals: 'inst:Conditional:1'.

]

{ #category : 'Grail-Tests - Def Forms' }
ClassBodyConditionalTestCase >> testGuardedStaticMethodNeverBinds [
	"@staticmethod reaches codegen re-classed by the parser, not as a
	runtime decorator, so the emit has to wrap it in PyStaticMethod itself
	-- otherwise the plain function in the dynamic store would bind the
	receiver on the instance read and pass it as x."

	self assert: (self at: 'static_via_instance') @env0:asString equals: 'static:2'.
	self assert: (self at: 'static_via_class') @env0:asString equals: 'static:2'.

]

{ #category : 'Grail-Tests - Branches' }
ClassBodyConditionalTestCase >> testTheElseBranchDefines [
	self assert: (self at: 'else_meth') @env0:asString equals: 'else_meth'.

]

{ #category : 'Grail-Tests - Branches' }
ClassBodyConditionalTestCase >> testTheTakenBranchWins [
	"``if flag:'' defines inst_meth one way and ``else:'' another.  Emitting
	both as methods would have installed one selector twice."

	self assert: (self at: 'has_inst_meth') equals: true.
	self assert: (self at: 'inst') @env0:asString equals: 'inst:Conditional:1'.

]
