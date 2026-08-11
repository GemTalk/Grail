! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMixinReduceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMixinReduceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMixinReduceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMixinReduceTestCase
!
! Pickling a member of a MIXED-IN enum whose mixin defines its own reduce:
!
!     class NamedInt(int):
!         def __new__(cls, *args): ...          "name + value"
!         def __reduce__(self): return self.__class__, self._args
!     class NEI(NamedInt, Enum):
!         y = 'the-y', 2
!
! Two defects, and they compound.
!
! (1) Grail's Enum offered only __reduce__.  pickle asks for __reduce_ex__ FIRST
!     and only then falls back, and by MRO NamedInt's __reduce__ correctly beats
!     Enum's -- so the member pickled as ``(NEI, ('the-y', 2))'', NamedInt's
!     CONSTRUCTOR arguments, rather than by its value.  CPython names Enum's
!     method __reduce_ex__, which a mixin defining only __reduce__ does not
!     shadow, so the member pickles by value.  Enum's __reduce_ex__ carries
!     CPython's body rather than delegating to self.__reduce__, which would
!     resolve straight back to the mixin's override.
!
! (2) Unpickling that then calls ``NEI('the-y', 2)'' -- and a mixin is entitled
!     to define __reduce_ex__ itself (test_subclasses_with_reduce_ex), in which
!     case it still does.  Two positionals on a member-bearing enum class are a
!     multi-value LOOKUP, but Grail refused the value-packing path whenever the
!     first argument was a string, sending it to the FUNCTIONAL API, which tried
!     to iterate the 2: ``'int' object is not iterable''.  The name test is
!     narrowed to calls whose SECOND argument could actually be a names spec.
!     And a mixed-in enum stores member_type(*args) as the value, not the
!     argument tuple, so the lookup runs the arguments through the constructor
!     when the packed tuple does not match -- tuple first, so a plain
!     multi-value member (Cardinal(1, 0), whose value IS the tuple) is unchanged.
!
! test_enum test_subclasses_with_reduce and test_subclasses_with_reduce_ex.
!
! Drives tests/python/enum_mixin_reduce.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumMixinReduceTestCase removeAllMethods.
EnumMixinReduceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMixinReduceTestCase
setUp
	"Reload tests/python/enum_mixin_reduce.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_mixin_reduce' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_mixin_reduce.py')
		name: 'enum_mixin_reduce'.
%

category: 'Grail-Private'
method: EnumMixinReduceTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Enum supplies __reduce_ex__'
method: EnumMixinReduceTestCase
testTheMixinKeepsReduceAndEnumSuppliesReduceEx
	"Both halves of the MRO split, which is the whole point: __reduce__ is the
	mixin's, __reduce_ex__ -- the one pickle asks for -- is Enum's, and answers
	the member's VALUE."

	self assert: (self resultAt: 'member_reduce') asString
		equals: '(<enum ''NEI''>, (''the-y'', 2))'.
	self assert: (self resultAt: 'member_reduce_ex') asString
		equals: '(<enum ''NEI''>, (NamedInt(''the-y'', 2),))'.
%

category: 'Grail-Tests - Enum supplies __reduce_ex__'
method: EnumMixinReduceTestCase
testMemberRoundTripsByIdentity
	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').
%

category: 'Grail-Tests - Enum supplies __reduce_ex__'
method: EnumMixinReduceTestCase
testPlainMixinInstanceStillUsesItsOwnReduce
	"Only the MEMBER changes: an ordinary NamedInt is not an enum member and
	round-trips through the mixin's own __reduce__."

	self assert: (self resultAt: 'plain_roundtrip').
%

category: 'Grail-Tests - A mixin may override __reduce_ex__'
method: EnumMixinReduceTestCase
testMixinReduceExWinsAndStillRoundTrips
	"Then the member pickles as its CONSTRUCTOR arguments and unpickling is the
	multi-value call NEIEx('the-y', 2) -- which used to reach the functional API
	and die on ``'int' object is not iterable''."

	self assert: (self resultAt: 'ex_reduce_ex') asString
		equals: '(<enum ''NEIEx''>, (''the-y'', 2))'.
	self assert: (self resultAt: 'ex_roundtrip').
%

category: 'Grail-Tests - A mixin may override __reduce_ex__'
method: EnumMixinReduceTestCase
testMultiValueCallWithAStringFirstArgument
	"The same call written directly.  A mixed-in enum's value is
	member_type(*args), so the lookup must construct before it can match."

	self assert: (self resultAt: 'ex_direct_call').
%

category: 'Grail-Tests - Lookup and the functional API stay apart'
method: EnumMixinReduceTestCase
testPlainMultiValueMemberUnchanged
	"Cardinal's value IS the tuple, so the packed lookup matches directly and
	never reaches the constructor retry."

	self assert: (self resultAt: 'cardinal').
	self assert: (self resultAt: 'cardinal_tuple').
%

category: 'Grail-Tests - Lookup and the functional API stay apart'
method: EnumMixinReduceTestCase
testFunctionalApiStillRoutesThere
	"A string first argument followed by something that could BE names -- a
	names string, a mapping -- is still the functional API."

	self assert: (self resultAt: 'functional') asString equals: 'a,b,c'.
	self assert: (self resultAt: 'functional_dict') asString equals: 'p=1,q=2'.
%

category: 'Grail-Tests - Ordinary enums untouched'
method: EnumMixinReduceTestCase
testPlainEnumReduceExAndRoundTrip
	self assert: (self resultAt: 'plain_reduce_ex') asString
		equals: '(<enum ''Plain''>, (2,))'.
	self assert: (self resultAt: 'plain_roundtrip_member').
%
