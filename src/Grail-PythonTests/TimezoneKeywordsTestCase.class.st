Class {
	#name : 'TimezoneKeywordsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
TimezoneKeywordsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
TimezoneKeywordsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
TimezoneKeywordsTestCase >> setUp [

	importlib @env1:modules removeKey: #'timezone_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/timezone_keywords.py')
		name: 'timezone_keywords'

]

{ #category : 'Grail-Tests - keywords' }
TimezoneKeywordsTestCase >> testABadCallSaysWhatCPythonSays [

	self assertAll: #('refusals')

]

{ #category : 'Grail-Tests - keywords' }
TimezoneKeywordsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 6

]

{ #category : 'Grail-Tests - keywords' }
TimezoneKeywordsTestCase >> testOffsetAndNameBindByKeyword [

	self assertAll: #('offset_by_keyword' 'offset_and_name_by_keyword' 'name_by_keyword'
		'a_zero_offset_by_keyword_is_utc' 'positional_unchanged')

]
