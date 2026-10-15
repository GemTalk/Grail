Class {
	#name : 'WerkzeugUtilsUpstreamTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
WerkzeugUtilsUpstreamTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/werkzeug_utils_upstream.py'

]

{ #category : 'Grail-Private' }
WerkzeugUtilsUpstreamTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
WerkzeugUtilsUpstreamTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'werkzeug_utils_upstream' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'werkzeug_utils_upstream'.

]

{ #category : 'Grail-Setup' }
WerkzeugUtilsUpstreamTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'werkzeug_utils_upstream' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
WerkzeugUtilsUpstreamTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 10.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
WerkzeugUtilsUpstreamTestCase >> testWerkzeugRowsMatchUpstream [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #WERKZEUG_EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := (testModule @env1:___pyAttrLoad___: #werkzeug_mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
