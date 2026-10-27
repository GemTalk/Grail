Class {
	#name : 'BuiltinTypesClassGetitemTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinTypesClassGetitemTestCase >> testSubscriptingABuiltinGenericTypeAnswersAGenericAlias [
	"tests/python/builtin_types_class_getitem.py: type, enumerate, memoryview,
	re.Pattern and re.Match, partialmethod, cached_property, the generator
	types, os.DirEntry, weakref.ref, staticmethod, classmethod and
	_AssertRaisesContext subscript to a types.GenericAlias; type itself has
	no __class_getitem__, and a metaclass without one is not subscriptable.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_types_class_getitem' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_types_class_getitem.py')
		name: 'builtin_types_class_getitem'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
