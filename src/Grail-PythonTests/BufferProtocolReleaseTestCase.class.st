Class {
	#name : 'BufferProtocolReleaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BufferProtocolReleaseTestCase >> testAnExporterIsAskedForItsBufferAndToldOfItsRelease [
	"tests/python/buffer_protocol_release.py: memoryview(x) asks a Python
	__buffer__ -- a bytearray subclass's too -- and releasing the view hands
	that view to x's __release_buffer__, or a restricted view when only
	__release_buffer__ is x's own; bytes and bytearray carry the builtin pair.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'buffer_protocol_release' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/buffer_protocol_release.py')
		name: 'buffer_protocol_release'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
