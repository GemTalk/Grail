! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedDefExplicitSuperTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedDefExplicitSuperTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedDefExplicitSuperTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedDefExplicitSuperTestCase
!
! ``super(C, obj)'' INSIDE A NESTED DEF, THROUGH THE DIRECT-TO-IR PATH.
!
! `cm:nestedDef:super' (3) plus the module-program `nestedDef:super' (1) refused
! any closure whose body MENTIONED the name ``super''.  The reason recorded for
! it is entirely about the ZERO-ARGUMENT spelling: the text asks the innermost
! def for super()'s argument 0, and a def with no enclosing class raises
! ``super(): no arguments'' -- arms the IR super shapes do not emit.
!
! NONE OF THAT IS A REASON TO REFUSE ``super(C, obj)'', which names its class
! and its object outright.  It consults no frame, asks no def for an argument 0,
! and is an ordinary two-argument call.  This is the same over-wide refusal that
! ``super'' in a METHOD had, corrected the same way (cut 88's
! ___irSuperStaysOnText___), one lexical level down.
!
! WHAT THE CORPUS HOLDS, which is what makes the distinction worth drawing:
!
!   _py_warnings.deprecated.__call__         super(arg, cls).__init_subclass__
!   test.support.hashlib_helper              super(decorated_class, cls).setUpClass
!   test_super.test_unusual_getattro         super(MyType, type(mytype)).__setattr__
!   test_super.test_obscure_super_errors     super()          <- the bare one
!
! THREE OF THE FOUR are explicit two-argument calls.  Only the last is the shape
! the refusal was written for, and it still refuses.
!
! THE BARE SHAPES ARE IN THE FIXTURE TOO, deliberately: a narrowing that started
! compiling them would turn CPython's RuntimeError into whatever the ordinary
! builtin call answers, which is a wrong message rather than a missing feature
! (SuperPreconditionErrorsTestCase measured exactly that for the method case).
! testTheBareSpellingsStillRaise is the guard on this cut's own blast radius.
! ===============================================================================

doit
NestedDefExplicitSuperTestCase removeAllMethods.
NestedDefExplicitSuperTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NestedDefExplicitSuperTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ndes_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ndes_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ndes_ir'.
	self ___forgetCanonicalModule___: 'ndes_census'.
	irModule := nil
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/nested_def_explicit_super.py'
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___keys___
	"Named rather than read from the fixture so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('two_arg_super_in_a_nested_def' 'two_arg_super_on_a_type'
	    'a_method_with_a_nested_two_arg_super'
	    'a_method_with_a_nested_bare_super'
	    'a_bare_super_in_a_plain_nested_def' 'super_named_but_not_called'
	    'a_lambda_with_a_two_arg_super')
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___irModule___
	"The fixture with the seam FORCED ON.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ndes_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ndes_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ndes_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___expectedReprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: NestedDefExplicitSuperTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	___irStats___ CANNOT SEE THIS CUT: an eligibility refusal never reaches the
	seam, so it is not a fallback -- the refused defs are compiled the old way,
	every value below is right either way, and ``fallbacks'' stays 0.  This is
	the instrument that can."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ndes_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ndes_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'ndes_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - explicit super in a nested def'
method: NestedDefExplicitSuperTestCase
testEveryNestedSuperShapeAgreesWithCPythonUnderIR
	"Seven shapes: four explicit two-argument calls (a nested def, a def at
	module scope taking a type, a method's nested def, a lambda), the two BARE
	spellings that must still raise, and the name mentioned without a call."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___expectedReprOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'nested super shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - explicit super in a nested def'
method: NestedDefExplicitSuperTestCase
testTheBareSpellingsStillRaise
	"THE GUARD ON THIS CUT'S BLAST RADIUS, stated on its own.

	A zero-argument super() in a closure keeps refusing, so the text spells the
	precondition arms.  Compiling it instead would emit the ordinary builtin
	call, whose message is not CPython's -- a WRONG message rather than a
	missing feature, which is what SuperPreconditionErrorsTestCase measured for
	the method case."

	| bad |
	bad := OrderedCollection new.
	#('a_method_with_a_nested_bare_super' 'a_bare_super_in_a_plain_nested_def')
		do: [:k |
			| got |
			got := self ___reprOf___: k.
			got = '''RuntimeError: super(): no arguments'''
				ifFalse: [bad add: k , ': ' , got]].
	self assert: bad isEmpty
		description: 'a bare super() in a closure stopped raising CPython''s '
			, 'RuntimeError: ' , bad asArray printString
%

category: 'Grail-Tests - explicit super in a nested def'
method: NestedDefExplicitSuperTestCase
testTheExplicitSpellingsAreNowEligible
	"THE ASSERTION THAT FAILS IF THE CUT IS REVERTED, and the only one that
	can -- the values above are right either way.

	Measured both ways on this fixture: with the refusal on the NAME it
	censuses 5 `nestedDef:super' nested defs; with the cut, ONE, which is the
	bare-super def that should still refuse.

	Guarded on SUPPORT, not on the ambient flag: ___censusCountsForFixture___
	forces the seam on itself, and ``___irCodegenEnabled___ ifFalse: [^ self]''
	would return before measuring anything in the flag-off suite."

	| counts refused |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	refused := (counts at: #'nestedDef:super' ifAbsent: [0])
		+ (counts at: #'cm:nestedDef:super' ifAbsent: [0]).
	self assert: refused = 1
		description: 'the explicit two-argument spellings still refuse -- one '
			, 'bare-super def is expected and nothing else: ' , refused printString
			, ' of ' , counts printString
%

category: 'Grail-Tests - explicit super in a nested def'
method: NestedDefExplicitSuperTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
