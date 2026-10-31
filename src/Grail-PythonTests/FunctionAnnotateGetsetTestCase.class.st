Class {
	#name : 'FunctionAnnotateGetsetTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FunctionAnnotateGetsetTestCase >> testFunctionsAndModulesFollowTheAnnotateGetsets [
	"tests/python/function_annotate_getset.py: a module-level def, a nested def,
	a lambda, a method reached through its class and a module each read, assign
	and delete __annotate__ and __annotations__ as CPython's getsets have them --
	None until assigned, None or a callable only, a callable dropping the cached
	dict and None keeping it.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'function_annotate_getset' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_annotate_getset.py')
		name: 'function_annotate_getset'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
