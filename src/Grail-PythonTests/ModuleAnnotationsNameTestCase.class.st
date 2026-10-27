Class {
	#name : 'ModuleAnnotationsNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ModuleAnnotationsNameTestCase >> testModuleAnnotationsIsNoGlobalUntilReadAsAnAttribute [
	"tests/python/module_annotations_name.py: a module's __annotations__ is a
	NameError as a bare name until mod.__annotations__ computes and caches it,
	and a real global from the start under the annotations future import.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'module_annotations_name' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_annotations_name.py')
		name: 'module_annotations_name'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
