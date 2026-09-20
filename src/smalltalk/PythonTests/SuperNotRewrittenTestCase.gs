! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperNotRewrittenTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperNotRewrittenTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperNotRewrittenTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperNotRewrittenTestCase
!
! A ``super(...)'' CALL THE COMPILER DOES NOT REWRITE, THROUGH THE DIRECT-TO-IR
! PATH.
!
! `CallAst:super-arity' (5 class methods) and `CallAst:super-noClass' (2 defs)
! were one refusal wearing two names, and it was the NAME being refused rather
! than a shape.  printSmalltalkOn:'s super branches are guarded by ``arguments
! size = 2 and: [(arguments at: 1) isKindOf: NameAst]'' plus a class being
! compiled; ANY call failing those guards falls through there to the ordinary
! call path, where ``super'' is read as a value and applied:
!
!     ((<Mod> ___grailShadowedSuper___) ifNil: [Super]) value: { ... } value: nil
!
! NameAst already emits that read -- its #superShadowed / #superClass kinds,
! whose own comment lists ``super(int, int, int)'' as one of the spellings it
! serves -- so the IR path spells the fall-through by construction.  The cut is
! deleting the blanket refusal, not adding an emit.
!
! WHAT IT COST WAS MOSTLY CONFORMANCE, NOT ELIGIBILITY.  Four of the corpus
! spellings are deliberate ERROR cases in test_super (``super(1, 2)'',
! ``super(int, int, int)'', ``super(1, self)'', ``super(1, int)'') whose whole
! point is the TypeError; the fifth is the one real-code shape, a DOTTED first
! argument -- ``super(_SubParsersAction._ChoicesPseudoAction, self)'' in argparse.
!
! TWO SPELLINGS STILL REFUSE, and the FIRST was found by the flag-on suite rather
! than by reading.  A ZERO-ARGUMENT ``super()'' has three text arms beyond the
! in-method rewrite, and two of them are precondition ERRORS raised for a def with
! no enclosing class -- ``super(): arg[0] deleted'' and ``super(): __class__ cell
! not found''.  Letting those fall through emits the ordinary builtin call, whose
! message is ``super(): no arguments'': a wrong message, not a missing feature, and
! exactly what SuperPreconditionErrorsTestCase caught.  So the fall-through is for
! a super WITH arguments; a zero-argument one the shapes decline keeps refusing.
!
! The second is an explicit two-argument super naming a DIFFERENT method-local
! class.  There the text really does rewrite, into a ``Super checkedCls:'' over a
! path the IR has no twin for -- and the cell key ``___cell_<ClassName>___'' exists
! only under the class's own name.
!
! A ROW MOVED RATHER THAN CLOSED, which the totals alone would hide.  Of the two
! `super-noClass' defs, one compiles and the other lands on `nestedDef:super' --
! it holds a nested def whose own super refuses.  Measured by row-by-row diff:
! `compiled' +1, `nestedDef:super' 0 -> 1.
! ===============================================================================

doit
SuperNotRewrittenTestCase removeAllMethods.
SuperNotRewrittenTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperNotRewrittenTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'snr_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'snr_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'snr_ir'.
	self ___forgetCanonicalModule___: 'snr_census'.
	irModule := nil
%

category: 'Grail-Private'
method: SuperNotRewrittenTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/super_not_rewritten.py'
%

category: 'Grail-Private'
method: SuperNotRewrittenTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('a_dotted_first_argument' 'a_subscript_first_argument'
	    'three_arguments_raise' 'a_non_type_first_argument_raises'
	    'a_non_type_first_argument_in_a_method' 'an_unrelated_instance_raises'
	    'one_argument_gives_an_unbound_super'
	    'a_dotted_first_argument_in_a_classmethod')
%

category: 'Grail-Private'
method: SuperNotRewrittenTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'snr_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'snr_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'snr_ir'.
	^ irModule
%

category: 'Grail-Private'
method: SuperNotRewrittenTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - unrewritten super'
method: SuperNotRewrittenTestCase
testEveryUnrewrittenSuperShapeAgreesWithCPythonUnderIR
	"All eight shapes with the seam forced on.

	The four TypeError shapes are the ones a rewrite must not claim: a compiler
	that built a Super proxy for ``super(1, 2)'' would answer a working object
	where CPython raises, and no test that only checks working supers would see
	it."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'unrewritten super shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - unrewritten super'
method: SuperNotRewrittenTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 8
		description: 'fewer methods compiled than the cut measured (8, against 2 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: SuperNotRewrittenTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'snr_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'snr_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'snr_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - unrewritten super'
method: SuperNotRewrittenTestCase
testAnUnrewrittenSuperIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	7 `cm:CallAst:super-arity' and 2 `CallAst:super-noClass' against 2 eligible
	class methods and NOTHING compiled, and the behavioural test above STILL
	PASSES -- the text twin answers all eight correctly.  With the cut, 9
	eligible, 2 compiled, and no super refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:CallAst:super-arity' ifAbsent: [0]) = 0
		description: 'an unrewritten super in a method still refuses: '
			, counts printString.
	self assert: (counts at: #'CallAst:super-noClass' ifAbsent: [0]) = 0
		description: 'an unrewritten super outside a class still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 9
		description: 'fewer class methods eligible than the cut measured (9): '
			, counts printString
%
