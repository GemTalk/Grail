Class {
	#name : 'SliceBoundsRaiseCPythonsTypeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SliceBoundsRaiseCPythonsTypeErrorTestCase >> testEachBoundAnswersAsCPythonsDoes [

	"tests/python/slice_bounds_raise_cpythons_type_error.py: a slice bound that is
	not an int, None or an __index__ object raises CPython's slice TypeError,
	in subscripts, slice.indices and the str, bytes, bytearray, list, tuple and
	memoryview methods that take a start and an end.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'slice_bounds_raise_cpythons_type_error' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/slice_bounds_raise_cpythons_type_error.py'
		name: 'slice_bounds_raise_cpythons_type_error'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]
