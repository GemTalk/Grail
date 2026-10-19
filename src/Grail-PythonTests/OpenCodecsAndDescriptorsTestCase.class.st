Class {
	#name : 'OpenCodecsAndDescriptorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OpenCodecsAndDescriptorsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OpenCodecsAndDescriptorsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OpenCodecsAndDescriptorsTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/open_codecs_and_descriptors.py'
		name: 'open_codecs_and_descriptors'

]

{ #category : 'Grail-Tests - open' }
OpenCodecsAndDescriptorsTestCase >> testABytesPathIsAFilesystemName [

	self assertAll: #('a_bytes_path_is_a_filesystem_name')

]

{ #category : 'Grail-Tests - open' }
OpenCodecsAndDescriptorsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 5 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 5

]

{ #category : 'Grail-Tests - open' }
OpenCodecsAndDescriptorsTestCase >> testOpenFdSharesTheFile [

	self assertAll: #('open_fd_shares_the_file'
		'open_refuses_what_cpython_refuses')

]

{ #category : 'Grail-Tests - open' }
OpenCodecsAndDescriptorsTestCase >> testTextModeEncodesThroughTheCodec [

	self assertAll: #('text_mode_encodes_through_the_codec'
		'a_codec_text_file_reports_mode_and_encoding')

]
