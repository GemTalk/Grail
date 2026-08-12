! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumTupleStorageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumTupleStorageTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumTupleStorageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumTupleStorageTestCase
!
! Two ways a tuple reaches an enum, both of which went wrong.
!
! (1) ``class SomeTuple(tuple, Enum)'' -- the member IS a tuple.  Grail built it
!     with basicNew, which leaves the INDEXED content empty, so every member was
!     a zero-length tuple: len() 0, indexing raised IndexError, iteration yielded
!     nothing, and ``SomeTuple.third == (3, 'for the music')'' was False even
!     though _value_ held exactly that.  The str-rooted branch beside it already
!     gave its members the value's CHARACTERS for the same reason; this is that
!     fix for elements (test_tuple_subclass).
!
! (2) A member VALUE that is a namedtuple has to SPREAD into __new__ / __init__ /
!     member_type(*args) -- CPython's ``args = value if isinstance(value, tuple)
!     else (value,)'', and a namedtuple is a tuple there.  Grail's namedtuple
!     classes are not tuple-ROOTED -- the collections factory's ``_NT'' chain
!     runs straight to Enum, never through Array -- so the isKindOf: test missed
!     them and the whole namedtuple arrived as ONE argument: ``missing required
!     argument: a'' (test_namedtuple_as_value).
!
!     The four sites that spread a value now share ___grailSpreadArgs:, which
!     reads a namedtuple's elements through ``_fields'' -- ``_NT'' answers
!     neither asArray nor the Array protocol, so the elements have to be fetched
!     by name.
!
! Drives tests/python/enum_tuple_storage.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumTupleStorageTestCase removeAllMethods.
EnumTupleStorageTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumTupleStorageTestCase
setUp
	"Reload tests/python/enum_tuple_storage.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_tuple_storage' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_tuple_storage.py')
		name: 'enum_tuple_storage'.
%

category: 'Grail-Private'
method: EnumTupleStorageTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A tuple-rooted member IS a tuple'
method: EnumTupleStorageTestCase
testMemberCarriesTheValuesElements
	"The whole defect in one line: equality with the plain tuple, which was
	False because the member had no elements at all."

	self assert: (self resultAt: 'equals').
	self assert: (self resultAt: 'len') equals: 2.
	self assert: (self resultAt: 'index') asString equals: '3'.
	self assert: (self resultAt: 'iterate') asString equals: '[3, ''for the music'']'.
%

category: 'Grail-Tests - A tuple-rooted member IS a tuple'
method: EnumTupleStorageTestCase
testEachMemberKeepsItsOwnContents
	"Filling the indexed slots must not share one buffer between members."

	self assert: (self resultAt: 'contents') asString
		equals: '(1, ''for the money'');(2, ''for the show'');(3, ''for the music'')'.
%

category: 'Grail-Tests - A tuple-rooted member IS a tuple'
method: EnumTupleStorageTestCase
testItIsStillAnEnumMember
	"Content, not identity: the member is its enum class, keeps its enum repr
	and its _value_, and still pickles back to itself."

	self assert: (self resultAt: 'type_is_enum').
	self assert: (self resultAt: 'is_tuple').
	self assert: (self resultAt: 'value') asString equals: '(3, ''for the music'')'.
	self assert: (self resultAt: 'repr') asString
		equals: '<SomeTuple.third: (3, ''for the music'')>'.
	self assert: (self resultAt: 'roundtrip').
%

category: 'Grail-Tests - A namedtuple VALUE spreads'
method: EnumTupleStorageTestCase
testNamedtupleValueOnAPlainEnum
	"No __new__ and no __init__, so nothing spreads -- the value is the
	namedtuple, and its fields are NOT member attributes."

	self assert: (self resultAt: 'nt_repr') asString
		equals: '<NTEnum.NONE: TTuple(id=0, a=0, blist=[])>'.
	self assert: (self resultAt: 'nt_value').
	self assert: (self resultAt: 'nt_attr') asString equals: 'AttributeError'.
	self assert: (self resultAt: 'nt_values') asString
		equals: 'TTuple(id=0, a=0, blist=[]);TTuple(id=1, a=2, blist=[4]);TTuple(id=2, a=4, blist=[0, 1, 2])'.
%

category: 'Grail-Tests - A namedtuple VALUE spreads'
method: EnumTupleStorageTestCase
testNamedtupleAsTheDataType
	"``class NTCEnum(TTuple, Enum)'' -- the fields ARE member attributes here."

	self assert: (self resultAt: 'ntc_repr') asString
		equals: '<NTCEnum.NONE: TTuple(id=0, a=0, blist=[])>'.
	self assert: (self resultAt: 'ntc_fields') asString equals: '0/2/[4]'.
%

category: 'Grail-Tests - A namedtuple VALUE spreads'
method: EnumTupleStorageTestCase
testUserNewTakesTheFieldsSeparately
	"The shape that needed the spread: ``def __new__(cls, id, a, blist)'' with a
	namedtuple value.  One argument arrived, and the definition died on
	``missing required argument: a''."

	self assert: (self resultAt: 'ntd_repr') asString
		equals: '<NTDEnum.NONE: TTuple(id=0, a=0, blist=[])>'.
	self assert: (self resultAt: 'ntd_fields') asString equals: '0/2/[4]'.
%

category: 'Grail-Tests - Ordinary values unchanged'
method: EnumTupleStorageTestCase
testPlainTupleAndScalarValues
	"The spread helper replaced four copies of the isKindOf: test, so pin what
	they did: a plain tuple still spreads into __init__, a scalar still does
	not."

	self assert: (self resultAt: 'plain_tuple_init') asString
		equals: '4.869e+24/6.0518e+06'.
	self assert: (self resultAt: 'scalar') asString equals: '1;''two'''.
%
