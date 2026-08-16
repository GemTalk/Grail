! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumPickleHelperTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumPickleHelperTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumPickleHelperTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumPickleHelperTestCase
!
! enum's two module-level pickling helpers, and the three things they needed.
! ``enum._reduce_ex_by_global_name'' is assigned OVER a class's __reduce_ex__ and
! ``enum._make_class_unpicklable(obj)'' replaces that method with one that
! raises, so both are plain functions taking self first.  Neither existed.
!
! (1) A module attribute implemented in Smalltalk answers a BoundMethod on the
!     module, and ___isDescriptorCallable___ deliberately does NOT bind those:
!     one on a Smalltalk-implemented module models a C function, and a C function
!     is not a descriptor.  CPython's helpers are pure Python, so they are
!     exposed as UnboundMethods -- ``Cls.method'', a plain function taking self
!     first -- rather than as an exception to that rule.
!
! (2) pickle swallowed EVERY exception from __reduce_ex__ and read it as "no
!     reduce available".  A __reduce_ex__ that RAISES is how an object declares
!     itself unpicklable, which is the whole point of _make_class_unpicklable, so
!     the TypeError became a PicklingError about the wrong object (the fallback
!     then failed on the CLASS).
!
! (3) A functional-API enum had no per-class attribute store at all -- no
!     ``___dynInstVars___'' classInstVar, which ClassDefAst emits for a class-SYNTAX
!     class -- so every ``setattr(E, ...)'' raised AttributeError and
!     E.__module__ did not exist.  The ``module='' keyword was accepted and
!     ignored, and that is the name pickle resolves a class BY.
!
! test_enum test_pickle_by_name and test_pickle_explodes.
!
! Drives tests/python/enum_pickle_helpers.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumPickleHelperTestCase removeAllMethods.
EnumPickleHelperTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumPickleHelperTestCase
setUp
	"Reload tests/python/enum_pickle_helpers.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_pickle_helpers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_pickle_helpers.py')
		name: 'enum_pickle_helpers'.
%

category: 'Grail-Private'
method: EnumPickleHelperTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - _reduce_ex_by_global_name'
method: EnumPickleHelperTestCase
testReduceExByGlobalNameAnswersTheMemberName
	"``Cls.__reduce_ex__ = enum._reduce_ex_by_global_name'' then
	``Cls.TWO.__reduce_ex__(proto)'' -- so the helper has to BIND the member as
	self, which a module-level BoundMethod would not."

	self assert: (self resultAt: 'by_name') asString equals: 'TWO'.
	self assert: (self resultAt: 'by_name_protos') asString equals: 'ONE,ONE,ONE'.
%

category: 'Grail-Tests - _make_class_unpicklable'
method: EnumPickleHelperTestCase
testClassSyntaxEnumBecomesUnpicklable
	"Both halves: the MEMBER raises TypeError from the installed __reduce_ex__,
	the CLASS raises PicklingError because __module__ no longer resolves."

	self assert: (self resultAt: 'cs_module') asString equals: '<unknown>'.
	self assert: (self resultAt: 'cs_member') asString
		equals: 'TypeError: <ClassSyntax.dill: 1> cannot be pickled'.
	self assert: (self resultAt: 'cs_class') asString equals: 'PicklingError'.
%

category: 'Grail-Tests - _make_class_unpicklable'
method: EnumPickleHelperTestCase
testFunctionalEnumBecomesUnpicklable
	"The shape test_pickle_explodes actually uses.  This one needed the
	functional-API class to have a class-attribute store at all -- without it
	_make_class_unpicklable could install NEITHER of the two things it sets."

	self assert: (self resultAt: 'fn_module') asString equals: '<unknown>'.
	self assert: (self resultAt: 'fn_member') asString
		equals: 'TypeError: <BadPickle.dill: 1> cannot be pickled'.
	self assert: (self resultAt: 'fn_class') asString equals: 'PicklingError'.
%

category: 'Grail-Tests - A functional enum is an ordinary class'
method: EnumPickleHelperTestCase
testModuleKeywordIsHonoured
	"``Enum('BadPickle', ..., module=__name__)'' -- accepted and ignored before,
	and it is the name pickle resolves a class BY."

	self assert: (self resultAt: 'fn_module_from_kwarg').
%

category: 'Grail-Tests - A functional enum is an ordinary class'
method: EnumPickleHelperTestCase
testSetattrOnAFunctionalEnumWorks
	"Every class-attribute store raised AttributeError; the members must be
	untouched by giving the class one."

	self assert: (self resultAt: 'fn_setattr') asString equals: 'stuck'.
	self assert: (self resultAt: 'fn_members_intact') asString equals: 'a,b'.
%

category: 'Grail-Tests - pickle propagates a raising __reduce_ex__'
method: EnumPickleHelperTestCase
testRaisingReduceExIsNotSwallowed
	"Not enum-specific: raising from __reduce_ex__ is how ANY object declares
	itself unpicklable, and pickle read every exception as ``no reduce''."

	self assert: (self resultAt: 'stubborn') asString
		equals: 'TypeError: no thank you'.
%

category: 'Grail-Tests - Ordinary pickling untouched'
method: EnumPickleHelperTestCase
testNormalEnumsStillRoundTrip
	"A member survives dumps/loads as the same object, and so does a class."

	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').
%


