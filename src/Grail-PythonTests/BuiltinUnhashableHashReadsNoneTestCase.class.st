Class {
	#name : 'BuiltinUnhashableHashReadsNoneTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinUnhashableHashReadsNoneTestCase >> testTheHashOfAnUnhashableBuiltinReadsNone [
	"tests/python/builtin_unhashable_hash_reads_none.py: __hash__ read off
	list, dict, set, bytearray, dict_keys and dict_items, off their instances
	and off a subclass that defines none is None, while a subclass's own or
	assigned __hash__ and an instance attribute win -- so dataclasses refuses
	a list default.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_unhashable_hash_reads_none' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_unhashable_hash_reads_none.py')
		name: 'builtin_unhashable_hash_reads_none'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
