Class {
	#name : 'MapFilterZipAreClassesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MapFilterZipAreClassesTestCase >> testMapFilterAndZipAreTheClassesOfWhatTheyBuild [
	"tests/python/map_filter_zip_are_classes.py: map, filter and zip are
	types named as CPython names them, their objects are instances of them,
	a subclass builds itself, calling the class value builds one, the
	refusals are CPython's, and both an object and the class pickle.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'map_filter_zip_are_classes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/map_filter_zip_are_classes.py')
		name: 'map_filter_zip_are_classes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
