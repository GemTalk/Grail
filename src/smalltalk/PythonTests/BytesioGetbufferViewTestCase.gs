! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BytesioGetbufferViewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytesioGetbufferViewTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BytesioGetbufferViewTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BytesioGetbufferViewTestCase
!
! io.BytesIO.getbuffer() answers a writable memoryview over the stream's own
! buffer (#1637).  It answered a bytes copy, with no .nbytes and no write
! through, so Werkzeug's send_file -- which sizes an in-memory file with
! ``file.getbuffer().nbytes'' -- made flask.send_file(BytesIO(...)) answer 500.
!
! Driven by tests/python/bytesio_getbuffer_view.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BytesioGetbufferViewTestCase removeAllMethods.
BytesioGetbufferViewTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BytesioGetbufferViewTestCase
setUp
	(importlib @env1:modules) removeKey: #'bytesio_getbuffer_view' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'bytesio_getbuffer_view'.
%

category: 'Grail-Setup'
method: BytesioGetbufferViewTestCase
tearDown
	(importlib @env1:modules) removeKey: #'bytesio_getbuffer_view' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: BytesioGetbufferViewTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/bytesio_getbuffer_view.py'
%

category: 'Grail-Private'
method: BytesioGetbufferViewTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: BytesioGetbufferViewTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 27.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

