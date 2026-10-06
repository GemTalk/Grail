! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrAlphaTypesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrAlphaTypesTestCase comment:
'str.isalpha as the general categories Lu, Ll, Lt, Lm and Lo, and str.isalnum
as isalpha or isnumeric.

isalpha answered the kernel''s Character >> isLetter -- the same definition
from an older Unicode -- so 24,262 newer letters (CJK extensions, Egyptian
hieroglyphs, Tangut, ...) were not alphabetic, and isalnum missed them too.
The answers now come from unicode_char_types.gs, generated from CPython''s own
str methods by scripts/generate_unicode_char_types.py.

Every expectation in tests/python/str_alpha_types.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
StrAlphaTypesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrAlphaTypesTestCase removeAllMethods: 0.
StrAlphaTypesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrAlphaTypesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_alpha_types' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_alpha_types.py')
		name: 'str_alpha_types'.
%

category: 'Grail-Helpers'
method: StrAlphaTypesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrAlphaTypesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrAlphaTypesTestCase
testNamedExamplesAndWholeStrings
	"A CJK Extension B ideograph, an Egyptian hieroglyph and a Tangut
	character are letters; a combining mark is not."

	self assertAll: #('named_examples' 'whole_strings')
%

category: 'Grail-Tests'
method: StrAlphaTypesTestCase
testEveryRangeBoundary
	"The first and last code point of every generated range, and each
	neighbour -- an off-by-one in a table shows here."

	self assertAll: #('alpha_boundaries' 'alnum_boundaries')
%
