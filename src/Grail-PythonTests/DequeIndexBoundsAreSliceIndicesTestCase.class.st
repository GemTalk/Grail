Class {
	#name : 'DequeIndexBoundsAreSliceIndicesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DequeIndexBoundsAreSliceIndicesTestCase >> testEachBoundAnswersAsCPythonsDoes [

	"tests/python/deque_index_bounds_are_slice_indices.py: deque.index takes an int
	or an __index__ object as its start and stop, and refuses anything else, None
	included, with CPython's slice TypeError.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'deque_index_bounds_are_slice_indices' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/deque_index_bounds_are_slice_indices.py'
		name: 'deque_index_bounds_are_slice_indices'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
