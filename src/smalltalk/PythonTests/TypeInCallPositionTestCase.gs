! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeInCallPositionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeInCallPositionTestCase'
  instVarNames: #( irModule textModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeInCallPositionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeInCallPositionTestCase
!
! ``type(...)'' AT AN ARITY THE CALL FAST PATH DOES NOT CLAIM.
!
! `cm:NameAst:type-other' (3).  ``type'' read as a VALUE must be the CLASS, not
! the BoundMethod wrapper every other builtin read answers, and the IR path has
! that (___irTypeLoadKind___, cut 55).  What it did not have was the name in the
! FUNCTION POSITION of a call.
!
! ``isFastPathBuiltinName'' answers false there BY DESIGN -- its own comment
! says so: CallAst has already decided how to emit the call, so the name must
! not be wrapped in a BoundMethod and forced through reflective dispatch.  The
! IR path read that ``false'' as ``refuse''.  The text reads it as ``emit the
! bare identifier and let the call spell itself'', which is what it does:
!
!     type @env1:__new__                                     (no arguments)
!     type @env1:__new__: ('A') _: (()) _: ({}) _: (())      (four)
!     type @env1:value: { ... } value: <kwargs dict>          (any keyword)
!
! SO NOTHING HERE WAS A MISSING FEATURE.  Both paths already answered the same
! thing for all eleven shapes; the IR just reached that answer by falling back
! to text.  The cut changes ELIGIBILITY, not behaviour -- which is why the
! assertion that guards it is a census one, and why the behavioural test asserts
! the two paths AGREE rather than that either is right.
!
! MOST OF THESE SHAPES DISAGREE WITH CPYTHON, on both paths, and they are the
! fixture's XFAILs: Grail's ``type()'' accepts arities CPython rejects, words
! its TypeErrors differently, and builds a class from ``type('A', [], {})''
! where CPython insists the bases be a tuple.  None of it is this cut's -- it is
! the same before and after -- and pinning it means a later fix has to come
! through this file.
!
! ONE OF THE THREE MOVED RATHER THAN CLOSED, to `CallAst:builtinArityMismatch',
! which names the gap that actually stops it.  The board records the split.
! ===============================================================================

doit
TypeInCallPositionTestCase removeAllMethods.
TypeInCallPositionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeInCallPositionTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'tcp_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'tcp_text' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'tcp_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'tcp_ir'.
	self ___forgetCanonicalModule___: 'tcp_text'.
	self ___forgetCanonicalModule___: 'tcp_census'.
	irModule := nil.
	textModule := nil
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/type_in_call_position.py'
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___keys___
	"Every shape the fixture produces, XFAILs included: what this cut must hold
	is that the two PATHS agree, whatever either says about CPython."

	^ #('one_arg' 'three_args' 'type_as_a_value' 'type_as_a_base' 'no_args'
	    'two_args' 'four_args' 'a_keyword' 'all_keywords' 'extra_keyword'
	    'a_list_for_bases')
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___cpythonAgreeingKeys___
	"The four shapes Grail gets right; the rest are the fixture's XFAILs."

	^ #('one_arg' 'three_args' 'type_as_a_value' 'type_as_a_base')
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'tcp_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'tcp_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'tcp_ir'.
	^ irModule
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___textModule___
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'tcp_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'tcp_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'tcp_text'.
	^ textModule
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___reprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: TypeInCallPositionTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS.  ___irStats___ cannot see
	this cut -- an eligibility refusal never reaches the seam, so the refused
	methods compile the old way and ``fallbacks'' stays 0 either way."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'tcp_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'tcp_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'tcp_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - type in call position'
method: TypeInCallPositionTestCase
testBothPathsAgreeOnEveryArity
	"THE INVARIANT THIS CUT MUST HOLD.  Eleven shapes, compared path against
	path rather than against CPython: the IR used to reach these answers by
	falling back to text, and it must reach the SAME ones now that it compiles
	them itself.  Most of them are wrong about CPython, identically, on both
	sides -- that is the fixture's XFAIL list and not this cut's business."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| ir text |
		ir := self ___reprOf___: self ___irModule___ key: k.
		text := self ___reprOf___: self ___textModule___ key: k.
		ir = text ifFalse: [bad add: k , ': IR ' , ir , ' vs text ' , text]].
	self assert: bad isEmpty
		description: 'the two paths disagree about a type() arity: '
			, bad asArray printString
%

category: 'Grail-Tests - type in call position'
method: TypeInCallPositionTestCase
testTheShapesCPythonAgreesAboutAreRight
	"The four shapes Grail gets right, asserted against CPython's own answers
	so that the agreement is not merely mutual."

	| bad |
	bad := OrderedCollection new.
	self ___cpythonAgreeingKeys___ do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a type() shape Grail used to get right no longer does: '
			, bad asArray printString
%

category: 'Grail-Tests - type in call position'
method: TypeInCallPositionTestCase
testTheTypeNameRowIsGone
	"THE ASSERTION THAT FAILS IF THE CUT IS REVERTED, and the only one that
	can: the values above are identical either way, because a refusal falls
	back to the very text it is being compared against.

	Guarded on SUPPORT, not on the ambient flag -- ___censusCountsForFixture___
	forces the seam on itself, and reading ___irCodegenEnabled___ here would
	return before measuring anything in the flag-off suite."

	| counts |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:NameAst:type-other' ifAbsent: [0]) = 0
		description: 'a type() read in call position still refuses: '
			, counts printString
%

category: 'Grail-Tests - type in call position'
method: TypeInCallPositionTestCase
testTheIRArmActuallyCompiledTheFixture
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 11
		description: 'fewer defs compiled than the cut measured (11, against 8 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%
