Class {
	#name : 'MethodWrapperTypeNamesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MethodWrapperTypeNamesTestCase >> testStaticmethodAndClassmethodNameThemselvesAsBuiltins [
	"tests/python/method_wrapper_type_names.py: staticmethod and classmethod
	report module 'builtins' and alias as such, their instances forward the
	wrapped function's names, and a subclass names itself.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'method_wrapper_type_names' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_wrapper_type_names.py')
		name: 'method_wrapper_type_names'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
