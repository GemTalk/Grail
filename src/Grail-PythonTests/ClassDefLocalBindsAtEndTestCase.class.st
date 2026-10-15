Class {
	#name : 'ClassDefLocalBindsAtEndTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassDefLocalBindsAtEndTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_def_local_binds_at_end.py'

]

{ #category : 'Grail-Private' }
ClassDefLocalBindsAtEndTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
ClassDefLocalBindsAtEndTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'class_def_local_binds_at_end' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_def_local_binds_at_end'.

]

{ #category : 'Grail-Setup' }
ClassDefLocalBindsAtEndTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'class_def_local_binds_at_end' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassDefLocalBindsAtEndTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 29.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
