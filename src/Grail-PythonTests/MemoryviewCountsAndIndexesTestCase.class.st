Class {
	#name : 'MemoryviewCountsAndIndexesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewCountsAndIndexesTestCase >> testMemoryviewCountsAndIndexesItsItemsAsCPythonsDoes [
	"tests/python/memoryview_counts_and_indexes.py: Python 3.14's
	memoryview.count and memoryview.index -- counts, clamped bounds, the
	missing-value ValueError, the refusals of a two-dimensional and of a
	released view, and dir() listing both.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'memoryview_counts_and_indexes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_counts_and_indexes.py')
		name: 'memoryview_counts_and_indexes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
