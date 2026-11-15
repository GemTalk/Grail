Class {
	#name : 'SurrogateStrBoundsAreSliceIndicesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SurrogateStrBoundsAreSliceIndicesTestCase >> testEachBoundAnswersAsCPythonsDoes [

	"tests/python/surrogate_str_bounds_are_slice_indices.py: a str holding a lone
	surrogate refuses a non-index start or end of startswith/endswith with the
	slice-index TypeError, as a plain str does.  Each check agrees with CPython
	3.14."

	| fixture |

	importlib @env1:modules removeKey: #'surrogate_str_bounds_are_slice_indices' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/surrogate_str_bounds_are_slice_indices.py'
		name: 'surrogate_str_bounds_are_slice_indices'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
