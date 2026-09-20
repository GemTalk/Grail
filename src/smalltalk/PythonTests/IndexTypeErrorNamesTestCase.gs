! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IndexTypeErrorNamesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IndexTypeErrorNamesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IndexTypeErrorNamesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IndexTypeErrorNamesTestCase - a wrong-typed subscript names the PYTHON type
! ===============================================================================
! ``[1, 2]['a']'' raises ``TypeError: list indices must be integers or slices,
! not str''.  Grail said ``not Unicode7'' -- the GEMSTONE class backing a str --
! and likewise ``not SmallDouble'' for a float and ``not ByteArray'' for bytes.
! The name is part of a message a Python programmer reads, so a kernel class name
! in it is a defect in its own right, and a confusing one: ``Unicode7'' appears
! nowhere in Python.
!
! THE SHAPE OF THE BUG IS THE INTERESTING PART.  Bytes.gs and Bytearray.gs
! already resolved the name properly, so ``b'ab'['a']'' was RIGHT while
! ``[1, 2]['a']'' was WRONG -- the same sentence, two implementations, one of
! them leaking.  Four sites had been written with ``index class name asString''
! (list getitem, list setitem, the shared SequenceableCollection path, str and
! range) and now go through the same ___pyTypeNameForError___ that the
! binary-operator errors already used for exactly this reason.
!
! HOW IT WAS FOUND, which is worth recording because it was not by looking:
! chasing an unrelated bytes-formatting question printed ``list indices must be
! integers or slices, not ByteArray'' as INCIDENTAL output.  The message was not
! what was being tested; it was just visible.
!
! The fixture tests a CROSS PRODUCT of 6 container types against 6 key types,
! deliberately: the defect was per-KEY-TYPE, so one key against many containers
! would have missed it, and one container against many keys would have found it
! in only one of the five sites.
!
! tests/python/index_type_error_names.py holds the 40 checks below and is run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndexTypeErrorNamesTestCase removeAllMethods.
IndexTypeErrorNamesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - index type names'
method: IndexTypeErrorNamesTestCase
testEveryIndexMessageAgreesWithCPython
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
%

category: 'Grail-Tests - index type names'
method: IndexTypeErrorNamesTestCase
testNoGemStoneClassNameReachesAPythonMessage
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
%
