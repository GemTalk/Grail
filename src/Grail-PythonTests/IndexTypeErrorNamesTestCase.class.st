Class {
	#name : 'IndexTypeErrorNamesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - index type names' }
IndexTypeErrorNamesTestCase >> testEveryIndexMessageAgreesWithCPython [
	"Every check in tests/python/index_type_error_names.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING fails
	too -- a fixture that stopped defining checks would otherwise pass this test
	with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'index_type_error_names' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/index_type_error_names.py')
		name: 'index_type_error_names'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_slice_still_works'
	  'an_integer_key_still_indexes'
	  'bytearray_subscript_by_MyKey'
	  'bytearray_subscript_by_NoneType'
	  'bytearray_subscript_by_bytes'
	  'bytearray_subscript_by_float'
	  'bytearray_subscript_by_str'
	  'bytearray_subscript_by_tuple'
	  'bytes_subscript_by_MyKey'
	  'bytes_subscript_by_NoneType'
	  'bytes_subscript_by_bytes'
	  'bytes_subscript_by_float'
	  'bytes_subscript_by_str'
	  'bytes_subscript_by_tuple'
	  'list_setitem_by_float'
	  'list_setitem_by_str'
	  'list_subscript_by_MyKey'
	  'list_subscript_by_NoneType'
	  'list_subscript_by_bytes'
	  'list_subscript_by_float'
	  'list_subscript_by_str'
	  'list_subscript_by_tuple'
	  'range_subscript_by_MyKey'
	  'range_subscript_by_NoneType'
	  'range_subscript_by_bytes'
	  'range_subscript_by_float'
	  'range_subscript_by_str'
	  'range_subscript_by_tuple'
	  'str_subscript_by_MyKey'
	  'str_subscript_by_NoneType'
	  'str_subscript_by_bytes'
	  'str_subscript_by_float'
	  'str_subscript_by_str'
	  'str_subscript_by_tuple'
	  'tuple_subscript_by_MyKey'
	  'tuple_subscript_by_NoneType'
	  'tuple_subscript_by_bytes'
	  'tuple_subscript_by_float'
	  'tuple_subscript_by_str'
	  'tuple_subscript_by_tuple').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 40

]

{ #category : 'Grail-Tests - index type names' }
IndexTypeErrorNamesTestCase >> testNoGemStoneClassNameReachesAPythonMessage [
	"The property behind the individual answers, stated once: no message a
	subscript produces may contain a GemStone class name.  Named separately so a
	NEW leak -- a container this fixture does not list, or a key type it does not
	try -- has somewhere to be caught that is not a list of expected strings."

	self assert: (self eval:
'leaks = []
for c in ([1, 2], (1, 2), "ab", b"ab", bytearray(b"ab"), range(3)):
    for k in ("a", b"a", 1.5, None, (1,)):
        try:
            c[k]
        except TypeError as exc:
            for bad in ("Unicode7", "Unicode16", "Unicode32", "SmallDouble",
                        "ByteArray", "SmallInteger", "LargePositiveInteger",
                        "OrderedCollection", "UndefinedObject", "DoubleByteString"):
                if bad in str(exc):
                    leaks.append((bad, str(exc)))
leaks
') equals: (self eval: '[]')

]
