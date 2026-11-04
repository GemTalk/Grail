Class {
	#name : 'DirOfTypeListsTypesAttributesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DirOfTypeListsTypesAttributesTestCase >> testDirOfTypeAndOfAMetaclassListTypesOwnAttributes [
	"tests/python/dir_of_type_lists_types_attributes.py: dir(type), dir(ABCMeta)
	and dir() of a metaclass list __name__, __mro__, __bases__ and type's other
	own attributes Grail answers, every one of them reads, an ordinary class
	lists none of the class protocol, and rlcompleter completes
	``CompleteMe.__name__''.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dir_of_type_lists_types_attributes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_of_type_lists_types_attributes.py')
		name: 'dir_of_type_lists_types_attributes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
