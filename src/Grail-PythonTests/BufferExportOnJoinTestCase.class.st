Class {
	#name : 'BufferExportOnJoinTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BufferExportOnJoinTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
BufferExportOnJoinTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'buffer_export_on_join' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/buffer_export_on_join.py')
		name: 'buffer_export_on_join'.

]

{ #category : 'Grail-Tests - Resizing during a join' }
BufferExportOnJoinTestCase >> testAnInPlaceByteWriteIsAllowed [
	"The buffer protocol permits it -- the export is a view of storage that
	has not moved -- so this row is what says the guard is on the SIZE and not
	on mutation in general.  Without it, refusing every write would pass every
	test above."

	self assertMatchesCPythonAt: 'overwriting_separator'.

]

{ #category : 'Grail-Tests - Controls' }
BufferExportOnJoinTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Resizing during a join' }
BufferExportOnJoinTestCase >> testEveryResizeOfTheSeparatorIsRefused [
	"All four, because the rule is about RESIZING and not about clear().
	Guarding only the funnel clear() uses left extend() and append() through,
	which is how the second funnel was found -- the fixture probes them for
	that reason rather than because test_builtin asks."

	self assertMatchesCPythonAt: 'clearing_separator'.
	self assertMatchesCPythonAt: 'extending_separator'.
	self assertMatchesCPythonAt: 'appending_separator'.
	self assertMatchesCPythonAt: 'popping_separator'.

]

{ #category : 'Grail-Tests - Controls' }
BufferExportOnJoinTestCase >> testOrdinaryJoinsAreUnaffected [
	"Including bytes.join, which shares the implementation, and the nested
	case: an inner join must release its own export without releasing the
	outer one's, which a flag rather than a count would get wrong."

	self assertMatchesCPythonAt: 'wellbehaved_generator'.
	self assertMatchesCPythonAt: 'list_join'.
	self assertMatchesCPythonAt: 'tuple_join'.
	self assertMatchesCPythonAt: 'empty_join'.
	self assertMatchesCPythonAt: 'bytes_join'.
	self assertMatchesCPythonAt: 'nested_join'.

]

{ #category : 'Grail-Tests - Controls' }
BufferExportOnJoinTestCase >> testOrdinaryResizesAreUnaffected [
	"Outside a join there is no export, so every resizing operation behaves
	exactly as before -- the guard must not become a tax on bytearray."

	self assertMatchesCPythonAt: 'resizes_outside_a_join'.

]
