Class {
	#name : 'MethodAnnotationComprehensionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MethodAnnotationComprehensionTestCase >> testMethodAnnotationMayHoldAComprehension [
	"tests/python/method_annotation_comprehension.py: a method's annotation may hold a
	comprehension or a generator expression, evaluated lazily against the
	module's names, as a nested scope sees them -- the class compiled at all.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'method_annotation_comprehension' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_annotation_comprehension.py')
		name: 'method_annotation_comprehension'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
