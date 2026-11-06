"
P1.3 of the IR-only codegen plan: the refusal reasons only a broken parser or
compile-context invariant can produce became ``invariant:<Owner>-<cause>''
rows (AbstractNode class >> ___irIsInvariantReason___:), the rows nothing can
reach were deleted, and rows that named the wrong cause were renamed.

Four things are pinned:
  * no RETIRED reason Symbol is a literal of any PythonAst method any more, so
    a deleted or renamed row cannot creep back -- and the scan is shown to see
    literals inside non-inlined blocks, where the guards' rows live;
  * each assertion really labels its broken invariant: a hand-built tree the
    parser never produces is refused under the ``invariant:'' row;
  * tests/python/ir_refusal_labels.py (self-running against CPython 3.14)
    agrees with CPython under a forced IR load, and its census names the
    relabelled rows under their NEW names;
  * the census of that fixture and of the other IR shape fixtures holds no
    ``invariant:'' row at all.  A census row is the only instrument that sees
    a refusal: a refused def compiles as text and answers the same values.
"
Class {
	#name : 'IRRefusalLabelsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'modules',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase class >> retiredReasonPrefixes [
	"The STRING literals the dynamic rows used to be built from
	(``'ConstantAst:' , value class name'' and so on); each now builds under
	``invariant:''."

	^ #('ConstantAst:' 'Comprehension:target-' 'NamedExprAst:target-' 'stmt:')

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase class >> retiredReasons [
	"Every refusal Symbol P1.3 deleted or renamed.  The invariant ones live on
	under ``invariant:...'', the relabelled ones under their real cause."

	^ #(#'method:classInClassBody' #'method:staticWithReceiverName'
		#'method:receiverNameMismatch' #'signature:other' #'body:unknown'
		#'body:probeError' #'nestedDef:probeError' #'nestedDef:noArgs'
		#'nestedDef:other' #'nestedDef:decorator' #'LambdaAst:probeError'
		#'LambdaAst:noArgs' #'LambdaAst:other' #'LambdaAst:yield'
		#'shape:ClassDefAst' #'AugAssignAst:operator'
		#'AugAssignAst:target-SubscriptAst-slice' #'AnnAssignAst:moduleTarget'
		#'AnnAssignAst:target' #'DeleteAst:name' #'DeleteAst:target'
		#'NonlocalAst:noOwner' #'NonlocalAst:other' #'WhileAst:other'
		#'shape:TryAst-noHandlersNoFinally' #'shape:TryAst-elseWithoutExcept'
		#'shape:TryAst-exceptStarMixed' #'shape:TryAst-exceptStarNoType'
		#'shape:TryAst-handlerBodyShape' #'shape:TryAst-elseShape'
		#'shape:TryAst-finallyShape' #'shape:TryAst-bodyShape'
		#'shape:TryAst-other' #'ConstantAst:surrogateStr' #'ConstantAst:Symbol'
		#'CallAst:super-shadowed' #'CallAst:super-other'
		#'CallAst:super-explicitNamesOtherClass' #'CallAst:super-noEnclosingClass'
		#'CallAst:super-methodLocalClass' #'CallAst:super-classInClassBody'
		#'Comprehension:noGenerators' #'Comprehension:probeError'
		#'Comprehension:target-other' #'Comprehension:bareStarTarget'
		#'Comprehension:target-starCount' #'NameAst:super-other'
		#'NameAst:classCell' #'NameAst:classContextOther' #'NameAst:other'
		#'StarredAst:storeTarget' #'reasonProbeError')

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___addLiteralsOf___: aMethod into: aSet [
	"Every literal of aMethod, descending into the literals that are themselves
	code -- a non-inlined block, which is where an ``on: Error do: [...]''
	guard's row lives."

	(aMethod respondsTo: #literals) ifFalse: [^ self].
	aMethod literals do: [:lit |
		((lit isKindOf: GsNMethod) or: [lit isKindOf: ExecBlock])
			ifTrue: [
				self ___addLiteralsOf___: ((lit isKindOf: ExecBlock)
					ifTrue: [lit method] ifFalse: [lit]) into: aSet]
			ifFalse: [aSet add: lit]]

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___astLiterals___ [
	"Every literal of every env-0 method, instance and class side, of every
	class in PythonAst."

	| out |
	out := Set new.
	(PythonAst values select: [:c | c isBehavior]) do: [:c |
		{ c. c class } do: [:b |
			(b selectorsForEnvironment: 0) do: [:sel |
				self ___addLiteralsOf___: (b compiledMethodAt: sel environmentId: 0)
					into: out]]].
	^ out

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___censusCountsFor___: aFixture [
	"Load aFixture with the seam FORCED on AND the eligibility census
	collecting, under a module name of its own, and answer its #counts."

	| name |
	name := 'irrl_census_' , aFixture.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	self ___snapshotRegistry___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: (self ___fixturePath___: aFixture) name: name]
		ensure: [importlib ___irCensusOn: false].
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___fixturePath___: aFixture [
	^ importlib grailDir , '/tests/python/' , aFixture , '.py'

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___invariantRowsIn___: counts [
	^ (counts keys select: [:k | AbstractNode ___irIsInvariantReason___: k])
		collect: [:k | k asString , '=' , (counts at: k) printString]

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___irModule___ [
	"The fixture loaded with the seam FORCED on, once per test."

	| name |
	modules ifNil: [modules := Dictionary new].
	(modules at: #fixture ifAbsent: [nil]) ifNotNil: [:m | ^ m].
	name := 'irrl_ir_refusal_labels'.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	self ___snapshotRegistry___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	^ modules at: #fixture
		put: (importlib loadModuleFromPath: (self ___fixturePath___: 'ir_refusal_labels')
			name: name)

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___snapshotRegistry___ [
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___]

]

{ #category : 'Grail-Private' }
IRRefusalLabelsTestCase >> ___table___: aName [
	"The fixture's EXPECTED or XFAIL table, as a list of mismatches between it
	and the recorded results."

	| mod r table bad |
	mod := self ___irModule___.
	r := mod @env1:___pyAttrLoad___: #r.
	table := mod @env1:___pyAttrLoad___: aName.
	bad := OrderedCollection new.
	(table @env1:keys) asArray do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env0:asString.
		want := (table @env1:__getitem__: k) @env0:asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Setup' }
IRRefusalLabelsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	modules ifNotNil: [
		(importlib @env1:modules) removeKey: #'irrl_ir_refusal_labels' ifAbsent: [].
		self ___forgetCanonicalModule___: 'irrl_ir_refusal_labels'].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	modules := nil

]

{ #category : 'Grail-Tests - fixture' }
IRRefusalLabelsTestCase >> testFixtureAgreesWithCPythonUnderIR [
	| bad |
	bad := self ___table___: #EXPECTED.
	self assert: bad isEmpty
		description: 'ir_refusal_labels disagrees with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - fixture' }
IRRefusalLabelsTestCase >> testFixtureXfailsKeepTheTextAnswer [
	"Both XFAIL shapes still refuse IR, so their answer IS the text path's.
	A change of answer here means either a fix (update the fixture) or a
	refusal that stopped refusing without its emit being checked."

	| bad |
	bad := self ___table___: #XFAIL.
	self assert: bad isEmpty
		description: 'ir_refusal_labels left the recorded Grail answer: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - assertions' }
IRRefusalLabelsTestCase >> testInvariantPredicate [
	self assert: (AbstractNode ___irIsInvariantReason___: #'invariant:TryAst-noReason').
	self assert: (AbstractNode ___irIsInvariantReason___: #'cm:invariant:body-probeRaised').
	self deny: (AbstractNode ___irIsInvariantReason___: #'shape:TryAst-exceptType').
	self deny: (AbstractNode ___irIsInvariantReason___: #'cm:eligible').
	self deny: (AbstractNode ___irIsInvariantReason___: #compiled).
	self deny: (AbstractNode ___irIsInvariantReason___: nil)

]

{ #category : 'Grail-Tests - assertions' }
IRRefusalLabelsTestCase >> testNoInvariantRowOnTheIRShapeFixtures [
	"The fixtures written for the IR cuts exercise the shapes nearest the
	asserted exits.  None of them may produce an invariant row; the corpus
	census (both corpora) is the wider version of this, run by hand."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	bad := OrderedCollection new.
	#('ir_refusal_labels' 'ir_function_shapes' 'comprehension_star_target'
	  'super_without_class' 'super_keyword_arguments'
	  'bare_eval_in_comprehension' 'locals_in_comprehension') do: [:fixture |
		| counts rows |
		counts := self ___censusCountsFor___: fixture.
		rows := self ___invariantRowsIn___: counts.
		rows isEmpty ifFalse: [bad add: fixture -> rows asArray].
		(counts at: #compiled otherwise: 0) + (counts at: #'cm:eligible' otherwise: 0) > 0
			ifFalse: [bad add: fixture -> 'nothing compiled']].
	self assert: bad isEmpty
		description: 'invariant rows on the IR fixtures: ' , bad asArray printString

]

{ #category : 'Grail-Tests - assertions' }
IRRefusalLabelsTestCase >> testNoRetiredReasonIsALiteralAnyMore [
	"A deleted or renamed row cannot come back without failing here.  The
	scan is shown to SEE what it looks for first: two current rows, one
	returned from an inlined branch and one from inside an ``on: Error do:''
	block."

	| lits back prefixes |
	lits := self ___astLiterals___.
	self assert: (lits includes: #'invariant:CallAst-superZeroShape')
		description: 'the literal scan does not see an inlined branch'.
	self assert: (lits includes: #'invariant:body-probeRaised')
		description: 'the literal scan does not see inside a block'.
	back := self class retiredReasons select: [:sym | lits includes: sym].
	self assert: back isEmpty
		description: 'a retired IR refusal is back in PythonAst: ' , back printString.
	prefixes := self class retiredReasonPrefixes select: [:p |
		lits anySatisfy: [:l | l isString and: [l isSymbol not and: [l = p]]]].
	self assert: prefixes isEmpty
		description: 'a retired IR refusal prefix is back in PythonAst: '
			, prefixes printString

]

{ #category : 'Grail-Tests - fixture' }
IRRefusalLabelsTestCase >> testRelabelledRowsAppearUnderTheirNewNames [
	"The fixture's two still-refused shapes are named for their real causes:
	an async generator expression in a lambda (was `LambdaAst:yield') and a
	nested def's bare-name decorator split by why it cannot be read (was one
	`nestedDef:decorator')."

	| counts missing |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsFor___: 'ir_refusal_labels'.
	missing := #(#'LambdaAst:awaitInGenexp' #'cm:nestedDef:decorator-classCell'
		#'cm:nestedDef:decorator-unresolvedName') reject: [:row |
			(counts at: row otherwise: 0) > 0].
	self assert: missing isEmpty
		description: 'relabelled rows missing from the census: ' , missing printString
			, ' in ' , counts printString.
	self assert: (self class retiredReasons select: [:r |
			(counts at: r otherwise: 0) > 0 or: [(counts at: ('cm:' , r) asSymbol otherwise: 0) > 0]]) isEmpty
		description: 'a retired row in the census: ' , counts printString

]

{ #category : 'Grail-Tests - assertions' }
IRRefusalLabelsTestCase >> testTheAssertionsLabelBrokenTrees [
	"Each tree below is one the parser never builds.  Handed to the refusal
	detail anyway, it must come back under the ``invariant:'' row that names
	the broken invariant -- so the assertions are not just renamed rows nobody
	can reach, but the labels P1.4's strict mode will report."

	| empty cases bad |
	empty := Set new.
	cases := OrderedCollection new.
	cases
		add: #'invariant:TryAst-noHandlersNoFinally'
			-> [(TryAst new handlers: #(); yourself) ___irRefusalDetail___: empty];
		add: #'invariant:WhileAst-bodyShape'
			-> [(WhileAst new body: #(); yourself) ___irRefusalDetail___: empty];
		add: #'invariant:StarredAst-notLoad'
			-> [StarredAst new ___irRefusalDetail___: empty];
		add: #'invariant:NamedExprAst-target-AttributeAst'
			-> [(NamedExprAst new target: AttributeAst new; yourself)
				___irRefusalDetail___: empty];
		add: #'invariant:ConstantAst-Symbol'
			-> [(ConstantAst new value: #foo; yourself) ___irRefusalDetail___: empty];
		add: #'invariant:AugAssignAst-operator'
			-> [AugAssignAst new ___irRefusalDetail___: empty];
		add: #'invariant:Comprehension-noGenerators'
			-> [ComprehensionAst ___irRefusal___: #()];
		add: #'invariant:Comprehension-targetNoElts'
			-> [ComprehensionAst ___irRefusal___:
				{ ComprehensionAst new target: TupleAst new; yourself }];
		add: #'invariant:Comprehension-target-NameAst'
			-> [ComprehensionAst ___irRefusal___:
				{ ComprehensionAst new target: NameAst new; yourself }];
		"A lambda with no ArgumentsAst: the deleted `LambdaAst:noArgs' row's
		case, which now raises inside the reason's guard."
		add: #'invariant:LambdaAst-probeRaised'
			-> [LambdaAst new ___irLambdaReason___: empty].
	bad := OrderedCollection new.
	cases do: [:assoc |
		| got |
		got := [assoc value value] on: Error do: [:ex | ex return: 'RAISED ' , ex messageText asString].
		got = assoc key ifFalse: [bad add: assoc key -> got]].
	self assert: bad isEmpty
		description: 'an assertion did not label its broken tree: ' , bad asArray printString

]
