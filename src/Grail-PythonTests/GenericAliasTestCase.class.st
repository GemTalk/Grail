Class {
	#name : 'GenericAliasTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GenericAliasTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
GenericAliasTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'generic_alias' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_alias.py')
		name: 'generic_alias'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testAMultiArgumentSubscriptKeepsEveryArgument [
	"``partial[int, str]'' arrives as one tuple subscript and has to be
	flattened, not wrapped."

	self assert: (self at: 'two_args_len') equals: 2.

]

{ #category : 'Grail-Tests - types.GenericAlias' }
GenericAliasTestCase >> testARealAliasIsAnInstanceOfTheNameInTypes [
	"The check test_generic_alias makes right after __args__, and the one the
	stub got backwards in the other direction: isinstance was False for a
	genuine alias, because the stub was a different class from the one
	subscription produces."

	self assert: (self at: 'a_real_alias_isinstance_of_the_name') equals: true.

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testASubclassAliasOriginatesFromTheSubclass [
	"__getitem__: is inherited through the metaclass chain and uses the
	RECEIVER, so ``PySub[int].__origin__'' is PySub -- which is what
	test_functools' TestPartialCSubclass / TestPartialPySubclass check."

	self assert: (self at: 'subclass_origin_is_subclass') equals: true.

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testATypeVarArgumentCountsAsAParameter [
	"__parameters__ is the TypeVar subset of __args__.  CPython recognises
	them by __typing_subst__; Grail's typing.TypeVar answers a
	_TypeVarInstance, which is what PyGenericAlias looks for."

	self assert: (self at: 'typevar_parameters_len') equals: 1.

]

{ #category : 'Grail-Tests - Erasure' }
GenericAliasTestCase >> testCallingAnAliasConstructsTheOrigin [
	"``partial[int](fn, 4)()'' -- a class origin has to route through its
	class-call entry, since ___pyCallValue___ is not answered for Behaviors
	in general."

	self assert: (self at: 'call') equals: 5.

]

{ #category : 'Grail-Tests - Erasure' }
GenericAliasTestCase >> testClassesThatDidNotOptInStillCollapse [
	"The other half of the contract, and the one with 45 sites riding on it:
	a class with no __getitem__: override still answers ITSELF, so
	``class Foo(MultiDict[K, V])'' keeps compiling to ``class Foo(MultiDict)''.

	``list'' used to be the example here and opted IN first -- while
	``list[int] is list'' held, singledispatch's register() accepted a
	subscripted generic and silently registered the unsubscripted class,
	where CPython raises.  tuple and dict followed: PEP 646's ``tuple[*Ts]''
	and a ForwardRef's partial evaluation (``dict[int, ForwardRef('undef')]'')
	both need the arguments kept.  A plain Python class with no hook is
	CPython's TypeError now, not a collapse."

	self assert: (self at: 'list_opted_in') equals: true.
	self assert: (self at: 'dict_opted_in') equals: true.
	self assert: (self at: 'tuple_opted_in') equals: true.
	self assert: (self at: 'plain_class_refuses')
		equals: 'type ''_NotOptedIn'' is not subscriptable'.

]

{ #category : 'Grail-Tests - types.GenericAlias' }
GenericAliasTestCase >> testConstructingByNameBuildsARealAlias [
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

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testEquality [
	self assert: (self at: 'eq_same') equals: true.
	self assert: (self at: 'eq_different') equals: false.
	self assert: (self at: 'eq_non_alias') equals: false.

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testOriginArgsAndParameters [
	"The three attributes CPython documents.  All DATA, not methods -- they
	are in ___pythonValueAttrs___ so a bare read answers the value."

	self assert: (self at: 'origin_is_partial') equals: true.
	self assert: (self at: 'args_len') equals: 1.
	self assert: (self at: 'args_first_is_int') equals: true.
	self assert: (self at: 'parameters') @env0:size equals: 0.

]

{ #category : 'Grail-Tests - Alias' }
GenericAliasTestCase >> testRepr [
	"CPython qualifies the origin with its module."

	self assert: (self at: 'repr') @env0:asString equals: 'functools.partial[int]'.

]

{ #category : 'Grail-Tests - Erasure' }
GenericAliasTestCase >> testSubclassingAnAliasSubclassesTheOrigin [
	"REGRESSION GUARD.  ``class Sub(partial[int])'' worked before partial
	opted in, because the alias WAS partial.  PEP 560's __mro_entries__ --
	here, PyGenericAlias >> ___subclass___ -- is what keeps it working; the
	alias would otherwise reach object >> ___subclass___, whose whole job is
	to raise ``cannot subclass a non-class base''."

	self assert: (self at: 'base_call') equals: 3.

]

{ #category : 'Grail-Tests - types.GenericAlias' }
GenericAliasTestCase >> testTheNameInTypesIsTheRealClass [
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

]
