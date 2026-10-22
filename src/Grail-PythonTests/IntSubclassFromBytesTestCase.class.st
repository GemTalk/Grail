"int.from_bytes is inherited by int subclasses and builds an instance of the
subclass, as CPython's int_from_bytes_impl does; from_bytes and to_bytes refuse
a byteorder other than 'little' or 'big'.  Each test reads
tests/python/int_subclass_from_bytes.py, which measures the behaviour and
carries what CPython 3.14 answers."
Class {
	#name : 'IntSubclassFromBytesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IntSubclassFromBytesTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
IntSubclassFromBytesTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'int_subclass_from_bytes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/int_subclass_from_bytes.py'
		name: 'int_subclass_from_bytes'

]

{ #category : 'Grail-Tests' }
IntSubclassFromBytesTestCase >> testABadByteorderRaisesValueError [

	self assertAgreesWithCPythonAt: 'a_bad_byteorder'.
	self assertAgreesWithCPythonAt: 'a_byteorder_with_a_nul'.
	self assertAgreesWithCPythonAt: 'to_bytes_checks_byteorder_too'

]

{ #category : 'Grail-Tests' }
IntSubclassFromBytesTestCase >> testASubclassCallsFromBytesInEveryForm [

	#('two_arguments' 'one_argument' 'signed' 'keywords' 'through_an_instance' 'visible_to_hasattr_and_dir')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
IntSubclassFromBytesTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
IntSubclassFromBytesTestCase >> testTheResultIsBuiltByTheSubclass [

	#('the_subclass_new_runs' 'an_intflag_answers_its_member' 'plain_int_unchanged' 'a_str_argument' 'an_object_with_dunder_bytes')
		do: [:key | self assertAgreesWithCPythonAt: key]

]
