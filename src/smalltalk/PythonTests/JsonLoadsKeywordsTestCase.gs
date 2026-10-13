! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for JsonLoadsKeywordsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'JsonLoadsKeywordsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
JsonLoadsKeywordsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! JsonLoadsKeywordsTestCase
!
! json.loads() and json.load() take CPython's decoder keywords --
! object_pairs_hook, object_hook, parse_float, parse_int, parse_constant, cls,
! strict -- where the native module had a one-argument loads() and refused
! them all (botocore's ``json.loads(payload, object_pairs_hook=OrderedDict)''
! stopped every boto3 client).  Also NaN / Infinity / -Infinity, which CPython
! accepts by default, and strict's refusal of a raw control character.
!
! Driven by tests/python/json_loads_keywords.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
JsonLoadsKeywordsTestCase removeAllMethods.
JsonLoadsKeywordsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: JsonLoadsKeywordsTestCase
setUp
	(importlib @env1:modules) removeKey: #'json_loads_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/json_loads_keywords.py')
		name: 'json_loads_keywords'.
%

category: 'Grail-Setup'
method: JsonLoadsKeywordsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'json_loads_keywords' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: JsonLoadsKeywordsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 19.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
