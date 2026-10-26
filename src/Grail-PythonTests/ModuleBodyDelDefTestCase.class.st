Class {
	#name : 'ModuleBodyDelDefTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Modules' }
ModuleBodyDelDefTestCase >> testDelInTheModuleBodyRemovesATopLevelDef [
	"tests/python/module_body_del_def.py: ``del name'' in a module body removes
	that module's top-level def -- from globals(), dir() and the module's
	attributes -- after the body has used it; a later call or read raises
	NameError, or reaches the builtin of the same name; a def after the del
	binds the name again.  Each check agrees with CPython 3.14 (test_pickletools'
	test__all__: pickletools deletes assure_pickle_consistency this way)."

	| fixture |
	importlib @env1:modules removeKey: #'module_body_del_def' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_body_del_def.py')
		name: 'module_body_del_def'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
