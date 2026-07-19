! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GenericClassSubscriptTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GenericClassSubscriptTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GenericClassSubscriptTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GenericClassSubscriptTestCase
!
! Regression: ``__class_getitem__'' on the object metaclass — so
! ``list[V]'' / ``dict[K, V]'' / ``MyClass[T]'' (as generic aliases
! or as base classes) all work.  Grail returns the origin class
! itself; no type checking happens at runtime.
!
! Werkzeug's datastructures package and many CPython-source ports
! rely on subscripted bases (``MultiDict[K, V]'', ``ImmutableList[V]'',
! …).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GenericClassSubscriptTestCase removeAllMethods.
GenericClassSubscriptTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GenericClassSubscriptTestCase
setUp
	"Load tests/python/generic_class_subscript.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'generic_class_subscript' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_class_subscript.py')
		name: 'generic_class_subscript'.
%

category: 'Grail-Tests'
method: GenericClassSubscriptTestCase
testListSubclassCompiles
	"``class GenericList(list[T]):'' — the subscripted base must
	resolve at class-creation time.  Populating the list from an
	iterable arg is a separate gap (Grail's class instantiation
	does ``self new'' without forwarding the iterable to list's
	constructor); this regression covers only the subscription.

	``module.func'' returns a BoundMethod (Python attribute-load
	semantics); call it explicitly to read the function's result."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #list_subclass_compiles)
			@env1:value: { } value: nil)
		equals: true
%

category: 'Grail-Tests'
method: GenericClassSubscriptTestCase
testMapSubclassWorks
	"``class GenericMap(dict[K, V]):'' — two-parameter generic base."

	| result |
	result := (testModule @env1:___pyAttrLoad___: #map_subclass_works)
		@env1:value: { } value: nil.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 2) equals: 'missing'
%

category: 'Grail-Tests'
method: GenericClassSubscriptTestCase
testSubscriptionReturnsSelfForAlias
	"``list[int] is list'' and ``dict[str, int] is dict'' — Grail
	collapses subscription to the origin class.  CPython would return
	a GenericAlias here; Grail simplifies."

	| result |
	result := (testModule @env1:___pyAttrLoad___: #subscription_returns_self_for_use_as_alias)
		@env1:value: { } value: nil.
	self assert: (result at: 1) equals: true.
	self assert: (result at: 2) equals: true
%
