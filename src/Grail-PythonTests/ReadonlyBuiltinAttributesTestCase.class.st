Class {
	#name : 'ReadonlyBuiltinAttributesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReadonlyBuiltinAttributesTestCase >> testReadonlyAttributesRefuseStoresAndDeletes [
	"tests/python/readonly_builtin_attributes.py: a builtin's read-only
	attributes refuse a store and a delete -- ``readonly attribute'' for a
	member, ``attribute 'x' of 'T' objects is not writable'' for a getter --
	and the values they hold stay as they were.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'readonly_builtin_attributes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/readonly_builtin_attributes.py')
		name: 'readonly_builtin_attributes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
