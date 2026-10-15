Class {
	#name : 'ExecZeroArgSuperTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExecZeroArgSuperTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ExecZeroArgSuperTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ExecZeroArgSuperTestCase >> setUp [

	importlib @env1:modules removeKey: #'exec_zero_arg_super' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_zero_arg_super.py')
		name: 'exec_zero_arg_super'

]

{ #category : 'Grail-Tests - exec' }
ExecZeroArgSuperTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 2

]

{ #category : 'Grail-Tests - exec' }
ExecZeroArgSuperTestCase >> testSuperAndClassInAnExecdTree [
	"pytest's case: the module's asserts were rewritten, so it is compiled from
	a tree and exec'd."

	self assertAll: #('exec_of_a_parsed_tree')

]

{ #category : 'Grail-Tests - exec' }
ExecZeroArgSuperTestCase >> testSuperAndClassInExecdSourceText [

	self assertAll: #('exec_of_source_text')

]
