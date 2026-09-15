! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SuperArgZeroTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperArgZeroTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperArgZeroTestCase - zero-argument super() in a METHOD-LOCAL class
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperArgZeroTestCase removeAllMethods.
SuperArgZeroTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperArgZeroTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'super_arg_zero_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'super_arg_zero_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'super_arg_zero_ir'.
	self ___forgetCanonicalModule___: 'super_arg_zero_census'.
	irModule := nil.
%

category: 'Grail-Private'
method: SuperArgZeroTestCase
___keys___
	^ #('init_subclass_runs' 'init_subclass_skips_owner'
	    'init_subclass_sets_flag' 'new_tuple' 'new_str_upper'
	    'new_keeps_subclass' 'metaclass_new_runs' 'metaclass_instance_works'
	    'metaclass_is_meta' 'super_chain' 'conditional_class_body_def')
%

category: 'Grail-Private'
method: SuperArgZeroTestCase
___disagreeingIn___: results
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		((results @env1:__getitem__: k) = true) ifFalse: [bad add: k]].
	^ bad
%

category: 'Grail-Private'
method: SuperArgZeroTestCase
___irResults___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'super_arg_zero_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'super_arg_zero_ir'.
	irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_arg_zero.py')
		name: 'super_arg_zero_ir'.
	^ irModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - zero-arg super in a method-local class'
method: SuperArgZeroTestCase
testMethodLocalSuperBehavesUnderIR
	"``__new__'' / ``__init_subclass__'' on a class defined inside a method,
	each calling zero-argument super(), with the seam forced on.

	These were refused as `CallAst:super-argZeroDeletable' -- 32 on the suite
	manifest.  The refusal was a CONTEXT ARTIFACT rather than a real property
	of the shape: ___irSuperShape___ asked ___superArgZeroGuardName___ whether
	a ``del'' could have cleared argument 0, and that predicate is only
	meaningful while the def is being EMITTED.  It reads CallAst
	selfParameterName, which during the eligibility probe belongs to a
	different frame, so ``cls'' did not compare equal to it and every such
	method looked deletable.  At emit time the same predicate answers nil, the
	text path emits no guard, and the two paths' generated code is identical.

	The fixture self-verifies under CPython, so each expectation is CPython's
	behaviour rather than Grail's opinion of it."

	| bad |
	bad := self ___disagreeingIn___: self ___irResults___.
	self assert: bad isEmpty
		description: 'method-local super() shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - zero-arg super in a method-local class'
method: SuperArgZeroTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is precisely the failure an eligibility widening can hide --
	the widened methods would simply be compiled the old way and every
	assertion above would still pass.

	On a platform without IR support (3.7.x) the forced flag is correctly a
	no-op and there is nothing to assert."

	| stats |
	self ___irResults___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: SuperArgZeroTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	The census is the only instrument that can see this cut.  ___irStats___
	cannot: an eligibility refusal never reaches the seam, so it is not a
	FALLBACK -- the refused methods are simply compiled the old way, every
	behavioural assertion still passes, and ``compiled > 0'' stays true on the
	strength of the fixture's other methods.  Measured, not reasoned: with the
	refusal restored this fixture censuses 4 `super-argZeroDeletable' and 9
	eligible, and with the cut in place 0 and 13."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'super_arg_zero_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'super_arg_zero_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_arg_zero.py')
		name: 'super_arg_zero_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - zero-arg super in a method-local class'
method: SuperArgZeroTestCase
testTheRefusedShapeIsNowEligible
	"The assertion that can actually fail if the cut is reverted.

	THE NESTING IN THE FIXTURE IS LOAD-BEARING.  A class local to a module-level
	FUNCTION never refused; only a class local to a METHOD OF A CLASS does, which
	is why the fixture wraps every shape in ``Harness''.  A first draft written
	with plain functions censused 9 eligible and 0 refusals with the refusal
	still in place -- a fixture that passes either way.

	On a platform without IR support (3.7.x) the forced flag is correctly a
	no-op and the census collects nothing to assert."

	| counts refused |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	refused := counts at: #'cm:CallAst:super-argZeroDeletable' ifAbsent: [0].
	self assert: refused = 0
		description: 'method-local super() still refused as super-argZeroDeletable: '
			, refused printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 13
		description: 'fewer eligible class methods than the cut measured (13): '
			, counts printString
%
