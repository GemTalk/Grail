"A class reads type's own methods as attributes, as CPython's classes do.
Each test reads tests/python/type_methods_on_classes.py, which measures the
behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'TypeMethodsOnClassesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeMethodsOnClassesTestCase >> assert: aKey answersAsIn: aTableName [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: aTableName) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Private' }
TypeMethodsOnClassesTestCase >> assertAgreesWithCPythonAt: aKey [

	self assert: aKey answersAsIn: #EXPECTED

]

{ #category : 'Grail-Setup' }
TypeMethodsOnClassesTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'type_methods_on_classes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/type_methods_on_classes.py'
		name: 'type_methods_on_classes'

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testABuiltinsOwnInstancecheckAnswersAsIsinstanceDoes [
	"int's and float's class-side hooks answered for their WRAPPERS alone, so
	``int.__instancecheck__(3)'' was False."

	#('int_instancecheck' 'int_instancecheck_bool' 'float_instancecheck') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testAClassWithNoMetaclassHasTypesMethods [
	"Plain, int and object answered none of __call__, __instancecheck__ and
	__subclasscheck__ (int only its own __instancecheck__)."

	#('plain_has' 'int_has' 'object_has' 'with_meta_has') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testAMetaclassCallStillWins [

	self assertAgreesWithCPythonAt: 'metaclass_call_wins'

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '20 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testHasattrCallSaysAClassIsCallable [
	"The old callable() idiom: a class was the one callable it said no to."

	self assertAgreesWithCPythonAt: 'callable_by_hasattr'

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testOnlyTypesOwnMethodsAreRead [
	"type's chain ends in object, whose protocol refusals (#1632) stay
	non-attributes; and nothing is added to the class's own dict or dir."

	#('plain_has_no_refusal' 'object_has_no_refusal' 'call_not_in_class_dict'
		'call_not_in_dir') do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testTheChecksAnswerForAClassWithNoMetaclass [
	"type.__instancecheck__(Plain, x) was an uncatchable MessageNotUnderstood:
	the default check self-sent a method only type defines."

	#('plain_instancecheck' 'plain_instancecheck_other' 'plain_subclasscheck'
		'type_instancecheck_unbound' 'type_subclasscheck_unbound') do: [:key |
			self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
TypeMethodsOnClassesTestCase >> testTypesCallInstantiates [

	self assertAgreesWithCPythonAt: 'plain_call_makes_an_instance'.
	self assertAgreesWithCPythonAt: 'int_call_converts'

]
