Class {
	#name : 'WarnExplicitKeywordsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
WarnExplicitKeywordsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
WarnExplicitKeywordsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
WarnExplicitKeywordsTestCase >> setUp [

	importlib @env1:modules removeKey: #'warn_explicit_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warn_explicit_keywords.py')
		name: 'warn_explicit_keywords'

]

{ #category : 'Grail-Tests - keywords' }
WarnExplicitKeywordsTestCase >> testAMissingArgumentIsNamed [

	self assertAll: #('a_missing_lineno_names_itself' 'a_missing_filename_names_itself')

]

{ #category : 'Grail-Tests - keywords' }
WarnExplicitKeywordsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 5

]

{ #category : 'Grail-Tests - keywords' }
WarnExplicitKeywordsTestCase >> testRequiredArgumentsBindByKeyword [

	self assertAll: #('pytests_call_shape' 'every_required_argument_by_keyword'
		'positional_still_works')

]
