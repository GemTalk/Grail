! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrNumericTypesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrNumericTypesTestCase comment:
'str.isdecimal / isdigit / isnumeric as Unicode''s Numeric_Type, and the
numeric half of isalnum.

All three answered the kernel''s Character >> isDigit -- the Decimal set of an
older Unicode -- so ''\u00b2''.isdigit() and ''\u00bd''.isnumeric() were
False and isnumeric was isdecimal.  The answers now come from
unicode_numeric_types.gs, generated from CPython''s own str methods by
scripts/generate_unicode_numeric.py.

Every expectation in tests/python/str_numeric_types.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
StrNumericTypesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrNumericTypesTestCase removeAllMethods: 0.
StrNumericTypesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrNumericTypesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_numeric_types' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_numeric_types.py')
		name: 'str_numeric_types'.
%

category: 'Grail-Helpers'
method: StrNumericTypesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrNumericTypesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrNumericTypesTestCase
testNamedExamplesAndWholeStrings
	"Superscript two is a digit, one half is numeric, a Kawi digit is decimal."

	self assertAll: #('named_examples' 'whole_strings')
%

category: 'Grail-Tests'
method: StrNumericTypesTestCase
testEveryRangeBoundary
	"The first and last code point of every generated range, and each
	neighbour -- an off-by-one in a table shows here."

	self assertAll: #('decimal_boundaries' 'digit_boundaries' 'numeric_boundaries')
%

category: 'Grail-Tests'
method: StrNumericTypesTestCase
testNumericsAreAlphanumeric
	self assertAll: #('numerics_are_alphanumeric')
%
