Class {
	#name : 'PyexpatDocumentEncodingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PyexpatDocumentEncodingTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PyexpatDocumentEncodingTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PyexpatDocumentEncodingTestCase >> setUp [

	importlib @env1:modules removeKey: #'pyexpat_document_encoding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pyexpat_document_encoding.py')
		name: 'pyexpat_document_encoding'

]

{ #category : 'Grail-Tests - encoding' }
PyexpatDocumentEncodingTestCase >> testACharacterSplitAcrossChunksDecodes [

	self assertAll: #('a_character_split_across_chunks_decodes')

]

{ #category : 'Grail-Tests - encoding' }
PyexpatDocumentEncodingTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7

]

{ #category : 'Grail-Tests - encoding' }
PyexpatDocumentEncodingTestCase >> testTheDeclaredEncodingIsUsed [

	self assertAll: #('the_declared_encoding_is_used'
		'pulldom_parses_a_latin_1_document')

]

{ #category : 'Grail-Tests - encoding' }
PyexpatDocumentEncodingTestCase >> testUndecodableBytesAndUnsupportedEncodings [

	self assertAll: #('an_undecodable_byte_is_reported_where_it_is'
		'only_single_byte_encodings_are_supported')

]

{ #category : 'Grail-Tests - encoding' }
PyexpatDocumentEncodingTestCase >> testUtf16DetectionAndIncorrectDeclarations [

	self assertAll: #('utf_16_is_detected_with_or_without_a_byte_order_mark'
		'a_declaration_the_bytes_contradict_is_incorrect')

]
