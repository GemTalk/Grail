Class {
	#name : 'MemoryviewComparisonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewComparisonsTestCase >> testAMemoryviewComparesWithABufferByItsItemsAndWithAnythingElseNotAtAll [
	"tests/python/memoryview_comparisons.py: a memoryview equals a bytes,
	bytearray, memoryview or array whose items unpack to the same values, from
	either side; with a str, an int or None the comparison is NotImplemented
	and falls back to identity -- where it ended the session -- and a released
	view equals only itself.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'memoryview_comparisons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_comparisons.py')
		name: 'memoryview_comparisons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
