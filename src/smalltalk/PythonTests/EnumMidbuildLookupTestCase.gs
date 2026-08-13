! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMidbuildLookupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMidbuildLookupTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMidbuildLookupTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMidbuildLookupTestCase
!
! Calling the enum class from inside a class-body __init__ -- ``cls(value)'' --
! has to LOOK A MEMBER UP, not build one:
!
!     class UniqueEnum(Enum):
!         def __init__(self, *args):
!             cls = self.__class__
!             if any(self.value == e.value for e in cls):
!                 raise ValueError('aliases not allowed in UniqueEnum:  %r --> %r'
!                                  % (self.name, cls(self.value).name))
!
! In CPython _value2member_map_ is live throughout construction -- EnumType
! .__new__ fills it member by member -- so cls(value) answers the member built
! earlier.  Grail published its equivalent (the registry record) before the
! member loop too, but the ClassDefAst-emitted generic instantiation was only
! removed from the metaclass AFTER the loop, so during it cls(value) still
! SHADOWED the lookup: it built a fresh instance and ran __init__ on that, and
! an __init__ calling cls(...) recursed until RecursionError.
!
! The class-call fixup runs before the loop now.  Nothing in the loop wants the
! generic -- member construction calls the DATA TYPE's constructor, never the
! enum's -- and the ClassDefAst emit it undoes has already happened by the time
! the hook runs.
!
! No test_enum test MOVED for this: test_no_duplicates asserts only the
! exception TYPE, and it already passed once an alias got its own __init__.
! What changed is that the message it builds is reachable at all, and reads
! CPython's ``'grene' --> 'green''' instead of dying in recursion.
!
! Drives tests/python/enum_midbuild_lookup.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumMidbuildLookupTestCase removeAllMethods.
EnumMidbuildLookupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMidbuildLookupTestCase
setUp
	"Reload tests/python/enum_midbuild_lookup.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_midbuild_lookup' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_midbuild_lookup.py')
		name: 'enum_midbuild_lookup'.
%

category: 'Grail-Private'
method: EnumMidbuildLookupTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - cls(value) during construction'
method: EnumMidbuildLookupTestCase
testTheMessageThatUsedToRecurse
	"The defect in one line: building this message called cls(self.value), which
	built an instance and re-entered __init__ until RecursionError.  It now
	answers the member and reads exactly as CPython's does."

	self assert: (self resultAt: 'message') asString
		equals: 'aliases not allowed in UniqueEnum:  ''grene'' --> ''green'''.
%

category: 'Grail-Tests - cls(value) during construction'
method: EnumMidbuildLookupTestCase
testAnEarlierMemberIsReachable
	"Not merely non-recursive -- the lookup gives the RIGHT answer, growing as
	members are added."

	self assert: (self resultAt: 'backwards') asString
		equals: 'none-yet;<BackEnum.one: 1>;<BackEnum.one: 1>'.
%

category: 'Grail-Tests - cls(value) during construction'
method: EnumMidbuildLookupTestCase
testWhatEachMemberSeesOfItself
	"A member is registered AFTER its __init__ returns, in CPython as in Grail,
	so its own value does not resolve while it is being built -- and the FIRST
	member, with nothing registered at all, gets CPython's ``has no members''
	TypeError rather than a ValueError."

	self assert: (self resultAt: 'progressive') asString
		equals: 'a(1) own=TypeError:has-no-members earlier=[];b(2) own=ValueError earlier=[''a''];c(3) own=ValueError earlier=[''a'', ''b'']'.
%

category: 'Grail-Tests - The ordinary path is unchanged'
method: EnumMidbuildLookupTestCase
testAWellFormedEnumStillBuilds
	"The same UniqueEnum base with no duplicate defines cleanly -- the lookup
	running during construction must not reject honest members."

	self assert: (self resultAt: 'clean') asString
		equals: '<Color.red: 1>;<Color.green: 2>;<Color.blue: 3>'.
%

category: 'Grail-Tests - The ordinary path is unchanged'
method: EnumMidbuildLookupTestCase
testLookupAfterConstruction
	"Moving the metaclass fixup earlier must leave the finished class calling
	exactly as before: by value, by name, identity, and the ValueError."

	self assert: (self resultAt: 'after_lookup') asString equals: '<Color.green: 2>'.
	self assert: (self resultAt: 'after_by_name') asString equals: '<Color.blue: 3>'.
	self assert: (self resultAt: 'after_identity').
	self assert: (self resultAt: 'after_bad') asString equals: '99 is not a valid Color'.
%
