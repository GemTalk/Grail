Class {
	#name : 'ZlibPresetDictionaryTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ZlibPresetDictionaryTestCase >> testACompressorsPresetDictionaryIsTheOneItsDecompressorInflatesWith [
	"tests/python/zlib_preset_dictionary.py: compressobj(zdict=d) presets d,
	decompressobj(zdict=d) inflates with it when the stream asks -- or at once
	for a raw stream -- from bytes, a bytearray or a memoryview, whole or a
	byte at a time; a stream that asks with none, or with the wrong one, is
	zlib.error, and a zdict that is not a buffer is refused.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'zlib_preset_dictionary' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/zlib_preset_dictionary.py')
		name: 'zlib_preset_dictionary'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
