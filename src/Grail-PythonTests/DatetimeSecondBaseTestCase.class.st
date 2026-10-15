Class {
	#name : 'DatetimeSecondBaseTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DatetimeSecondBaseTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
DatetimeSecondBaseTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
DatetimeSecondBaseTestCase >> setUp [

	importlib @env1:modules removeKey: #'datetime_second_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/datetime_second_base.py')
		name: 'datetime_second_base'

]

{ #category : 'Grail-Tests - bases' }
DatetimeSecondBaseTestCase >> testEachDatetimeClassAsASecondBase [

	self assertAll: #('time_second_base' 'date_second_base' 'datetime_second_base'
		'timedelta_second_base' 'tzinfo_second_base' 'the_mro'
		'a_mixin_method_precedes_the_base')

]

{ #category : 'Grail-Tests - bases' }
DatetimeSecondBaseTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 9

]

{ #category : 'Grail-Tests - replace' }
DatetimeSecondBaseTestCase >> testReplaceCallsTheSubclassAsCPythonDoes [

	self assertAll: #('replace_keeps_the_subclass_without_passing_fold'
		'replace_passes_fold_only_when_it_is_one')

]
