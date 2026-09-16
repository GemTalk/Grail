! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BareEvalNestedScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BareEvalNestedScopeTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BareEvalNestedScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BareEvalNestedScopeTestCase
!
! A BARE ``eval(expr)'' / ``exec(src)'' INSIDE A NESTED DEF, ON THE IR PATH.
!
! `cm:CallAst:frameSensitive-eval-bareRewrite' (2) and
! `cm:CallAst:frameSensitive-exec-bareRewrite' (2).  These two rows are ones the
! eval-nested cut CREATED: it retired the blanket `-nested' refusal and let the
! four sites report under the name of the gap that actually stopped them.  This
! closes that gap.
!
! THE TEXT EMITS THE SAME REWRITE IN A NESTED DEF as in a top-level one,
! character for character.  Step 0c's first arm tests
! ``functionBeingCompiled notNil'', which a nested def satisfies, and
! ___emitIRLocalsSnapshotOn___: reads the SAME ``CallAst functionBeingCompiled''
! -- inside a nested block emit it IS the nested def.  So the snapshot gathers
! that def's own names with no change to the emit at all; the whole cut is the
! scope predicate.
!
! WHAT STAYS REFUSED is a scope whose locals the snapshot cannot build: a
! COMPREHENSION, whose targets step 0c prints through
! ___globalsViewReceiverExpr___, and a CLASS BODY, which is not a namespace the
! snapshot models.  A class further OUT is just the class a METHOD belongs to
! and was always admitted -- which is why the predicate tests the INNERMOST kind
! rather than asking whether a class appears anywhere.
!
! TWO WRONG VERSIONS, BOTH CAUGHT BY THE CENSUS AND NEITHER BY A VALUE:
!
!   * the first used ``noneSatisfy:'', which GemStone does not implement, so
!     the ELIGIBILITY PROBE RAISED -- 6 `body:probeError' rows.  Every value in
!     the fixture was still right, because a probe error falls back to text;
!   * the second rejected a class ANYWHERE in the chain, which would have
!     regressed the plain-method shape the old rule admitted.  One
!     `cm:...bareRewrite' row survived and said so.
!
! Both are the reason testTheBareRewriteRowsAreGone asserts the census rather
! than the answers.
! ===============================================================================

doit
BareEvalNestedScopeTestCase removeAllMethods.
BareEvalNestedScopeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BareEvalNestedScopeTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ben_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ben_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ben_ir'.
	self ___forgetCanonicalModule___: 'ben_census'.
	irModule := nil
%

category: 'Grail-Private'
method: BareEvalNestedScopeTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/bare_eval_nested_scope.py'
%

category: 'Grail-Private'
method: BareEvalNestedScopeTestCase
___keys___
	^ #('top_level_def_bare_eval' 'nested_def_bare_eval'
	    'nested_def_sees_its_parameter' 'nested_def_bare_exec'
	    'nested_def_reads_a_module_name' 'nested_def_free_var'
	    'a_method_nested_bare_eval')
%

category: 'Grail-Private'
method: BareEvalNestedScopeTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ben_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ben_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ben_ir'.
	^ irModule
%

category: 'Grail-Private'
method: BareEvalNestedScopeTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: BareEvalNestedScopeTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS.  Every wrong version of
	this cut answered correctly and differed only here."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ben_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ben_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'ben_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - a bare eval in a nested scope'
method: BareEvalNestedScopeTestCase
testEveryBareRewriteShapeAgreesWithCPythonUnderIR
	"Seven checks: a top-level def, a nested def, a nested def reading its own
	parameter, ``exec'' rather than ``eval'', a module name seen from a nested
	def, test_scope's free-variable shape, and a nested def inside a METHOD."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'bare-rewrite shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - a bare eval in a nested scope'
method: BareEvalNestedScopeTestCase
testTheBareRewriteRowsAreGone
	"THE ASSERTION THAT FAILS IF THE CUT IS REVERTED OR MIS-WRITTEN, and the
	only one that can.

	Two wrong versions of this predicate answered every value above correctly:
	one RAISED in the eligibility probe (GemStone has no ``noneSatisfy:''), so
	six defs fell back to text with right answers and a `body:probeError' row;
	the other rejected a class anywhere in the chain, regressing the
	plain-method shape and leaving one bareRewrite row behind.  A probe error
	is not a fallback the stats can see either, so the census is the instrument.

	Guarded on SUPPORT, not the ambient flag: the helper forces the seam on."

	| counts bare |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	bare := (counts at: #'CallAst:frameSensitive-eval-bareRewrite' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-eval-bareRewrite' ifAbsent: [0])
		+ (counts at: #'CallAst:frameSensitive-exec-bareRewrite' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-exec-bareRewrite' ifAbsent: [0]).
	self assert: bare = 0
		description: 'a bare eval/exec in a nested scope still refuses: '
			, counts printString.
	self assert: ((counts at: #'body:probeError' ifAbsent: [0])
		+ (counts at: #'cm:body:probeError' ifAbsent: [0])) = 0
		description: 'the eligibility probe RAISED -- correct answers, no IR: '
			, counts printString
%

category: 'Grail-Tests - a bare eval in a nested scope'
method: BareEvalNestedScopeTestCase
testTheIRArmActuallyCompiledTheFixture
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 8
		description: 'fewer defs compiled than the cut measured (8, against 1 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%
