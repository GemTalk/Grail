! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for JsonDecoderClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'JsonDecoderClassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
JsonDecoderClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! JsonDecoderClassTestCase
!
! json.JSONDecoder exists, on json and json.decoder, and can be subclassed
! (#1591).  It was missing entirely, so ``class MyDecoder(json.JSONDecoder)''
! failed and json.loads(cls=...) had no base class.  JSONDecoder.gs: decode and
! raw_decode over the json module's parser, with the hooks captured in
! __init__ as CPython's scanner captures them.
!
! Driven by tests/python/json_decoder_class.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
JsonDecoderClassTestCase removeAllMethods.
JsonDecoderClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: JsonDecoderClassTestCase
setUp
	(importlib @env1:modules) removeKey: #'json_decoder_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'json_decoder_class'.
%

category: 'Grail-Setup'
method: JsonDecoderClassTestCase
tearDown
	(importlib @env1:modules) removeKey: #'json_decoder_class' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: JsonDecoderClassTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/json_decoder_class.py'
%

category: 'Grail-Private'
method: JsonDecoderClassTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: JsonDecoderClassTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

