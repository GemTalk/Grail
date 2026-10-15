Class {
	#name : 'OsPathPosixpathNamesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OsPathPosixpathNamesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OsPathPosixpathNamesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OsPathPosixpathNamesTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/os_path_posixpath_names.py'
		name: 'os_path_posixpath_names'

]

{ #category : 'Grail-Tests - coverage' }
OsPathPosixpathNamesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13

]

{ #category : 'Grail-Tests' }
OsPathPosixpathNamesTestCase >> testEveryPosixpathNameIsAnswered [

	self assertAll: #('no_name_missing' 'expandvars' 'from_import' 'getsize'
		'getatime_getctime' 'samestat' 'sameopenfile' 'isdevdrive'
		'allow_missing_is_posixpaths' 'unknown_name')

]

{ #category : 'Grail-Tests' }
OsPathPosixpathNamesTestCase >> testKeywordArguments [
	"relpath(start=) had no keyword form, and realpath's strict= reached
	posixpath as True whatever was passed."

	self assertAll: #('relpath_start_keyword' 'realpath_allow_missing'
		'realpath_strict_still_raises')

]
