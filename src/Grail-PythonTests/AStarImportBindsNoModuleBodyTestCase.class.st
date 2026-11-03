Class {
	#name : 'AStarImportBindsNoModuleBodyTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AStarImportBindsNoModuleBodyTestCase >> testAStarImportBindsNoInitialize [
	"tests/python/a_star_import_binds_no_module_body.py: ``from M import *''
	over a Python module without an __all__ binds its public names and not
	the ``initialize'' its compiled body is.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_star_import_binds_no_module_body' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_star_import_binds_no_module_body.py')
		name: 'a_star_import_binds_no_module_body'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
