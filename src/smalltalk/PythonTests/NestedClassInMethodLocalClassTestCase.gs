! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedClassInMethodLocalClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedClassInMethodLocalClassTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedClassInMethodLocalClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedClassInMethodLocalClassTestCase
!
! A CLASS DEFINED INSIDE A METHOD OF A METHOD-LOCAL CLASS.
!
! ``cm:method:methodLocalNestedClass'' (11) refused the one-level-deeper case of
! a shape the transport already handles: ``Outer'' travels as a compiled-text
! helper because it is defined in a function body (cuts 76/79), and ``Inner''
! does the same thing again from inside a method that is itself being built.
!
! THE REFUSAL TURNED OUT TO BE A GUARD WITHOUT A MECHANISM BEHIND IT.  Removing
! ``self ___irSubtreeContainsClassDef___ ifTrue: [...]'' is the whole change --
! no new emit -- because the class statement inside the method takes the SAME
! transport it takes anywhere else.  That is a claim worth distrusting, so the
! fixture stresses the family rather than the one line that motivated it: three
! levels deep, several methods sharing one capture, a base expression, and both
! class-cell readers (``__class__'' and zero-argument ``super()'') resolving to
! the INNER class.
!
! WHAT A BROKEN TRANSPORT WOULD DO, and why the checks are shaped this way: the
! failures here are wrong VALUES, not errors.  A dropped capture reads nil
! rather than raising, and a class hoisted out of the method would silently
! ALIAS two calls instead of building one class per call --
! ``each_call_builds_a_fresh_class'' is the check for that, and it compares
! identity rather than contents because two equal-looking classes is exactly
! what the bug produces.
! ===============================================================================

doit
NestedClassInMethodLocalClassTestCase removeAllMethods.
NestedClassInMethodLocalClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NestedClassInMethodLocalClassTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'mlnc_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'mlnc_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'mlnc_ir'.
	self ___forgetCanonicalModule___: 'mlnc_census'.
	irModule := nil
%

category: 'Grail-Private'
method: NestedClassInMethodLocalClassTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/nested_class_in_method_local_class.py'
%

category: 'Grail-Private'
method: NestedClassInMethodLocalClassTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('the_inner_class_captures_the_parameter'
	    'it_captures_a_method_local_too' 'each_call_builds_a_fresh_class'
	    'it_reads_the_outer_attribute_through_a_capture'
	    'dunder_class_is_the_inner_class'
	    'zero_arg_super_resolves_in_the_inner_class' 'three_levels_deep'
	    'several_methods_share_the_capture'
	    'a_base_expression_still_resolves')
%

category: 'Grail-Private'
method: NestedClassInMethodLocalClassTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'mlnc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mlnc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'mlnc_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NestedClassInMethodLocalClassTestCase
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

category: 'Grail-Tests - nested class in a method-local class'
method: NestedClassInMethodLocalClassTestCase
testEveryNestedClassShapeAgreesWithCPythonUnderIR
	"All nine shapes with the seam forced on.

	``each_call_builds_a_fresh_class'' compares IDENTITY, not contents: a class
	hoisted out of the enclosing method would alias two calls, and two
	equal-looking classes is exactly what that bug produces.
	``three_levels_deep'' is the check that nothing about the transport is
	special to exactly two levels."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'nested-class shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - nested class in a method-local class'
method: NestedClassInMethodLocalClassTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the seam fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%

category: 'Grail-Private'
method: NestedClassInMethodLocalClassTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'mlnc_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mlnc_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'mlnc_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - nested class in a method-local class'
method: NestedClassInMethodLocalClassTestCase
testANestedClassIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	10 `cm:method:methodLocalNestedClass' against 13 `cm:eligible' and compiles
	22 of the 47 -- and the behavioural test above STILL PASSES, because the
	text twin answers all nine correctly."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:method:methodLocalNestedClass' ifAbsent: [0]) = 0
		description: 'a nested class still refuses: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 22
		description: 'fewer class methods eligible than the cut measured (23): '
			, counts printString
%
