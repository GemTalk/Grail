! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumCompositeNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumCompositeNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumCompositeNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumCompositeNameTestCase
!
! A composite flag pseudo-member is NAMED after the members it subsumes (CPython
! 3.11+): ``(Color.RED | Color.GREEN).name'' is 'RED|GREEN'.  Grail stored None.
!
! The built-in repr looked right regardless, because it computes the same join
! separately -- so the gap only showed where the name is REACHABLE:
!
!     class NewPerm(IntFlag):
!         R = 1 << 2; W = 1 << 1; X = 1 << 0
!         def __str__(self):
!             return self._name_
!
!     format(NewPerm.R | NewPerm.X, '')      -- 'None'
!
! which is test_enum OldTestIntFlag.test_format.
!
! The name comes from the decomposition the repr already uses, so a KEEP
! composite carrying uncovered bits is named the way it is printed (R|8), and a
! value that decomposes to NOTHING -- zero, with no zero-valued member -- keeps
! None.
!
! One consumer must still DECOMPOSE rather than read the name: a @global_enum's
! repr prefixes each named piece with the module (MOD.LOW|MOD.HIGH), and it used
! the absent name as its "is this a composite?" test -- so with composites named
! it printed MOD.LOW|HIGH.  Composites now carry an explicit marker, and every
! other name-absent test in PyEnumTypes wants precisely the string now stored,
! so those short-circuit on it.
!
! Drives tests/python/enum_composite_name.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumCompositeNameTestCase removeAllMethods.
EnumCompositeNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumCompositeNameTestCase
setUp
	"Reload tests/python/enum_composite_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_composite_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_composite_name.py')
		name: 'enum_composite_name'.
%

category: 'Grail-Private'
method: EnumCompositeNameTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A composite carries the joined name'
method: EnumCompositeNameTestCase
testNameAndSunderName
	"Both spellings, and three members join too."

	self assert: (self resultAt: 'name') asString equals: 'RED|GREEN'.
	self assert: (self resultAt: 'sunder_name') asString equals: 'RED|GREEN'.
	self assert: (self resultAt: 'three') asString equals: 'RED|GREEN|BLUE'.
	self assert: (self resultAt: 'single_name') asString equals: 'RED'.
%

category: 'Grail-Tests - A composite carries the joined name'
method: EnumCompositeNameTestCase
testTheNameIsReachableThroughAUserStr
	"The defect in one line: a flag whose __str__ answers self._name_ printed
	'None' while the built-in repr, which computes the same join separately,
	looked right."

	self assert: (self resultAt: 'user_str_single') asString equals: 'R'.
	self assert: (self resultAt: 'user_str_composite') asString equals: 'R|X'.
%

category: 'Grail-Tests - A composite carries the joined name'
method: EnumCompositeNameTestCase
testTheCompositeIsStillCached
	"Naming happens at construction, and the composite is still the same object
	on the next lookup -- so the name is not recomputed per read."

	self assert: (self resultAt: 'cached').
	self assert: (self resultAt: 'repr') asString equals: '<Color.RED|GREEN: 3>'.
	self assert: (self resultAt: 'str') asString equals: 'Color.RED|GREEN'.
%

category: 'Grail-Tests - Edges of the decomposition'
method: EnumCompositeNameTestCase
testKeepCompositeIsNamedTheWayItPrints
	"Uncovered bits are a piece of the name too, matching the repr."

	self assert: (self resultAt: 'keep') asString equals: 'R|8'.
	self assert: (self resultAt: 'keep_repr') asString equals: '<Keep.R|8: 12>'.
%

category: 'Grail-Tests - Edges of the decomposition'
method: EnumCompositeNameTestCase
testZeroStaysNameless
	"Nothing to decompose, so None -- as CPython's ``<Color: 0>'' implies."

	self assert: (self resultAt: 'zero') @env1:__repr__ asString equals: 'None'.
	self assert: (self resultAt: 'zero_repr') asString equals: '<Color: 0>'.
%

category: 'Grail-Tests - Edges of the decomposition'
method: EnumCompositeNameTestCase
testExplicitCompositeKeepsItsClassBodyName
	"``BOTH = 3'' is a NAMED member, not a pseudo-member: it keeps BOTH, and the
	lookup answers it rather than building a composite."

	self assert: (self resultAt: 'explicit') asString equals: 'BOTH'.
	self assert: (self resultAt: 'explicit_repr') asString equals: '<Named.BOTH: 3>'.
	self assert: (self resultAt: 'explicit_is_lookup').
%

category: 'Grail-Tests - The global repr still decomposes'
method: EnumCompositeNameTestCase
testGlobalEnumPrefixesEveryPiece
	"The one consumer that cannot read the stored name: each NAMED piece carries
	the module, leftover KEEP bits stay bare, and a composite no named member
	covers still formats as Cls(value)."

	self assert: (self resultAt: 'global_single') asString equals: 'MOD.LOW'.
	self assert: (self resultAt: 'global_composite') asString
		equals: 'MOD.LOW|MOD.HIGH'.
	self assert: (self resultAt: 'global_keep') asString equals: 'MOD.LOW|4'.
	self assert: (self resultAt: 'global_nameless') asString equals: 'MOD.Head(8)'.
%
