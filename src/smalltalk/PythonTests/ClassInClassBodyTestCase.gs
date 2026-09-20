! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassInClassBodyTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassInClassBodyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassInClassBodyTestCase - a class nested directly inside another CLASS BODY
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassInClassBodyTestCase removeAllMethods.
ClassInClassBodyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassInClassBodyTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'class_in_class_body_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'class_in_class_body_ir'.
	irModule := nil.
%

category: 'Grail-Private'
method: ClassInClassBodyTestCase
___keys___
	^ #('plain_nesting' 'state_across_methods' 'two_levels' 'inner_base'
	    'inner_derived' 'inner_isinstance' 'signature_shapes'
	    'distinct_classes')
%

category: 'Grail-Private'
method: ClassInClassBodyTestCase
___disagreeingIn___: results
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		((results @env1:__getitem__: k) = true) ifFalse: [bad add: k]].
	^ bad
%

category: 'Grail-Private'
method: ClassInClassBodyTestCase
___irResults___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_in_class_body_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'class_in_class_body_ir'.
	irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_in_class_body.py')
		name: 'class_in_class_body_ir'.
	^ irModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - class in a class body'
method: ClassInClassBodyTestCase
testNestedClassBehavesUnderIR
	"A class nested directly inside another CLASS BODY, with the seam forced on.

	Its methods were refused as `method:classInClassBody' on the reasoning that
	a nested class has no transport helper to hang cut 79's shared build on.
	But the LIFETIME is what cut 79 turned on, and this shape's lifetime is the
	module-level one: such a class is built ONCE, when the enclosing class body
	runs, not once per CALL.  So the ordinary class-method seam already serves
	it, and the refusal was wider than its reason.

	The fixture self-verifies under CPython, so each expectation is CPython's
	behaviour rather than Grail's opinion of it."

	| bad |
	bad := self ___disagreeingIn___: self ___irResults___.
	self assert: bad isEmpty
		description: 'nested-class shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - class in a class body'
method: ClassInClassBodyTestCase
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
