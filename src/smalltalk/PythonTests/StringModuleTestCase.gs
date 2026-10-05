! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StringModuleTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StringModuleTestCase comment:
'The string module: CPython 3.14''s pure-Python string package, over a
pure-Python _string.

This class used to drive the hand-written Smalltalk module directly
(``string @env1:instance''), which is gone: its Template was None, a literal
``string.Formatter()'' answered the class, and Formatter.format took no
*args.  The checks now go through Python, as RandomTestCase''s did when
random.py replaced its native module.

Every expectation in tests/python/string_module.py was produced by CPython
3.14; the fixture gate re-checks it there.'
%

doit
StringModuleTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StringModuleTestCase removeAllMethods: 0.
StringModuleTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StringModuleTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'string_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/string_module.py')
		name: 'string_module'.
%

category: 'Grail-Helpers'
method: StringModuleTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StringModuleTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StringModuleTestCase
testConstantsAndCapwords
	self assertAll: #('constants_and_capwords')
%

category: 'Grail-Tests'
method: StringModuleTestCase
testTemplate
	"Template was None in the native module."

	self assertAll: #('template_substitutes' 'template_subclasses')
%

category: 'Grail-Tests'
method: StringModuleTestCase
testFormatter
	"``string.Formatter()'' builds an instance; format takes *args/**kwargs;
	parse, !a, nested specs and the numbering errors are CPython's; and a
	subclass's get_value/format_field/check_unused_args take part."

	self assertAll: #('formatter_is_callable_as_a_module_attribute'
		'formatter_formats' 'formatter_subclasses_take_part')
%

category: 'Grail-Tests'
method: StringModuleTestCase
testParserHelpers
	"_string.formatter_parser / formatter_field_name_split, ported from
	CPython's unicode_format.h."

	self assertAll: #('the_parser_helpers')
%
