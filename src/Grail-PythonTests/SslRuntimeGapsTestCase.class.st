Class {
	#name : 'SslRuntimeGapsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SslRuntimeGapsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SslRuntimeGapsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SslRuntimeGapsTestCase >> setUp [

	importlib @env1:modules removeKey: #'ssl_runtime_gaps' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ssl_runtime_gaps.py')
		name: 'ssl_runtime_gaps'

]

{ #category : 'Grail-Tests - time and mock' }
SslRuntimeGapsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13

]

{ #category : 'Grail-Tests - os' }
SslRuntimeGapsTestCase >> testFsencodeAndSocketDescriptors [

	self assertAll: #('fsencode_and_fsdecode_refuse_a_non_path'
		'a_socket_fd_reads_and_selects'
		'a_closed_socket_fd_is_ebadf')

]

{ #category : 'Grail-Tests - property' }
SslRuntimeGapsTestCase >> testPropertyInsideAnIf [

	self assertAll: #('a_property_defined_in_an_if_is_applied')

]

{ #category : 'Grail-Tests - enum' }
SslRuntimeGapsTestCase >> testSimpleEnumGlobalEnumAndOldConvert [

	self assertAll: #('simple_enum_makes_the_plain_class_an_enum'
		're_flags_are_a_global_int_flag'
		'old_convert_builds_without_exporting')

]

{ #category : 'Grail-Tests - socket' }
SslRuntimeGapsTestCase >> testSocketAddressesAndRecvInto [

	self assertAll: #('socket_addresses_are_tuples'
		'recv_into_takes_nbytes_and_flags')

]

{ #category : 'Grail-Tests - time and mock' }
SslRuntimeGapsTestCase >> testStrptimeAndPatchDict [

	self assertAll: #('time_strptime_is_available'
		'mock_patch_dict_patches_and_restores'
		'event_wait_blocks_until_set_or_timeout')

]

{ #category : 'Grail-Tests - super' }
SslRuntimeGapsTestCase >> testSuperReadsAndSetsAParentProperty [

	self assertAll: #('super_reads_and_sets_the_parent_property')

]
