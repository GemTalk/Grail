Class {
	#name : 'ExecBareEvalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExecBareEvalTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ExecBareEvalTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ExecBareEvalTestCase >> setUp [

	importlib @env1:modules removeKey: #'exec_bare_eval' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_bare_eval.py')
		name: 'exec_bare_eval'

]

{ #category : 'Grail-Tests - exec' }
ExecBareEvalTestCase >> testBareEvalAndExecInExecdSource [

	self assertAll: #('exec_of_source_text' 'exec_of_a_parsed_tree')

]

{ #category : 'Grail-Tests - exec' }
ExecBareEvalTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 3

]

{ #category : 'Grail-Tests - exec' }
ExecBareEvalTestCase >> testTheModuleCaseIsUnchanged [

	self assertAll: #('the_same_in_a_module')

]
