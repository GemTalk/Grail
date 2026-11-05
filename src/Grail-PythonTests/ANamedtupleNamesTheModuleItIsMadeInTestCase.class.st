Class {
	#name : 'ANamedtupleNamesTheModuleItIsMadeInTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ANamedtupleNamesTheModuleItIsMadeInTestCase >> testANamedtupleBelongsToTheModuleThatCallsTheFactory [
	"tests/python/a_namedtuple_names_the_module_it_is_made_in.py: a namedtuple
	made at module level or in a function names the module that made it, an
	explicit module= wins, a typing.NamedTuple does too, and an instance
	pickles by that module.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_namedtuple_names_the_module_it_is_made_in' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_namedtuple_names_the_module_it_is_made_in.py')
		name: 'a_namedtuple_names_the_module_it_is_made_in'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
