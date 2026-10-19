Class {
	#name : 'PropertyBeatsStoredValueTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PropertyBeatsStoredValueTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/property_beats_stored_value.py'

]

{ #category : 'Grail-Private' }
PropertyBeatsStoredValueTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
PropertyBeatsStoredValueTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'property_beats_stored_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'property_beats_stored_value'.

]

{ #category : 'Grail-Setup' }
PropertyBeatsStoredValueTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'property_beats_stored_value' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
PropertyBeatsStoredValueTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 18.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
