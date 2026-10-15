Class {
	#name : 'ExecMethodCopiesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExecMethodCopiesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ExecMethodCopiesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ExecMethodCopiesTestCase >> setUp [

	importlib @env1:modules removeKey: #'exec_method_copies' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_method_copies.py')
		name: 'exec_method_copies'

]

{ #category : 'Grail-Tests - copies keep the scope' }
ExecMethodCopiesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 3 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 3

]

{ #category : 'Grail-Tests - copies keep the scope' }
ExecMethodCopiesTestCase >> testMethodsExecdIntoADictionary [

	self assertAll: #('exec_into_a_dict')

]

{ #category : 'Grail-Tests - copies keep the scope' }
ExecMethodCopiesTestCase >> testMethodsExecdIntoAModule [
	"pytest's case: the globals are a module's, the one its loader made."

	self assertAll: #('exec_into_a_module' 'the_global_is_still_the_module')

]
