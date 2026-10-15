Class {
	#name : 'PrintOutputRoutingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
PrintOutputRoutingTestCase >> setUp [
	"Reload tests/python/print_output_routing.py fresh each test -- one fixture
	reassigns sys.stdout and restores it."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'print_output_routing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/print_output_routing.py')
		name: 'print_output_routing'.

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testABadSeparatorTypeIsATypeError [
	"CPython's wording, since test_print matches the message text."

	self assert: testModule @env1:a_bad_separator_type_is_a_type_error asArray
		equals: #( 'sep must be None or a string, not int'
			'end must be None or a string, not int' ).

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testAFileWithoutWriteIsAnAttributeError [
	"``file'' only has to provide write().  A bare send produced an
	UNCATCHABLE MessageNotUnderstood, so the assertRaises could never pass."

	self assert: testModule @env1:a_file_without_write_is_an_attribute_error
		equals: 'AttributeError'.

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testAnExceptionFromFlushPropagates [
	"Deliberately NOT guarded: swallowing an error raised by the file's flush
	turns a reported failure into a silent one."

	self assert: testModule @env1:an_exception_from_flush_propagates
		equals: 'RuntimeError'.

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testAReassignedSysStdoutIsHonoured [
	"THE OTHER HALF, and test.support.captured_stdout()'s whole mechanism.  The
	accessor send this replaced answered the None sys.stdout was built with and
	shadowed the assignment, so the buffer stayed empty."

	self assert: testModule @env1:a_reassigned_sys_stdout_is_honoured equals: '
123
'.

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testEndReplacesTheNewline [
	"``end'' replaces the trailing newline rather than adding to it."

	self assert: testModule @env1:end_replaces_the_newline asArray
		equals: #( 'a' 'a+' '1*a*1.3+' ).

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testFlushIsCalledWhenAsked [
	"Once per truthy flush=, and not otherwise."

	self assert: testModule @env1:flush_is_called_when_asked asArray
		equals: (Array with: '123
' with: 2).

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testNoArgumentsPrintsJustTheEnd [
	"``print()'' writes the end and nothing else -- with the separator applied
	after each object this still worked, so it pins the empty case explicitly."

	self assert: testModule @env1:no_arguments_prints_just_the_end equals: '
'.

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testNoneMeansTheDefault [
	"``sep=None'' is the same as omitting it, NOT an empty separator."

	self assert: testModule @env1:none_means_the_default asArray
		equals: #( 'a
 b
' 'a
 b
' 'a
 b
' ).

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testObjectsAreStringified [
	"str(), with __repr__ as the fallback -- the two-step the original had, kept."

	self assert: testModule @env1:objects_are_stringified asArray
		equals: #( '*
' 'None
' '* 1
' ).

]

{ #category : 'Grail-Tests' }
PrintOutputRoutingTestCase >> testSeparatorIsBetweenNotAfter [
	"THE BUG.  A trailing separator after the last object is not CPython's
	output -- and nothing could observe it while ``file'' was ignored too."

	self assert: testModule @env1:separator_is_between_not_after asArray
		equals: #( 'a b
' '1*2*3
' 'a
' ).

]
