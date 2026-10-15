! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WerkzeugUtilsUpstreamTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WerkzeugUtilsUpstreamTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WerkzeugUtilsUpstreamTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WerkzeugUtilsUpstreamTestCase
!
! werkzeug/utils.py is upstream 3.1.5's file instead of a hand-written stub
! (#1447): header_property and environ_property are real descriptors, so
! request.referrer reads the header and response.location writes one.
! Upstream's cached_property, a property subclass calling super().__init__,
! needed Super >> _implementationOf:in: -- super() now finds a method on a
! built-in's hidden implementation superclass (property's __init__ is
! AbstractPropertyDescriptor's).
!
! Driven by tests/python/werkzeug_utils_upstream.py: EXPECTED is CPython
! 3.14's output; WERKZEUG_EXPECTED was measured with Werkzeug 3.1.5.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WerkzeugUtilsUpstreamTestCase removeAllMethods.
WerkzeugUtilsUpstreamTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WerkzeugUtilsUpstreamTestCase
setUp
	(importlib @env1:modules) removeKey: #'werkzeug_utils_upstream' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'werkzeug_utils_upstream'.
%

category: 'Grail-Setup'
method: WerkzeugUtilsUpstreamTestCase
tearDown
	(importlib @env1:modules) removeKey: #'werkzeug_utils_upstream' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: WerkzeugUtilsUpstreamTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/werkzeug_utils_upstream.py'
%

category: 'Grail-Private'
method: WerkzeugUtilsUpstreamTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: WerkzeugUtilsUpstreamTestCase
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
method: WerkzeugUtilsUpstreamTestCase
testWerkzeugRowsMatchUpstream
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #WERKZEUG_EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := (testModule @env1:___pyAttrLoad___: #werkzeug_mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
