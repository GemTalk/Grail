Class {
	#name : 'ANamedtupleSubclassIsBuiltFromItsBasesFieldsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ANamedtupleSubclassIsBuiltFromItsBasesFieldsTestCase >> testASubclassDeclaringMoreFieldsIsBuiltFromTheBases [

	"tests/python/a_namedtuple_subclass_is_built_from_its_bases_fields.py: a
	namedtuple subclass declaring more _fields, or other _field_defaults, is
	constructed, made, replaced and shown with the base's fields, while
	_asdict zips its own _fields with the values iterating gives.  Each check
	agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'a_namedtuple_subclass_is_built_from_its_bases_fields' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_namedtuple_subclass_is_built_from_its_bases_fields.py')
		name: 'a_namedtuple_subclass_is_built_from_its_bases_fields'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
