! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DuplicateArgumentBindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DuplicateArgumentBindingTestCase'
  instVarNames: #( testModule irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DuplicateArgumentBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DuplicateArgumentBindingTestCase
!
! A parameter given both positionally and by keyword raises CPython's
! ``got multiple values for argument'' TypeError (#1477).  The binding took
! the positional value and silently dropped the keyword for every def with a
! default, *args or **kwargs, and for every lambda.  The guard is the first
! of FunctionDefAst's arity checks (printArgCountChecksOn:... and its IR twin).
!
! Driven by tests/python/duplicate_argument_binding.py, whose EXPECTED table is
! CPython 3.14's output.  A positional-only name landing in **kwargs and
! keywords past the positional arguments are the guards.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DuplicateArgumentBindingTestCase removeAllMethods.
DuplicateArgumentBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DuplicateArgumentBindingTestCase
setUp
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'duplicate_argument_binding'.
%

category: 'Grail-Setup'
method: DuplicateArgumentBindingTestCase
tearDown
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'duplicate_argument_binding_ir'.
	testModule := nil.
	irModule := nil
%

category: 'Grail-Private'
method: DuplicateArgumentBindingTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/duplicate_argument_binding.py'
%

category: 'Grail-Private'
method: DuplicateArgumentBindingTestCase
___irModule___
	"The fixture again with the IR path FORCED ON, under a second module name.
	The guard has a separate emitter on each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'duplicate_argument_binding_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'duplicate_argument_binding_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'duplicate_argument_binding_ir'.
	^ irModule
%

category: 'Grail-Private'
method: DuplicateArgumentBindingTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: DuplicateArgumentBindingTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 21.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: DuplicateArgumentBindingTestCase
testEveryRowMatchesCPythonUnderIR
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: DuplicateArgumentBindingTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the IR build fell back to text."
	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
