Class {
	#name : 'JsonDecoderClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
JsonDecoderClassTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/json_decoder_class.py'

]

{ #category : 'Grail-Private' }
JsonDecoderClassTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
JsonDecoderClassTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'json_decoder_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'json_decoder_class'.

]

{ #category : 'Grail-Setup' }
JsonDecoderClassTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'json_decoder_class' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
JsonDecoderClassTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
