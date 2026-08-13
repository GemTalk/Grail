! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumPickleByNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumPickleByNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumPickleByNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumPickleByNameTestCase
!
! ``enum.pickle_by_enum_name'' and ``enum.pickle_by_global_name'' -- CPython's
! two public replacement reductions, for a member whose ordinary value-based one
! cannot work:
!
!     NEI.__reduce_ex__ = enum.pickle_by_enum_name
!
! The default reduction is ``(cls, (value,))'', which rebuilds the VALUE.  When
! the member type's __new__ demands more than the value -- ``class NEI(NamedInt,
! Enum)'' where NamedInt wants a name too -- that call raises, and going by NAME
! sidesteps the member type's constructor entirely.
!
! Neither name existed in Grail.
!
! Drives tests/python/enum_pickle_by_name.py.  test_enum
! TestSpecial.test_subclasses_without_direct_pickle_support.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumPickleByNameTestCase removeAllMethods.
EnumPickleByNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumPickleByNameTestCase
setUp
	"Reload tests/python/enum_pickle_by_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_pickle_by_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_pickle_by_name.py')
		name: 'enum_pickle_by_name'.
%

category: 'Grail-Private'
method: EnumPickleByNameTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The reductions exist'
method: EnumPickleByNameTestCase
testBothArePresentAndDeclared
	self assert: (self resultAt: 'has_by_enum_name') asString equals: 'True'.
	self assert: (self resultAt: 'has_by_global_name') asString equals: 'True'.
	self assert: (self resultAt: 'both_declared') asString equals: 'True'.
%

category: 'Grail-Tests - The reductions exist'
method: EnumPickleByNameTestCase
testTheReductionIsGetattrOfClassAndName
	"CPython's shape exactly: (getattr, (cls, name)).

	``getattr'' has to be the BUILTIN -- the object Python code sees, which
	pickle names as builtins.getattr.  Reading it from the builtins CLASS
	rather than the module INSTANCE yields an UnboundMethod, which pickle
	cannot name at all; that mistake is what held this back a round."

	self assert: (self resultAt: 'reduction_func') asString equals: 'getattr'.
	self assert: (self resultAt: 'reduction_args') asString equals: 'Colour,GREEN'.
	self assert: (self resultAt: 'func_is_builtin_getattr') asString equals: 'True'.
%

category: 'Grail-Tests - The case it exists for'
method: EnumPickleByNameTestCase
testTheDefaultReductionCannotRebuildSuchAValue
	"``class NEI(NamedInt, Enum)'': the default (cls, (value,)) reduction calls
	NamedInt.__new__ with the value alone, and NamedInt demands a name too.
	CPython raises exactly this, which is why the replacement exists."

	self assert: (self resultAt: 'default_reduction') asString
		equals: 'TypeError: name and value must be specified'.
%

category: 'Grail-Tests - The case it exists for'
method: EnumPickleByNameTestCase
testAssigningItMakesTheMemberTravelByName
	"And the member comes back as the same object, not an equal one."

	self assert: (self resultAt: 'by_name_member') asString equals: 'True'.
%

category: 'Grail-Tests - A raising __module__'
method: EnumPickleByNameTestCase
testARaisingModuleReadIsTreatedAsAbsent
	"pickle read obj.__module__ with a DEFAULTED getattr, which is not enough
	under Grail: some objects raise from that read instead of answering the
	default -- enum.property is one.  The exception left ``modname'' unbound, so
	the failure surfaced as ``UnboundLocalError: cannot access local variable
	'modname''', naming nothing to do with pickling.  It is now treated as no
	__module__, which is what the whichmodule fallback is for, and the object
	that genuinely cannot be pickled says so."

	self assert: (self resultAt: 'property_module_raises') asString equals: 'yes'.
	self assert: (self resultAt: 'pickling_it') asString equals: 'PicklingError'.
%
