! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumFlagMasksTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumFlagMasksTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumFlagMasksTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumFlagMasksTestCase
!
! CPython keeps three masks on every Flag CLASS, built up member by member in
! _proto_member.__set_name__:
!
!     enum_class._flag_mask_ |= value
!     if _is_single_bit(value):
!         enum_class._singles_mask_ |= value
!     enum_class._all_bits_ = 2 ** ((enum_class._flag_mask_).bit_length()) - 1
!
! Grail exposed none of them, so ``FlagFromChar._all_bits_'' was an
! AttributeError (test_enum test_flag_with_custom_new).  It computes them from
! the registry record rather than accumulating them, which answers the same at
! every point -- the record is live throughout construction, so a __new__ or
! __init__ reading one mid-build sees the members built so far, exactly as
! CPython's running total does.
!
! _all_bits_ is emphatically NOT the mask.  A flag whose only member is 1 << 97
! has a _flag_mask_ of 1 << 97 and an _all_bits_ of 2**98 - 1: every bit
! position up to the highest one used, filled in.
!
! A SECOND defect surfaced once _all_bits_ stopped raising, on the test's third
! shape: ``class FlagFromChar(int, Flag, boundary=KEEP)'' is rooted on int, so
! its metaclass is neither Enum's nor IntEnum's, and the boundary= keyword
! ClassDefAst emits could not even be recorded -- ___grailSetClassBoundary___:
! was a MessageNotUnderstood on Metaclass3.  It joins the selectors
! ___grailInstallClassProtocol: copies onto a data-mixed enum's metaclass,
! which runs in the hook and so is in place before the emission.
!
! Drives tests/python/enum_flag_masks.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumFlagMasksTestCase removeAllMethods.
EnumFlagMasksTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumFlagMasksTestCase
setUp
	"Reload tests/python/enum_flag_masks.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_flag_masks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_flag_masks.py')
		name: 'enum_flag_masks'.
%

category: 'Grail-Private'
method: EnumFlagMasksTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A custom __new__ that shifts'
method: EnumFlagMasksTestCase
testIntFlag
	"1 << ord('a'), so the numbers are large enough that _all_bits_ and
	_flag_mask_ could not be confused for one another: all_bits, flag_mask, the
	member's own int value, and ORing a bit nothing names."

	self assert: (self resultAt: 'int_flag') asString equals: 'True;True;True;True'.
%

category: 'Grail-Tests - A custom __new__ that shifts'
method: EnumFlagMasksTestCase
testPlainFlag
	"object.__new__ rather than int.__new__, and a second member at bit 1, so
	the mask is the OR of the two."

	self assert: (self resultAt: 'plain_flag') asString equals: 'True;True;True'.
%

category: 'Grail-Tests - A custom __new__ that shifts'
method: EnumFlagMasksTestCase
testMixedInFlagWithABoundaryKeyword
	"The second defect: ``class X(int, Flag, boundary=KEEP)'' is rooted on int,
	so its metaclass answered neither the masks nor the boundary setter -- the
	class statement itself died on a MessageNotUnderstood."

	self assert: (self resultAt: 'mi_flag') asString equals: 'True;True;True;True'.
%

category: 'Grail-Tests - What each mask counts'
method: EnumFlagMasksTestCase
testAMultiBitMemberCountsInOneMaskOnly
	"``MASK = 255'' is in _flag_mask_ but not in _singles_mask_, which is the
	space a STRICT/CONFORM flag inverts within."

	self assert: (self resultAt: 'masked') asString equals: '255/3/255'.
%

category: 'Grail-Tests - What each mask counts'
method: EnumFlagMasksTestCase
testAllBitsFillsTheGaps
	"A = 1, B = 2, D = 8: the mask is 11 -- bit 4 is nobody's -- while _all_bits_
	is 15, every position up to the highest one used."

	self assert: (self resultAt: 'gappy') asString equals: '11/11/15'.
%

category: 'Grail-Tests - What each mask counts'
method: EnumFlagMasksTestCase
testANonFlagEnumHasNoneOfThem
	"CPython sets all three only for a Flag subclass, so reading one off a plain
	Enum is an AttributeError.  Answering 0 would quietly make every enum look
	like an empty flag."

	self assert: (self resultAt: 'not_a_flag') asString
		equals: '_all_bits_:type object ''NotAFlag'' has no attribute ''_all_bits_'';_flag_mask_:type object ''NotAFlag'' has no attribute ''_flag_mask_'';_singles_mask_:type object ''NotAFlag'' has no attribute ''_singles_mask_'''.
%
