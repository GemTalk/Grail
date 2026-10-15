Class {
	#name : 'PathUriTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PathUriTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PathUriTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PathUriTestCase >> setUp [

	importlib @env1:modules removeKey: #'path_uri' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/path_uri.py')
		name: 'path_uri'

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testAsUriAndFromUriAnswerEachOther [

	self assertAll: #('as_uri_answers_the_file_url' 'from_uri_answers_the_path'
		'from_uri_answers_a_path_object' 'a_path_survives_the_round_trip')

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testAsUriAndFromUriRefuseARelativeOrForeignOne [

	self assertAll: #('as_uri_refuses_a_relative_path'
		'from_uri_refuses_another_scheme' 'from_uri_refuses_a_relative_uri')

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 21 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 21

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testPathnameToUrlQuotesAndMarksTheAuthority [

	self assertAll: #('an_absolute_path_gets_an_empty_authority'
		'add_scheme_puts_file_in_front' 'a_relative_path_gains_no_slashes'
		'a_hash_or_a_question_mark_is_quoted'
		'a_non_ascii_name_is_quoted_as_utf_8'
		'a_path_of_two_slashes_is_not_read_as_a_host')

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testUrlToPathnameReadsWhatTheUrlNames [

	self assertAll: #('a_file_url_becomes_the_path_it_names'
		'an_authorityless_url_works_too' 'require_scheme_takes_the_scheme_off'
		'localhost_is_this_host' 'a_query_and_a_fragment_are_discarded')

]

{ #category : 'Grail-Tests - path_uri' }
PathUriTestCase >> testUrlToPathnameRefusesWhatItCannotName [

	self assertAll: #('require_scheme_refuses_a_url_without_one'
		'require_scheme_refuses_another_scheme' 'another_host_is_refused')

]
