! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMetaclassSignatureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMetaclassSignatureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMetaclassSignatureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMetaclassSignatureTestCase
!
! ``inspect.signature`` of an ENUM class, which CPython answers from a PROPERTY
! on the enum metaclass (EnumType.__signature__) rather than from any of the
! usual places.  Grail had none, so every enum reported ``()''.
!
! The property's split is the two things CALLING an enum can mean.  A class that
! HAS members is final, so the call is a value lookup -- Color(1), or
! Cardinal(1, 0) for a multi-value member, hence VAR_POSITIONAL.  A MEMBER-LESS
! one is still open, so the call is the functional API, Enum('Color', 'RED
! GREEN').  Enum class >> value:value: settles the same question on the same
! test (membership); this reports it.
!
! Two Grail-specific pieces were needed:
!
!   * Enum class, IntEnum class and StrEnum class each need the property -- a
!     data-rooted enum's metaclass chain reaches the latter two and never Enum
!     class -- so all three delegate to one ___grailEnumSignatureFor:.
!   * ``cls.__signature__'' has to read as a VALUE, like __mro__ / __name__.
!     That is scoped to this implementation by asking which class provides the
!     selector and checking its CATEGORY, so a user class's ordinary ``def
!     __signature__(self)'' still answers the function, as CPython does.
!
! Drives tests/python/enum_metaclass_signature.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumMetaclassSignatureTestCase removeAllMethods.
EnumMetaclassSignatureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMetaclassSignatureTestCase
setUp
	"Reload tests/python/enum_metaclass_signature.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_metaclass_signature' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_metaclass_signature.py')
		name: 'enum_metaclass_signature'.
%

category: 'Grail-Private'
method: EnumMetaclassSignatureTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Private'
method: EnumMetaclassSignatureTestCase
functionalSignatureString
	^ '(new_class_name, /, names, *, module=None, qualname=None, type=None, start=1, boundary=None)'
%

category: 'Grail-Tests - Member-bearing'
method: EnumMetaclassSignatureTestCase
testAnEnumWithMembersReportsAValueLookup
	"Final, so calling it is a lookup -- and VAR_POSITIONAL because a member's
	value may be a tuple supplied as several arguments."

	self assert: (self resultAt: 'member_bearing') asString equals: '(*values)'.
	self assert: (self resultAt: 'stdlib_boundary') asString equals: '(*values)'.
%

category: 'Grail-Tests - Member-bearing'
method: EnumMetaclassSignatureTestCase
testADataRootedEnumGetsItToo
	"IntEnum class and StrEnum class are separate metaclass roots -- a
	data-rooted enum's chain never reaches Enum class -- so each needs the
	property.  This is the same triplication ___pyClassDefined___: has."

	self assert: (self resultAt: 'int_rooted') asString equals: '(*values)'.
	self assert: (self resultAt: 'str_rooted') asString equals: '(*values)'.
	self assert: (self resultAt: 'flag_rooted') asString equals: '(*values)'.
%

category: 'Grail-Tests - Member-less'
method: EnumMetaclassSignatureTestCase
testAMemberLessEnumReportsTheFunctionalAPI
	"Still open, so calling it is Enum('Color', 'RED GREEN') -- the assertion
	test_enum's test_inspect_signatures makes about Enum itself."

	self assert: (self resultAt: 'enum_base') asString
		equals: self functionalSignatureString.
	self assert: (self resultAt: 'flag_base') asString
		equals: self functionalSignatureString.
	self assert: (self resultAt: 'member_less_subclass') asString
		equals: self functionalSignatureString.
%

category: 'Grail-Tests - It is a real Signature'
method: EnumMetaclassSignatureTestCase
testTheResultIsASignatureNotARenderedString
	"The upstream test compares it against a Signature built by hand out of
	Parameters, so a string would not do."

	self assert: (self resultAt: 'is_signature') equals: true.
	self assert: ((self resultAt: 'param_names') @env1:__getitem__: 0) asString
		equals: 'values'.
	self assert: (self resultAt: 'param_kind') asString equals: 'VAR_POSITIONAL'.
	self assert: (self resultAt: 'equals_handmade') equals: true.
%

category: 'Grail-Tests - Scoping'
method: EnumMetaclassSignatureTestCase
testANonEnumClassIsUnaffected
	"The value-read is scoped to the enum metaclass property.  A plain class
	still answers from its __init__, and a class whose body defines
	``__signature__'' as an ordinary METHOD must hand back the method rather
	than call it -- which is what CPython's cls.__signature__ answers there."

	self assert: (self resultAt: 'plain_class') asString equals: '(a, b=2)'.
	self assert: (self resultAt: 'own_method_not_called') equals: true.
%
