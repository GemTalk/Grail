! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumNamedtupleAutoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumNamedtupleAutoTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumNamedtupleAutoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumNamedtupleAutoTestCase
!
! ``first = T(auto(), 'for the money')'' -- auto() markers inside a NAMEDTUPLE
! member value.
!
! ___grailBuildMembers: resolved markers inside a plain tuple value, gated on
! ``rawValue isKindOf: tuple''.  Grail's namedtuple classes are not tuple-ROOTED
! -- the collections factory's ``_NT'' chain runs straight to Enum, never
! through Array -- so a namedtuple never reached that branch and the marker
! survived into the member value as
!
!     T(index=<GrailEnumAuto object>, desc='for the music')
!
! The value is now unwrapped to a plain tuple, resolved by the EXISTING
! left-to-right walk, and rebuilt as the namedtuple.  Deliberately a normalise/
! restore around that walk rather than a second copy of it: the resolution feeds
! genValues between markers so the default generator advances, while holding
! ``count'' constant within a member, and those semantics should not be
! duplicated per container shape (test_tuple_subclass_with_auto_2).
!
! That test still fails, further along: pickling a namedtuple needs the class to
! carry the factory's typename, and Grail's is literally ``_NT'' with the real
! name held in _typename.  __name__/__qualname__ cannot currently be assigned on
! a Python class, and __module__ answers 'collections' rather than the caller's
! module -- a separate piece of work.  The VALUE is now right, which is what
! this case covers.
!
! Drives tests/python/enum_namedtuple_auto.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumNamedtupleAutoTestCase removeAllMethods.
EnumNamedtupleAutoTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumNamedtupleAutoTestCase
setUp
	"Reload tests/python/enum_namedtuple_auto.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_namedtuple_auto' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_namedtuple_auto.py')
		name: 'enum_namedtuple_auto'.
%

category: 'Grail-Private'
method: EnumNamedtupleAutoTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - auto() inside a namedtuple'
method: EnumNamedtupleAutoTestCase
testMarkersResolveInDeclarationOrder
	"1, 2, 3 across the three members -- the same numbering the plain-tuple
	path produces, because it IS the same walk."

	self assert: (self resultAt: 'values') asString
		equals: 'T(index=1, desc=''for the money'');T(index=2, desc=''for the show'');T(index=3, desc=''for the music'')'.
	self assert: (self resultAt: 'third_index') equals: 3.
	self assert: (self resultAt: 'second_desc') asString equals: 'for the show'.
%

category: 'Grail-Tests - auto() inside a namedtuple'
method: EnumNamedtupleAutoTestCase
testValueIsRebuiltAsTheNamedtuple
	"Unwrapping to a plain tuple must not leave it one: the value is still a T,
	and still compares equal to the plain tuple."

	self assert: (self resultAt: 'is_namedtuple').
	self assert: (self resultAt: 'equals_tuple').
%

category: 'Grail-Tests - Unchanged shapes'
method: EnumNamedtupleAutoTestCase
testNamedtupleWithoutAutoIsUntouched
	"No markers, no unwrap -- the value passes through as written."

	self assert: (self resultAt: 'plain_nt') asString
		equals: 'TT(id=0, a=0, blist=[]);TT(id=1, a=2, blist=[4])'.
%

category: 'Grail-Tests - Unchanged shapes'
method: EnumNamedtupleAutoTestCase
testNamedtupleMixinStillBuilds
	"``class NTCEnum(TT, Enum)'' -- the namedtuple as the DATA TYPE rather than
	as the value."

	self assert: (self resultAt: 'mixin_repr') asString
		equals: '<NTCEnum.NONE: TT(id=0, a=0, blist=[])>'.
	self assert: (self resultAt: 'mixin_field') equals: 1.
%

category: 'Grail-Tests - Unchanged shapes'
method: EnumNamedtupleAutoTestCase
testPlainTupleAndBareAutoUnchanged
	"The two paths that already worked, pinned so the normalise/restore cannot
	disturb them."

	self assert: (self resultAt: 'plain_tuple') asString
		equals: '(1, ''a'');(2, ''b'')'.
	self assert: (self resultAt: 'bare') asString equals: 'x=1,y=2'.
%
