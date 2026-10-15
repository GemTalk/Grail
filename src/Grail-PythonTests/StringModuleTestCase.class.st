"The string module: CPython 3.14's pure-Python string package, over a
pure-Python _string.

This class used to drive the hand-written Smalltalk module directly
(``string @env1:instance'), which is gone: its Template was None, a literal
``string.Formatter()' answered the class, and Formatter.format took no
*args.  The checks now go through Python, as RandomTestCase's did when
random.py replaced its native module.

Every expectation in tests/python/string_module.py was produced by CPython
3.14; the fixture gate re-checks it there."
Class {
	#name : 'StringModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
StringModuleTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
StringModuleTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
StringModuleTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'string_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/string_module.py')
		name: 'string_module'.

]

{ #category : 'Grail-Tests' }
StringModuleTestCase >> testConstantsAndCapwords [
	self assertAll: #('constants_and_capwords')

]

{ #category : 'Grail-Tests' }
StringModuleTestCase >> testFormatter [
	"``string.Formatter()'' builds an instance; format takes *args/**kwargs;
	parse, !a, nested specs and the numbering errors are CPython's; and a
	subclass's get_value/format_field/check_unused_args take part."

	self assertAll: #('formatter_is_callable_as_a_module_attribute'
		'formatter_formats' 'formatter_subclasses_take_part')

]

{ #category : 'Grail-Tests' }
StringModuleTestCase >> testParserHelpers [
	"_string.formatter_parser / formatter_field_name_split, ported from
	CPython's unicode_format.h."

	self assertAll: #('the_parser_helpers')

]

{ #category : 'Grail-Tests' }
StringModuleTestCase >> testTemplate [
	"Template was None in the native module."

	self assertAll: #('template_substitutes' 'template_subclasses')

]
