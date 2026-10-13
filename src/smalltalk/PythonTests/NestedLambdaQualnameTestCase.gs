! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedLambdaQualnameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedLambdaQualnameTestCase'
  instVarNames: #( testModule irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedLambdaQualnameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedLambdaQualnameTestCase
!
! A lambda or genexpr nested in a lambda or genexpr is named through it, as in
! CPython: ``<lambda>.<locals>.<lambda>'', ``<genexpr>.<lambda>'' (#1522).
! Each now pushes a frame on CallAst's scope stack around its body, on both
! codegen paths.  The arity messages quote the same qualname.
!
! Driven by tests/python/nested_lambda_qualname.py, whose EXPECTED table is
! CPython 3.14's output.  A lambda in a default, in a genexpr's outermost
! iterable and in a list comprehension are the guards: all three are named
! from the ENCLOSING scope.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedLambdaQualnameTestCase removeAllMethods.
NestedLambdaQualnameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NestedLambdaQualnameTestCase
setUp
	(importlib @env1:modules) removeKey: #'nested_lambda_qualname' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'nested_lambda_qualname'.
%

category: 'Grail-Setup'
method: NestedLambdaQualnameTestCase
tearDown
	(importlib @env1:modules) removeKey: #'nested_lambda_qualname' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nested_lambda_qualname_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nested_lambda_qualname_ir'.
	testModule := nil.
	irModule := nil
%

category: 'Grail-Private'
method: NestedLambdaQualnameTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/nested_lambda_qualname.py'
%

category: 'Grail-Private'
method: NestedLambdaQualnameTestCase
___irModule___
	"The fixture again with the IR path FORCED ON, under a second module name.
	The scope frames are pushed by a separate emitter on each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nested_lambda_qualname_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nested_lambda_qualname_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'nested_lambda_qualname_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NestedLambdaQualnameTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: NestedLambdaQualnameTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 18.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: NestedLambdaQualnameTestCase
testEveryRowMatchesCPythonUnderIR
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: NestedLambdaQualnameTestCase
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
