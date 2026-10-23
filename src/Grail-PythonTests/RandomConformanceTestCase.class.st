"random's argument handling and subclassing agree with CPython: repeat's and
choices' count, getrandbits' and randbytes' uint64 conversion, os.urandom's
Py_ssize_t, and a mixin placed before random.Random.  Each test reads
tests/python/random_conformance.py, which measures the behaviour and carries
what CPython 3.14 answers."
Class {
	#name : 'RandomConformanceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
RandomConformanceTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
RandomConformanceTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'random_conformance' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/random_conformance.py'
		name: 'random_conformance'

]

{ #category : 'Grail-Tests' }
RandomConformanceTestCase >> testAMixinBeforeRandomRandomKeepsItsState [

	self assertAgreesWithCPythonAt: 'a_mixin_before_random_random'

]

{ #category : 'Grail-Tests' }
RandomConformanceTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
RandomConformanceTestCase >> testGetrandbitsAndRandbytesConvertAUint64 [

	#('getrandbits_converts_a_uint64' 'getrandbits_is_repeatable' 'randbytes_inherits_the_conversion')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
RandomConformanceTestCase >> testRepeatAndChoicesTakeAnIndexCount [

	#('repeat_times_is_an_index' 'repeat_without_times_is_endless' 'choices_k_is_an_index')
		do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
RandomConformanceTestCase >> testUrandomTakesASsizeT [

	self assertAgreesWithCPythonAt: 'urandom_takes_a_ssize_t'.
	self assertAgreesWithCPythonAt: 'systemrandom_randbytes'

]
