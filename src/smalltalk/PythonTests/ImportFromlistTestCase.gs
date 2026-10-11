! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportFromlistTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportFromlistTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportFromlistTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportFromlistTestCase (issue #1223)
!
! __import__'s fromlist only imports a PACKAGE's submodules and never raises
! for a missing name (importlib ___import__:kw:); the ``from M import name''
! statement raises ``cannot import name'' when it reads the name (object >>
! ___importFrom___:, importlib ___importFromMiss___:of:).  An empty fromlist
! name used to end the process with the kernel's uncatchable ArgumentError.
!
! Driven by tests/python/import_fromlist.py, whose EXPECTED table is CPython
! 3.14's output.  The committed-submodule half of the issue (a fresh gem's
! ``from PKG import mod'' must run mod's staleness check) needs a commit, which
! a test case cannot make; the fixture pins the in-session half.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportFromlistTestCase removeAllMethods.
ImportFromlistTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportFromlistTestCase
setUp
	(importlib @env1:modules) removeKey: #'import_fromlist' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_fromlist.py')
		name: 'import_fromlist'.
%

category: 'Grail-Setup'
method: ImportFromlistTestCase
tearDown
	(importlib @env1:modules) removeKey: #'import_fromlist' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: ImportFromlistTestCase
testFromlistMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 17.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
