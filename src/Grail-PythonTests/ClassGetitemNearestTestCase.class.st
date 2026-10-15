Class {
	#name : 'ClassGetitemNearestTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassGetitemNearestTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ClassGetitemNearestTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ClassGetitemNearestTestCase >> setUp [

	importlib @env1:modules removeKey: #'class_getitem_nearest' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_getitem_nearest.py')
		name: 'class_getitem_nearest'

]

{ #category : 'Grail-Tests - nearest wins' }
ClassGetitemNearestTestCase >> testAClassmethodOverAnInheritedDef [

	self assertAll: #('a_classmethod_over_generics_def' 'inherited_by_a_subclass_with_its_own_cls'
		'a_classmethod_over_an_inherited_def' 'the_instance_side_still_reaches_the_classmethod')

]

{ #category : 'Grail-Tests - nearest wins' }
ClassGetitemNearestTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 8

]

{ #category : 'Grail-Tests - nearest wins' }
ClassGetitemNearestTestCase >> testTheOtherShapesAreUnchanged [

	self assertAll: #('a_def_over_an_inherited_classmethod' 'an_inherited_classmethod'
		'the_plain_def_alone' 'a_plain_generic_still_parameterises')

]
