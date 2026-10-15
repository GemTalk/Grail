Class {
	#name : 'InspectSourceLocationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
InspectSourceLocationTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
InspectSourceLocationTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
InspectSourceLocationTestCase >> setUp [

	importlib @env1:modules removeKey: #'inspect_source_location' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_source_location.py')
		name: 'inspect_source_location'

]

{ #category : 'Grail-Tests - inspect' }
InspectSourceLocationTestCase >> testBlockFinder [

	self assertAll: #('blockfinder_constructs'
		'endofblock_is_an_exception')

]

{ #category : 'Grail-Tests - inspect' }
InspectSourceLocationTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 20 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 20

]

{ #category : 'Grail-Tests - inspect' }
InspectSourceLocationTestCase >> testFindsource [

	self assertAll: #('findsource_lines_are_the_file'
		'findsource_of_a_frame'
		'findsource_of_a_function'
		'findsource_of_a_method'
		'findsource_of_a_traceback'
		'findsource_of_the_module')

]

{ #category : 'Grail-Tests - inspect' }
InspectSourceLocationTestCase >> testFrameCodeStartsAtItsDef [

	self assertAll: #('classmethod_frame_firstlineno'
		'frame_firstlineno_is_the_def_line'
		'method_frame_firstlineno'
		'traceback_frame_firstlineno')

]

{ #category : 'Grail-Tests - inspect' }
InspectSourceLocationTestCase >> testGetfileAndGetsourcefile [

	self assertAll: #('getfile_of_a_bound_method'
		'getfile_of_a_frame'
		'getfile_of_a_function'
		'getfile_of_a_traceback'
		'getfile_of_its_code'
		'getfile_of_the_module'
		'getfile_refuses_a_non_code_object'
		'getsourcefile_of_a_function')

]
