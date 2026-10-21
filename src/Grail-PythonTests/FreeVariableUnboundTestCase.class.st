"Reading a free variable whose binding is empty raises NameError (#1712).
Each test reads tests/python/free_variable_unbound.py, which measures the
behaviour and carries what CPython 3.14 answers.  CI runs the suite under both
code generators, so each arm is held to the same answers."
Class {
	#name : 'FreeVariableUnboundTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FreeVariableUnboundTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FreeVariableUnboundTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'free_variable_unbound' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/free_variable_unbound.py'
		name: 'free_variable_unbound'

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testAClassBodyReadsAFreeVariable [
	"Its own name, and an enclosing local, read before the function binds them."

	#('class_body_reads_its_own_name' 'class_body_reads_an_enclosing_local') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testAClosureReadsAFreeVariable [

	#('closure_before_assignment' 'closure_after_del' 'two_levels_down'
		'lambda_before_assignment' 'generator_expression' 'dict_comprehension_in_a_closure')
			do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testALocalIsStillUnboundLocalError [
	"The scope's own local, a list comprehension (inlined, PEP 709), a
	generator's first iterable and a nested def's default (both evaluated in
	the enclosing scope)."

	#('own_local' 'list_comprehension_is_inlined' 'generator_first_iterable'
		'default_of_a_nested_def') do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testAMethodReadsAFreeVariableWithCPythonsWording [
	"The class-cell path: Python 3.10's text, and no ``name''."

	self assertAgreesWithCPythonAt: 'method_reads_an_enclosing_local'

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
FreeVariableUnboundTestCase >> testExceptUnboundLocalErrorDoesNotCatchIt [

	self assertAgreesWithCPythonAt: 'caught_as_unbound_local_error'

]
