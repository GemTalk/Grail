Class {
	#name : 'MemoryviewShapedCastTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewShapedCastTestCase >> testACastWithAShapeGivesTheViewThatShape [
	"tests/python/memoryview_shaped_cast.py: memoryview.cast(fmt, shape) answers
	a C-contiguous N-D view -- len() its first dimension, tolist() nested, an
	item by a tuple of indices, the shape kept by memoryview(view) -- with
	CPython's refusals; and bytes.maketrans and translate take any buffer, so
	base64 accepts both.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'memoryview_shaped_cast' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_shaped_cast.py')
		name: 'memoryview_shaped_cast'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
