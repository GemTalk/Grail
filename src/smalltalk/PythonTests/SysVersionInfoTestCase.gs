! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SysVersionInfoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SysVersionInfoTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SysVersionInfoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SysVersionInfoTestCase
!
! sys.version_info is a struct sequence -- a tuple with named fields -- as in
! CPython.  It was a plain tuple, so sys.version_info.major raised
! AttributeError, which alone stopped beautifulsoup4 importing (#1420).  See
! sys_version_info in sys.gs.
!
! Driven by tests/python/sys_version_info.py, whose EXPECTED table is CPython
! 3.14's output: the named fields, the repr, and the tuple behaviour code
! relies on.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SysVersionInfoTestCase removeAllMethods.
SysVersionInfoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SysVersionInfoTestCase
setUp
	(importlib @env1:modules) removeKey: #'sys_version_info' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'sys_version_info'.
%

category: 'Grail-Setup'
method: SysVersionInfoTestCase
tearDown
	(importlib @env1:modules) removeKey: #'sys_version_info' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: SysVersionInfoTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/sys_version_info.py'
%

category: 'Grail-Private'
method: SysVersionInfoTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: SysVersionInfoTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 17.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

