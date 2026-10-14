! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassStatementInNewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassStatementInNewTestCase'
  instVarNames: #( testModule irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassStatementInNewTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassStatementInNewTestCase
!
! A class statement inside __new__, __init_subclass__ or __class_getitem__
! works on the IR arm (#1424).  Those compile instance-side but run with the
! CLASS as receiver, so the class statement's helper send looked on the
! metaclass and died with an uncatchable MessageNotUnderstood -- pytz's
! LazyList / LazySet.  See ClassDefAst >> ___irRunsWithClassReceiver___.
!
! Driven by tests/python/class_statement_in_new.py, whose EXPECTED table is
! CPython 3.14's output.  A classmethod and an ordinary method are the guards.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassStatementInNewTestCase removeAllMethods.
ClassStatementInNewTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassStatementInNewTestCase
setUp
	(importlib @env1:modules) removeKey: #'class_statement_in_new' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_statement_in_new'.
%

category: 'Grail-Setup'
method: ClassStatementInNewTestCase
tearDown
	(importlib @env1:modules) removeKey: #'class_statement_in_new' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'class_statement_in_new_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'class_statement_in_new_ir'.
	testModule := nil.
	irModule := nil
%

category: 'Grail-Private'
method: ClassStatementInNewTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_statement_in_new.py'
%

category: 'Grail-Private'
method: ClassStatementInNewTestCase
___irModule___
	"The fixture again with the IR path FORCED ON, under a second module name.
	The class helper exists only on the IR path, and a run with the flag
	off would exercise only the text one."
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'class_statement_in_new_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'class_statement_in_new_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'class_statement_in_new_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ClassStatementInNewTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ClassStatementInNewTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 10.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: ClassStatementInNewTestCase
testEveryRowMatchesCPythonUnderIR
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: ClassStatementInNewTestCase
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
