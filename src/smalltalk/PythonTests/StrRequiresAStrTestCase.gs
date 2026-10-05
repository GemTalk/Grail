! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrRequiresAStrTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrRequiresAStrTestCase comment:
'A __str__ that answers something other than a str.

CPython''s PyObject_Str refuses it with ``TypeError: __str__ returned
non-string (type int)''.  Grail handed the value on -- str(x) answered an int,
and %s / str.format rendered a None as ''aNoneType''.  str.__new__,
object.__format__, str.format''s !s, print and input now send
object >> ___strResult___ to what __str__ answered.  ReprRequiresAStrTestCase
is the __repr__ half.

Every expectation in tests/python/str_requires_a_str.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
StrRequiresAStrTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrRequiresAStrTestCase removeAllMethods: 0.
StrRequiresAStrTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrRequiresAStrTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_requires_a_str' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_requires_a_str.py')
		name: 'str_requires_a_str'.
%

category: 'Grail-Helpers'
method: StrRequiresAStrTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrRequiresAStrTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrRequiresAStrTestCase
testStrRefusesANonStr
	"str() itself, for every kind of non-str answer."

	self assertAll: #('str_refuses_a_non_str')
%

category: 'Grail-Tests'
method: StrRequiresAStrTestCase
testEveryRouteChecks
	"%s, f-strings, format(), str.format/format_map, print, str(exception) and
	str.__new__ on a subclass -- for a bad __str__, and for a bad __repr__ that
	object.__str__ fell back to (reported as __str__, as CPython does)."

	self assertAll: #('every_route_checks' 'a_repr_fallback_is_reported_as_str')
%

category: 'Grail-Tests'
method: StrRequiresAStrTestCase
testValidResultsAreUnchanged
	"A str subclass result, a raising __str__, and None through every route."

	self assertAll: #('valid_results_are_unchanged')
%
