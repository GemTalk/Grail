Class {
	#name : 'ZlibDecompressorBookkeepingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ZlibDecompressorBookkeepingTestCase >> testMaxLengthZeroKeepsTheInputAndPicklingIsRefused [
	"tests/python/zlib_decompressor_bookkeeping.py: _ZlibDecompressor's
	decompress(data, max_length=0) inflates nothing and keeps every byte,
	needs_input is True only once all of them are consumed, and pickling is
	refused under every protocol in CPython's words.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'zlib_decompressor_bookkeeping' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/zlib_decompressor_bookkeeping.py')
		name: 'zlib_decompressor_bookkeeping'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
