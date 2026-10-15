Class {
	#name : 'DatetimeIsADateTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DatetimeIsADateTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/datetime_is_a_date.py'

]

{ #category : 'Grail-Private' }
DatetimeIsADateTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DatetimeIsADateTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'datetime_is_a_date' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'datetime_is_a_date'.

]

{ #category : 'Grail-Setup' }
DatetimeIsADateTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'datetime_is_a_date' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
DatetimeIsADateTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 47.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
