Class {
	#name : 'ClassAnnotationsGetsetTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassAnnotationsGetsetTestCase >> testClassAnnotationsBehaveAsTypesGetsets [
	"tests/python/class_annotations_getset.py: a class's __annotations__ and
	__annotate__ are read, assigned and deleted as CPython's type getsets have
	them -- the __annotations_cache__ entry, a class body's own __annotate__,
	and a metaclass that defines __annotations__ itself.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_annotations_getset' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_annotations_getset.py')
		name: 'class_annotations_getset'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
