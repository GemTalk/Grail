Class {
	#name : 'GenericAliasAttributeReadsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GenericAliasAttributeReadsTestCase >> testAnAttributeOfAnAliasIsReadOffItsOrigin [
	"tests/python/generic_alias_attribute_reads.py: an attribute read of a
	types.GenericAlias answers the origin's -- ``list[int].__getitem__'' is
	list.__getitem__ -- except the alias's own names and the blocked ones;
	operators still use the alias; dir() lists both; and the repr of a list
	argument fetches by index.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generic_alias_attribute_reads' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_alias_attribute_reads.py')
		name: 'generic_alias_attribute_reads'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
