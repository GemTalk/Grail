"An unbound built-in method on a subclass instance runs the base's method
(#1613).  Each test reads tests/python/unbound_builtin_method.py, which
measures the behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'UnboundBuiltinMethodTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
UnboundBuiltinMethodTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
UnboundBuiltinMethodTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'unbound_builtin_method' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/unbound_builtin_method.py'
		name: 'unbound_builtin_method'

]

{ #category : 'Grail-Tests' }
UnboundBuiltinMethodTestCase >> testAnIntOrFloatMethodRunsOnASubclassInstance [
	"The boxed base an int or float subclass is rooted at lacked bit_length,
	__add__, to_bytes and is_integer, so the call raised AttributeError."

	#('int_bit_length' 'int_add' 'int_add_answers_an_int' 'int_to_bytes'
		'int_on_an_intenum' 'float_is_integer') do: [:key |
			self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
UnboundBuiltinMethodTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
UnboundBuiltinMethodTestCase >> testIsoformatRunsTheBasesMethod [
	"time's and datetime's fixed form re-sent a selector the subclass's own
	``def isoformat'' compiles, and landed on the override."

	#('time_isoformat' 'datetime_isoformat' 'datetime_isoformat_sep' 'date_isoformat'
		'str_upper') do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
UnboundBuiltinMethodTestCase >> testPlainIsoformatIsUnchanged [

	self assertAgreesWithCPythonAt: 'plain_isoformat_unchanged'

]

{ #category : 'Grail-Tests' }
UnboundBuiltinMethodTestCase >> testStrStillCallsTheOverride [
	"CPython's __str__ calls self.isoformat(), so str() of a subclass that
	overrides it runs the override -- sep included for datetime."

	#('str_of_time_is_virtual' 'str_of_datetime_is_virtual' 'str_of_datetime_passes_sep')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
