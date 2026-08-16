! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMemberPropertyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMemberPropertyTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMemberPropertyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMemberPropertyTestCase
!
! ``Enum.name'' and ``Enum.value'' are enum.property -- a DynamicClassAttribute --
! in CPython, and were plain Smalltalk methods here:
!
!     Enum.__dict__['name']   <enum.property object>   (was: an UnboundMethod)
!     Color.name              AttributeError           (was: an UnboundMethod)
!     Color.CYAN.name         'CYAN'                   (unchanged)
!
! Not a spelling difference.  inspect.getmembers DISCOVERS these two names by
! sweeping the bases for ``isinstance(v, DynamicClassAttribute)'' -- such a
! descriptor hides from dir(), so nothing else offers it -- and
! classify_class_attrs reports kind 'data' for one, where an UnboundMethod is
! isroutine() and comes out 'method'.  getmembers(Color) was missing both names
! entirely; its key set is now exactly CPython's.
!
! WHAT MADE IT POSSIBLE.  Enum had nowhere to PUT a class attribute.  Every class
! ClassDefAst generates carries a per-class holder (``dynInstVars'') and the
! accessor pair for it; Enum is written in Smalltalk and had neither, so
! ___classHolderAttrStore___ -- and through it every class-level store -- died
! with ``a Enum class does not understand #'dynInstVars'''.  Giving it one is
! what this change is really about; the descriptors are the first thing to use it.
!
! THREE THINGS THAT BROKE ON THE WAY, all of them latent and all fixed here:
!
!   * ___mergeSecondaryBases___ decided ``is this class generated from Python?''
!     by asking whether its metaclass answers ``dynInstVars''.  That is an
!     attribute HOLDER and only incidentally a proxy for generated, so Enum
!     acquiring one put Enum ITSELF into the merge walk for every ``class E(int,
!     Enum)'' -- which evaluated its class-side attrs, one of which (_all_bits_)
!     raises AttributeError on a non-flag enum BY DESIGN.  test_enum stopped
!     importing.  The walk now asks ___pyDefinedClass___, which is the actual
!     question; measured first -- exactly one Smalltalk-written class in the
!     Python dictionary carries a holder accessor, and none carries the marker.
!   * that same merge caught ``on: Error'' around a class-attribute read.  A
!     Python exception is not an Error subclass here, so one refusing attribute
!     took down the whole class definition rather than being skipped.
!   * ___grailDirNames sent ``obj @env0:fget'' to a descriptor.  ``fget'' is
!     defined in env 1 ONLY, so that send was a MessageNotUnderstood for every
!     descriptor that reached it -- latent until Enum's __dict__ held two, then
!     72 test_enum tests died in Smalltalk.  It reads _rawFget now, the env-0
!     accessor that exists for exactly this.
!
! A STORAGE-ROOTED enum needs its own copy: ``class Mixed(int, Enum)'' is rooted
! at AbstractPyInt, so the class-attribute walk never reaches Enum's holder --
! the same shape as _ignore_, which worked on a plain Enum and silently did
! nothing on every mixin.  ___grailBuildMembers: installs them per class.
!
! Drives tests/python/enum_member_properties.py.  test_enum
! TestStdLib.test_inspect_getmembers, TestStdLib.test_inspect_classify_class_attrs.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumMemberPropertyTestCase removeAllMethods.
EnumMemberPropertyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMemberPropertyTestCase
setUp
	"Reload tests/python/enum_member_properties.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_member_properties' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_member_properties.py')
		name: 'enum_member_properties'.
%

category: 'Grail-Private'
method: EnumMemberPropertyTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The descriptor'
method: EnumMemberPropertyTestCase
testNameAndValueAreDynamicClassAttributes
	"``Enum.__dict__['name']'' is the descriptor itself, which is what both
	inspect tests compare their result against -- so it has to BE one, not
	merely answer the same value."

	self assert: (self resultAt: 'dict_holds_descriptor') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'descriptor_is_stable') asString equals: 'True'.
%

category: 'Grail-Tests - The descriptor'
method: EnumMemberPropertyTestCase
testClassAccessIsRefused
	"The whole point of a DynamicClassAttribute: the enum CLASS keeps its own
	meaning for the name.  An ordinary property answers the descriptor for class
	access and a method answers an UnboundMethod; both are wrong here."

	self assert: (self resultAt: 'class_access_refused') asString
		equals: '[''AttributeError'', ''AttributeError'']'.
%

category: 'Grail-Tests - The descriptor'
method: EnumMemberPropertyTestCase
testTheMemberReadIsUnchanged
	"The hot path.  ___grailBuildMembers: stores name and value as INSTANCE
	dynamic instVars, which ___pyAttrLoad___ finds before it ever consults the
	class, so a member read never reaches the descriptor at all."

	self assert: (self resultAt: 'member_reads') asString equals: '[''CYAN'', 1]'.
	self assert: (self resultAt: 'sunder_reads') asString equals: '[''CYAN'', 1]'.
%

category: 'Grail-Tests - inspect'
method: EnumMemberPropertyTestCase
testGetmembersFindsBothAndAnswersTheDescriptors
	"getmembers finds them by sweeping the bases for a DynamicClassAttribute --
	dir() must NOT offer them, which is what makes that sweep necessary -- and
	then falls back to the base's __dict__ because the getattr raises."

	self assert: (self resultAt: 'getmembers_has_both') asString equals: '[True, True]'.
	self assert: (self resultAt: 'getmembers_values_are_the_descriptors') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'dir_hides_them') asString equals: '[False, False]'.
%

category: 'Grail-Tests - Enum can hold a class attribute'
method: EnumMemberPropertyTestCase
testAClassLevelStoreOnAnEnumWorks
	"``Color.extra = ...'' used to reach ___classHolderAttrStore___ and die on
	the missing holder.  Set after the class is built, so it is an ordinary
	class attribute and not a member."

	self assert: (self resultAt: 'class_attribute_store') asString equals: '''set-later'''.
	self assert: (self resultAt: 'store_is_not_a_member') asString equals: 'True'.
%

category: 'Grail-Tests - Mixin enums'
method: EnumMemberPropertyTestCase
testAStorageRootedEnumGetsItsOwnCopy
	"``class Mixed(int, Enum)'' is rooted at AbstractPyInt, so the class-attribute
	walk from it never reaches Enum's holder.  Without a per-class copy the class
	read answered the UnboundMethod ___mergeSecondaryBases___ had copied down --
	so Color.name raised and Mixed.name did not, which is worse than both being
	wrong."

	self assert: (self resultAt: 'int_mixin_class_access') asString
		equals: 'AttributeError'.
	self assert: (self resultAt: 'int_mixin_still_builds') asString
		equals: '[''ONE'', 1, 2]'.
%

category: 'Grail-Tests - The flag masks still refuse'
method: EnumMemberPropertyTestCase
testAPlainEnumHasNoFlagMasks
	"REGRESSION GUARD, and the one that stopped test_enum importing.  These three
	raise AttributeError for a non-flag enum deliberately -- answering 0 would
	make every enum look like an empty flag -- and the secondary-base merge walked
	into Enum and evaluated them the moment Enum had an attribute holder."

	self assert: (self resultAt: 'plain_enum_has_no_masks') asString
		equals: '[''AttributeError'', ''AttributeError'', ''AttributeError'']'.
%
