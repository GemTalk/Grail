Class {
	#name : 'BytesioGetbufferViewTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BytesioGetbufferViewTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/bytesio_getbuffer_view.py'

]

{ #category : 'Grail-Private' }
BytesioGetbufferViewTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
BytesioGetbufferViewTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'bytesio_getbuffer_view' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'bytesio_getbuffer_view'.

]

{ #category : 'Grail-Setup' }
BytesioGetbufferViewTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'bytesio_getbuffer_view' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
BytesioGetbufferViewTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 27.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
