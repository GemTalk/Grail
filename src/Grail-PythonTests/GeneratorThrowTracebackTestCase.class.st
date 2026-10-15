Class {
	#name : 'GeneratorThrowTracebackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
GeneratorThrowTracebackTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
GeneratorThrowTracebackTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
GeneratorThrowTracebackTestCase >> setUp [

	importlib @env1:modules removeKey: #'generator_throw_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_throw_traceback.py')
		name: 'generator_throw_traceback'

]

{ #category : 'Grail-Tests - __traceback__' }
GeneratorThrowTracebackTestCase >> testAssigningTheTracebackSetsTheSlot [

	self assertAll: #('assignment_is_the_slot'
		'assignment_then_a_bare_raise_adds_nothing'
		'assignment_then_raise_e_adds_its_frame'
		'assigning_a_non_traceback_is_refused'
		'deleting_it_is_refused')

]

{ #category : 'Grail-Tests - throw' }
GeneratorThrowTracebackTestCase >> testAWithInTheGeneratorKeepsTheChain [

	self assertAll: #('a_with_in_the_generator_keeps_the_chain'
		'a_with_in_the_generator_keeps_a_reraised_chain'
		'a_contextmanager_in_the_generator_keeps_the_chain'
		'a_contextmanager_in_the_generator_keeps_a_reraised_chain')

]

{ #category : 'Grail-Tests - throw' }
GeneratorThrowTracebackTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12

]

{ #category : 'Grail-Tests - throw' }
GeneratorThrowTracebackTestCase >> testThrowAddsFramesOnTopOfTheChain [

	self assertAll: #('throw_prepends_the_generator_and_the_caller'
		'throw_keeps_a_reraised_chain'
		'a_catch_inside_the_generator_sees_its_own_frame')

]
