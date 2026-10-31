Class {
	#name : 'ConditionalAnnotationsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ConditionalAnnotationsTestCase >> testAnnotationsListWhatRanInsideCompoundStatements [
	"tests/python/conditional_annotations.py: an annotation inside an if, a
	loop, a try, a with or a match is in its module's or class's annotations
	exactly when it ran, a module read mid-import has the ones that ran so far,
	and an annotated assignment in a class-body loop binds.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'conditional_annotations' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/conditional_annotations.py')
		name: 'conditional_annotations'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '23 checks, 0 disagreeing [], keys match: True'

]
