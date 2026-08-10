! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMemberMarkerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMemberMarkerTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMemberMarkerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMemberMarkerTestCase
!
! ``enum.member(x)'' -- nonmember's mirror.  It FORCES x to be a member even
! where the ordinary rules would skip the name: a nested class, or a descriptor
! that CPython's _EnumDict leaves a plain class attribute.
!
! Two defects met here.  ``member'' was bound to PropertyDescriptor, so
! ``@member class Inner'' produced a descriptor instead of a marker.  And the
! nested class's ``__qualname__'' store was emitted AFTER that class's
! DECORATORS, so it ran against whatever the decorator returned -- for a marker
! that reached object>>___classHolderAttrStore___, whose ``self dynInstVars''
! raised a raw Smalltalk doesNotUnderstand.  It escaped as an ST error rather
! than any Python exception, taking out both
! test_nested_classes_in_enum_with_member and _with_nonmember.
!
! Drives tests/python/enum_member_marker.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumMemberMarkerTestCase removeAllMethods.
EnumMemberMarkerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMemberMarkerTestCase
setUp
	"Reload tests/python/enum_member_marker.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_member_marker' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_member_marker.py')
		name: 'enum_member_marker'.
%

category: 'Grail-Private'
method: EnumMemberMarkerTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - @member'
method: EnumMemberMarkerTestCase
testMemberDecoratorOnNestedClass
	"``@member class Inner(Enum)'' makes Inner a MEMBER of the outer enum whose
	value is the inner class (test_enum test_nested_classes_in_enum_with_member,
	which used to die with a raw Smalltalk doesNotUnderstand)."

	self assert: (self resultAt: 'outer_members') asString equals: 'a,b,Inner'.
	self assert: (self resultAt: 'inner_is_member').
	self assert: (self resultAt: 'inner_value_foo') equals: 10.
	self assert: (self resultAt: 'inner_value_members') asString equals: 'foo,bar'.
	self assert: (self resultAt: 'a_value') equals: 1.
%

category: 'Grail-Tests - @member'
method: EnumMemberMarkerTestCase
testNonmemberDecoratorOnNestedClass
	"Its mirror: ``@nonmember class Inner2'' is NOT a member, and
	``Outer2.Inner2'' is the class itself (test_nested_classes_in_enum_with_
	nonmember, which died the same way)."

	self assert: (self resultAt: 'outer2_members') asString equals: 'a'.
	self assert: (self resultAt: 'inner2_is_class').
	self assert: (self resultAt: 'inner2_x') equals: 5.
%

category: 'Grail-Tests - @member'
method: EnumMemberMarkerTestCase
testMemberForcesADescriptor
	"The point of member(): a descriptor is normally NOT a member (the
	_EnumDict rule), and member() overrides exactly that."

	self assert: (self resultAt: 'forced_members') asString equals: 'plain,forced'.
%

category: 'Grail-Tests - @member'
method: EnumMemberMarkerTestCase
testMemberLeavesAnOrdinaryValueAlone
	"``a = member(7)'' is still just the member 7 -- the marker unwraps."

	self assert: (self resultAt: 'ordinary_value') equals: 7.
%
