Class {
	#name : 'ClassBareAnnotationReadTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBareAnnotationReadTestCase >> testBareClassAnnotationBindsNothing [
	"tests/python/class_bare_annotation_read.py: a bare annotation in a class
	body binds nothing, so a later read finds the module global or raises
	NameError -- in a module-level class and in one inside a function --
	while dataclass fields and class __annotations__ are unchanged.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_bare_annotation_read' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_bare_annotation_read.py')
		name: 'class_bare_annotation_read'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
