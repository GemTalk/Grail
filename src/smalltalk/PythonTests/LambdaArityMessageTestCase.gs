! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LambdaArityMessageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LambdaArityMessageTestCase'
  instVarNames: #( testModule irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LambdaArityMessageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LambdaArityMessageTestCase
!
! A lambda checks how it was called, as a def does (#1493): too many positional
! arguments and an unexpected keyword raise CPython's TypeError, where a lambda
! used to drop the extras silently -- ``(lambda a: a)(1, 2)'' answered 1.  The
! guards are FunctionDefAst's own, emitted through a stand-in def
! (LambdaAst >> ___argCountCheckDef___), and every message names the lambda by
! its qualified name.
!
! Driven by tests/python/lambda_arity_messages.py, whose EXPECTED table is
! CPython 3.14's output.  The rows that must still SUCCEED (*args, **kwargs, a
! positional-only name landing in **kwargs) are the negative control.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LambdaArityMessageTestCase removeAllMethods.
LambdaArityMessageTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: LambdaArityMessageTestCase
setUp
	(importlib @env1:modules) removeKey: #'lambda_arity_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'lambda_arity_messages'.
%

category: 'Grail-Setup'
method: LambdaArityMessageTestCase
tearDown
	(importlib @env1:modules) removeKey: #'lambda_arity_messages' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'lambda_arity_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'lambda_arity_ir'.
	testModule := nil.
	irModule := nil
%

category: 'Grail-Private'
method: LambdaArityMessageTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/lambda_arity_messages.py'
%

category: 'Grail-Private'
method: LambdaArityMessageTestCase
___irModule___
	"The fixture again with the IR path FORCED ON, under a second module name.
	The guards have a separate emitter on each path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'lambda_arity_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'lambda_arity_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'lambda_arity_ir'.
	^ irModule
%

category: 'Grail-Private'
method: LambdaArityMessageTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: LambdaArityMessageTestCase
testEveryMessageMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 32.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: LambdaArityMessageTestCase
testEveryMessageMatchesCPythonUnderIR
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: LambdaArityMessageTestCase
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
