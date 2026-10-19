Class {
	#name : 'DecoratorLocalShadowsGlobalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DecoratorLocalShadowsGlobalTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/decorator_local_shadows_global.py'

]

{ #category : 'Grail-Private' }
DecoratorLocalShadowsGlobalTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DecoratorLocalShadowsGlobalTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'decorator_local_shadows_global' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'decorator_local_shadows_global'.

]

{ #category : 'Grail-Setup' }
DecoratorLocalShadowsGlobalTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'decorator_local_shadows_global' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
DecoratorLocalShadowsGlobalTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 8.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
