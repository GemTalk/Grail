Class {
	#name : 'CtypesDataTypesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
CtypesDataTypesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
CtypesDataTypesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
CtypesDataTypesTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/ctypes_data_types.py'
		name: 'ctypes_data_types'

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testArraysAndStringBuffers [

	self assertAll: #('arrays' 'array_errors' 'string_buffers')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists in this class name 34 checks.  A check added to the fixture
	without being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 34

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testFromBufferSharesMemory [

	self assertAll: #('bytes_of_a_value' 'from_buffer_reads_the_bits'
		'from_buffer_shares_memory' 'from_buffer_bytearray_offset'
		'from_buffer_errors' 'from_buffer_copy')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testLoadingALibraryFailsAsAMissingOneDoes [
	"Grail has no FFI, so every CDLL is an OSError -- the answer callers
	already handle for a library that is not installed."

	self assertAll: #('missing_library_is_an_oserror' 'find_library_of_a_missing_library')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testPointers [

	self assertAll: #('pointers_refer_to_their_target' 'null_pointer' 'byref')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testSimpleTypesConvertAsCPythonDoes [

	self assertAll: #('integers_wrap' 'integer_errors' 'reals' 'bool_and_chars'
		'pointer_values' 'py_object' 'reprs' 'types_and_aliases' 'sizes' 'errno')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testStructUnpacksCAsBytes [

	self assertAll: #('struct_unpacks_c_as_bytes')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testStructuresAndUnionsUseNativeLayout [

	self assertAll: #('structure_layout' 'structure_values' 'nested_structure_and_array'
		'structure_subclass' 'union' 'fields_set_after_the_class')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testThreadingHTTPServer [

	self assertAll: #('threading_http_server')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testWeakrefProxyTypeNames [

	self assertAll: #('weakref_proxy_types')

]

{ #category : 'Grail-Tests' }
CtypesDataTypesTestCase >> testWebbrowserImports [

	self assertAll: #('webbrowser_imports')

]
