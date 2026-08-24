! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GenericAliasTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GenericAliasTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GenericAliasTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GenericAliasTestCase
!
! PyGenericAlias -- ``types.GenericAlias'', the object a parameterised generic
! evaluates to.
!
! Grail collapses class subscription by default: ``list[int] is list''.  That
! is load-bearing, not laziness -- 45 sites across werkzeug / flask /
! itsdangerous / jinja2 / asgiref / blinker subscript a class purely to use it
! as a BASE, and Grail enforces no type parameters at runtime, so the
! discarded subscript costs nothing.
!
! It is wrong, though, wherever something inspects the alias instead of using
! it.  CPython opts into real aliases per class -- ``partial.__class_getitem__
! = classmethod(GenericAlias)'' -- and a class that does not say so has no
! __class_getitem__ at all.  So Grail opts in per class too, by overriding
! class-side __getitem__:.  functools.partial is the first; the tests below
! pin BOTH halves, that partial answers a real alias and that list / dict
! still collapse.
!
! The subclass-as-base case is the one to be careful about: before partial
! opted in, ``partial[int]'' WAS partial, so ``class Sub(partial[int])''
! worked by accident.  PyGenericAlias >> ___subclass___ is PEP 560's
! __mro_entries__ applied where Grail resolves bases, which keeps it working
! -- and is the piece any future opt-in will need first.
!
! KNOWN WART, not asserted: a bare builtin type name reaches the subscript as
! a BoundMethod rather than the class (``partial[int, str].__args__'' holds
! int but a BoundMethod for str).  That is Grail-wide -- see
! functools_singledispatch >> ___registryKey___, which normalises the same
! thing -- and not introduced here.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GenericAliasTestCase removeAllMethods.
GenericAliasTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GenericAliasTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'generic_alias' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_alias.py')
		name: 'generic_alias'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: GenericAliasTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the alias itself ---

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testOriginArgsAndParameters
	"The three attributes CPython documents.  All DATA, not methods -- they
	are in ___pythonValueAttrs___ so a bare read answers the value."

	self assert: (self at: 'origin_is_partial') equals: true.
	self assert: (self at: 'args_len') equals: 1.
	self assert: (self at: 'args_first_is_int') equals: true.
	self assert: (self at: 'parameters') @env0:size equals: 0.
%

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testAMultiArgumentSubscriptKeepsEveryArgument
	"``partial[int, str]'' arrives as one tuple subscript and has to be
	flattened, not wrapped."

	self assert: (self at: 'two_args_len') equals: 2.
%

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testATypeVarArgumentCountsAsAParameter
	"__parameters__ is the TypeVar subset of __args__.  CPython recognises
	them by __typing_subst__; Grail's typing.TypeVar answers a
	_TypeVarInstance, which is what PyGenericAlias looks for."

	self assert: (self at: 'typevar_parameters_len') equals: 1.
%

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testRepr
	"CPython qualifies the origin with its module."

	self assert: (self at: 'repr') @env0:asString equals: 'functools.partial[int]'.
%

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testEquality
	self assert: (self at: 'eq_same') equals: true.
	self assert: (self at: 'eq_different') equals: false.
	self assert: (self at: 'eq_non_alias') equals: false.
%

category: 'Grail-Tests - Alias'
method: GenericAliasTestCase
testASubclassAliasOriginatesFromTheSubclass
	"__getitem__: is inherited through the metaclass chain and uses the
	RECEIVER, so ``PySub[int].__origin__'' is PySub -- which is what
	test_functools' TestPartialCSubclass / TestPartialPySubclass check."

	self assert: (self at: 'subclass_origin_is_subclass') equals: true.
%

! --- the subscript is erased in use ---

category: 'Grail-Tests - Erasure'
method: GenericAliasTestCase
testCallingAnAliasConstructsTheOrigin
	"``partial[int](fn, 4)()'' -- a class origin has to route through its
	class-call entry, since ___pyCallValue___ is not answered for Behaviors
	in general."

	self assert: (self at: 'call') equals: 5.
%

category: 'Grail-Tests - Erasure'
method: GenericAliasTestCase
testSubclassingAnAliasSubclassesTheOrigin
	"REGRESSION GUARD.  ``class Sub(partial[int])'' worked before partial
	opted in, because the alias WAS partial.  PEP 560's __mro_entries__ --
	here, PyGenericAlias >> ___subclass___ -- is what keeps it working; the
	alias would otherwise reach object >> ___subclass___, whose whole job is
	to raise ``cannot subclass a non-class base''."

	self assert: (self at: 'base_call') equals: 3.
%

! --- everything that did not opt in ---

category: 'Grail-Tests - Erasure'
method: GenericAliasTestCase
testClassesThatDidNotOptInStillCollapse
	"The other half of the contract, and the one with 45 sites riding on it:
	a class with no __getitem__: override still answers ITSELF, so
	``class Foo(MultiDict[K, V])'' keeps compiling to ``class Foo(MultiDict)''.

	``list'' used to be the example here and has since opted IN -- while
	``list[int] is list'' held, singledispatch's register() accepted a
	subscripted generic and silently registered the unsubscripted class,
	where CPython raises.  dict and tuple still carry the collapse, so the
	per-class model is what this now pins, together with list's opt-in."

	self assert: (self at: 'list_opted_in') equals: true.
	self assert: (self at: 'dict_collapses') equals: true.
	self assert: (self at: 'tuple_collapses') equals: true.
%

! --- reaching the class by its name in types ---

category: 'Grail-Tests - types.GenericAlias'
method: GenericAliasTestCase
testTheNameInTypesIsTheRealClass
	"``types.GenericAlias is type(list[int])'' in CPython, and now here.

	types.py bound a STUB class to this name -- a plain ``class GenericAlias''
	with no attributes -- on the reasoning that Grail never materialises an
	alias.  That had stopped being true, and the stub was worse than a missing
	name: a stdlib module reaches GenericAlias by NAMING it,

	    __class_getitem__ = classmethod(GenericAlias)

	which is how asyncio.Queue makes itself subscriptable.  The stub declared
	no __init__, so it accepted that call and answered an attribute-less
	object -- a silent wrong answer rather than an error.  Caught by
	test.test_asyncio.test_queues' test_generic_alias on __args__."

	self assert: (self at: 'types_name_is_the_real_class') equals: true.
%

category: 'Grail-Tests - types.GenericAlias'
method: GenericAliasTestCase
testConstructingByNameBuildsARealAlias
	"CPython exposes the constructor -- ``GenericAlias(list, int)'' -- and
	PyGenericAlias class >> value:value: implements it.  A single argument
	normalises to a 1-tuple, which is not cosmetic: callers index __args__."

	| args |
	args := self at: 'constructed_via_types_name_args'.
	self assert: args @env0:size equals: 1.
	self assert: (args @env1:__getitem__: 0) equals: (Python at: #int).
	self
		assert: (self at: 'constructed_two_args_repr') @env0:asString
		equals: 'dict[str, int]'.
%

category: 'Grail-Tests - types.GenericAlias'
method: GenericAliasTestCase
testARealAliasIsAnInstanceOfTheNameInTypes
	"The check test_generic_alias makes right after __args__, and the one the
	stub got backwards in the other direction: isinstance was False for a
	genuine alias, because the stub was a different class from the one
	subscription produces."

	self assert: (self at: 'a_real_alias_isinstance_of_the_name') equals: true.
%

set compile_env: 0
