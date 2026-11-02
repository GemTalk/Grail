Class {
	#name : 'MemoryviewCastByKeywordTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewCastByKeywordTestCase >> testCastTakesItsFormatAndShapeByName [
	"tests/python/memoryview_cast_by_keyword.py: memoryview.cast() takes format
	and shape by name or position, and refuses a bad call as Argument Clinic
	does, in its order.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'memoryview_cast_by_keyword' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_cast_by_keyword.py')
		name: 'memoryview_cast_by_keyword'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
