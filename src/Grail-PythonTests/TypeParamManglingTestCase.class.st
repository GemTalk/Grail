Class {
	#name : 'TypeParamManglingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeParamManglingTestCase >> testPrivateTypeParametersAreMangledByTheirClass [
	"tests/python/type_param_mangling.py: ``class Foo[__T]'' binds _Foo__T, which
	the class body, a bound, a base and a lambda there all read, while the
	TypeVar keeps the name __T; a generic method's or alias's private
	parameters inside the class are mangled as every name there is.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_param_mangling' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_mangling.py')
		name: 'type_param_mangling'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
