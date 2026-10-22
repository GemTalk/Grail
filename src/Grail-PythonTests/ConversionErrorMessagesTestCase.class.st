"A built-in that rejects its argument says so in CPython's words.  Each test
reads tests/python/conversion_error_messages.py, which measures the behaviour
and carries what CPython 3.14 answers, for an object(), a Python instance, a
function and a module."
Class {
	#name : 'ConversionErrorMessagesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ConversionErrorMessagesTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
ConversionErrorMessagesTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'conversion_error_messages' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/conversion_error_messages.py'
		name: 'conversion_error_messages'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testAConversionNamesTheArgumentsPythonType [
	"float(), len(), math's and the index conversions named the Smalltalk class:
	'Object', 'BoundMethod', the module's own name."

	#('float' 'len' 'math_floor' 'math_ceil' 'math_trunc' 'math_sqrt' 'hex' 'chr' 'operator_index')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testBytesSaysItCannotConvert [

	self assertAgreesWithCPythonAt: 'bytes'.
	self assertAgreesWithCPythonAt: 'bytearray'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testIntUsesCPythonsWording [

	self assertAgreesWithCPythonAt: 'int'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testNextSaysNotAnIterator [

	self assertAgreesWithCPythonAt: 'next'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testOrdNamesANonString [

	self assertAgreesWithCPythonAt: 'ord'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testReversedOfAFunctionIsNotReversible [
	"A function's subscript refusal looked like a real __getitem__."

	self assertAgreesWithCPythonAt: 'reversed_function'.
	self assertAgreesWithCPythonAt: 'reversed_object'

]

{ #category : 'Grail-Tests' }
ConversionErrorMessagesTestCase >> testValidArgumentsStillConvert [

	self assertAgreesWithCPythonAt: 'still_converts'

]
