! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrFormatFieldsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrFormatFieldsTestCase comment:
'str.format / format_map as CPython''s do_string_format, ported routine for
routine from Objects/stringlib/unicode_format.h (CharacterCollection >>
_format:kw: and the ___format*___ helpers it calls).

The hand-written parser it replaces had no {0.attr} / {0[i]} -- ''{0.real}''
.format(3) died in an uncatchable Smalltalk ArgumentError -- accepted mixed
manual and automatic numbering, ignored !a, let format_map take positional
fields, and rendered a __format__ that answered a non-str.

Every expectation in tests/python/str_format_fields.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
StrFormatFieldsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrFormatFieldsTestCase removeAllMethods: 0.
StrFormatFieldsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrFormatFieldsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_format_fields' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_format_fields.py')
		name: 'str_format_fields'.
%

category: 'Grail-Helpers'
method: StrFormatFieldsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrFormatFieldsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrFormatFieldsTestCase
testFieldAccess
	"``.attr'' through getattr and ``[key]'' through __getitem__ -- an int key
	when all decimal digits, any Unicode decimal digit included."

	self assertAll: #('field_access')
%

category: 'Grail-Tests'
method: StrFormatFieldsTestCase
testNumberingAndConversions
	self assertAll: #('numbering' 'conversions')
%

category: 'Grail-Tests'
method: StrFormatFieldsTestCase
testParseErrors
	"Every one of CPython's parse errors, in CPython's order."

	self assertAll: #('parse_errors')
%

category: 'Grail-Tests'
method: StrFormatFieldsTestCase
testFormatMapAndResults
	self assertAll: #('format_map_rules' 'a_bad_format_result_is_refused'
		'key_error_carries_the_key')
%
