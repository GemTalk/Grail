Class {
	#name : 'HttpClientStatusConstantsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
HttpClientStatusConstantsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
HttpClientStatusConstantsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
HttpClientStatusConstantsTestCase >> setUp [

	importlib @env1:modules removeKey: #'http_client_status_constants' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/http_client_status_constants.py')
		name: 'http_client_status_constants'

]

{ #category : 'Grail-Tests - status' }
HttpClientStatusConstantsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 5

]

{ #category : 'Grail-Tests - status' }
HttpClientStatusConstantsTestCase >> testEveryStatusIsAModuleConstant [

	self assertAll: #('google_auths_constants' 'a_constant_is_the_status_member'
		'every_member_is_a_module_constant')

]

{ #category : 'Grail-Tests - status' }
HttpClientStatusConstantsTestCase >> testResponsesNamesEveryStatus [

	self assertAll: #('responses_names_every_status' 'responses_maps_a_code_to_its_phrase')

]
