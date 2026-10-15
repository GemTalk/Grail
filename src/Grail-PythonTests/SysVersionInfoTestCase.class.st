Class {
	#name : 'SysVersionInfoTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SysVersionInfoTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/sys_version_info.py'

]

{ #category : 'Grail-Private' }
SysVersionInfoTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
SysVersionInfoTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'sys_version_info' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'sys_version_info'.

]

{ #category : 'Grail-Setup' }
SysVersionInfoTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'sys_version_info' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
SysVersionInfoTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 17.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
