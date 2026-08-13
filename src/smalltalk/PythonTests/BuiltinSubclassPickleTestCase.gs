! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinSubclassPickleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinSubclassPickleTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinSubclassPickleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinSubclassPickleTestCase
!
! A subclass of an immutable builtin did not survive pickling: it came back as
! the plain builtin, its class gone.
!
!     class MyInt(int): pass
!     pickle.loads(pickle.dumps(MyInt(7)))     -- 7, an int, not a MyInt
!
! Two halves were missing.
!
! CPython dispatches pickling on the EXACT type, so a subclass instance falls
! through to __reduce_ex__.  Grail dispatched with isinstance, and had to: it
! backs one Python type with several GemStone classes -- str is
! Unicode7/Unicode16/Unicode32/String by content and origin -- so ``type(x) is
! str'' is False even for a literal.  The distinction that DOES hold is whether
! the class was defined by Python code, which ClassDefAst already stamps with
! ___pyDefinedClass___.
!
! A type-NAME test looks equivalent and is not, which cost a round of this
! change: Symbol is a CharacterCollection subclass Grail uses for str-ish
! internal values -- enum's boundary constants are Symbols -- so it took the
! subclass path and pickle then failed trying to name the Symbol CLASS.
!
! And once a subclass falls through, its value has to be recoverable.  An
! immutable builtin's subclass carries the value in its CONSTRUCTOR rather than
! in instance state, so the new-style reduction hands it back as a __new__
! argument -- which needs __getnewargs__, and Grail had none.
!
! Drives tests/python/builtin_subclass_pickle.py.  test_enum
! TestSpecial.test_subclasses_without_direct_pickle_support.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinSubclassPickleTestCase removeAllMethods.
BuiltinSubclassPickleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinSubclassPickleTestCase
setUp
	"Reload tests/python/builtin_subclass_pickle.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_subclass_pickle' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_pickle.py')
		name: 'builtin_subclass_pickle'.
%

category: 'Grail-Private'
method: BuiltinSubclassPickleTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The subclass survives'
method: BuiltinSubclassPickleTestCase
testAnImmutableBuiltinSubclassKeepsItsClassAndValue
	"Each of these used to come back as the plain builtin."

	self assert: (self resultAt: 'int') asString equals: 'MyInt:7'.
	self assert: (self resultAt: 'str') asString equals: 'MyStr:''hi'''.
	self assert: (self resultAt: 'tuple') asString equals: 'MyTup:(1, 2)'.
	self assert: (self resultAt: 'float') asString equals: 'MyFloat:1.5'.
%

category: 'Grail-Tests - The subclass survives'
method: BuiltinSubclassPickleTestCase
testInstanceStateTravelsWithTheConstructorArgument
	"The reduction is __new__(cls, *getnewargs) followed by the state, so an
	attribute set in __new__ is restored too."

	self assert: (self resultAt: 'state') asString equals: 'Tagged:3:three'.
%

category: 'Grail-Tests - The plain builtins are untouched'
method: BuiltinSubclassPickleTestCase
testThePrimitiveFastPathStillApplies
	"The whole point of the guard is that it changes nothing for a builtin
	itself -- these keep the fast path and their pickles are unchanged."

	self assert: (self resultAt: 'plain_int') asString equals: 'int:5'.
	self assert: (self resultAt: 'plain_str') asString equals: 'str:''abc'''.
	self assert: (self resultAt: 'plain_tuple') asString equals: 'tuple:(1, 2)'.
	self assert: (self resultAt: 'plain_bool') asString equals: 'bool:True'.
%

category: 'Grail-Tests - The plain builtins are untouched'
method: BuiltinSubclassPickleTestCase
testASymbolStillPicklesAsAString
	"Grail uses Symbol -- a CharacterCollection subclass -- for str-ish internal
	values, including enum's boundary constants.  It is not a PYTHON subclass of
	str and must not be treated as one: a name-based guard sent it down the
	subclass path, and pickle failed trying to name the Symbol class.  That
	broke three test_enum tests before the discriminator was corrected."

	self assert: (self resultAt: 'symbol') asString equals: 'str:''STRICT'''.
%

category: 'Grail-Tests - The plain builtins are untouched'
method: BuiltinSubclassPickleTestCase
testAnIntEnumMemberIsStillAMember
	"The enum branch of the dispatch runs before the primitive one, so a member
	that mixes in int pickles as the member, not as its raw value."

	self assert: (self resultAt: 'int_enum_member') asString equals: 'True'.
%

category: 'Grail-Tests - __getnewargs__'
method: BuiltinSubclassPickleTestCase
testTheImmutableBuiltinsReportTheirConstructorArguments
	"CPython defines __getnewargs__ on each of them; a subclass inherits it,
	which is how the reduction learns the value."

	self assert: (self resultAt: 'getnewargs_int') asString equals: '(7,)'.
	self assert: (self resultAt: 'getnewargs_str') asString equals: '(''hi'',)'.
	self assert: (self resultAt: 'getnewargs_tuple') asString equals: '((1, 2),)'.
%

category: 'Grail-Tests - Correct failures'
method: BuiltinSubclassPickleTestCase
testARequiredExtraConstructorArgumentStillCannotBeRebuilt
	"Pinned as CORRECT, not as a gap: int.__getnewargs__ reports only the
	value, so a __new__ demanding more is called one argument short -- and
	CPython fails here too.  That failure is the point of test_enum's
	test_subclasses_without_direct_pickle_support, which asserts the TypeError
	before assigning enum.pickle_by_enum_name over __reduce_ex__ to avoid it."

	self assert: (self resultAt: 'required_arg') asString equals: 'TypeError'.
%

category: 'Grail-Tests - Known gaps'
method: BuiltinSubclassPickleTestCase
testListAndDictSubclassesStillFlattenWhichIsAKnownGap
	"Recorded, NOT endorsed.  CPython rebuilds a list or dict subclass through
	the reduction's listitems / dictitems, a different mechanism from
	__getnewargs__ -- a mutable container's contents are not constructor
	arguments.  Not covered here, so both still come back as plain containers."

	self assert: (self resultAt: 'list_subclass_is_a_known_gap') asString
		equals: 'list:[1, 2]'.
	self assert: (self resultAt: 'dict_subclass_is_a_known_gap') asString
		equals: 'dict:{''a'': 1}'.
%
