Class {
	#name : 'GenericClassSubscriptTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
GenericClassSubscriptTestCase >> setUp [
	"Load tests/python/generic_class_subscript.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'generic_class_subscript' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_class_subscript.py')
		name: 'generic_class_subscript'.

]

{ #category : 'Grail-Tests' }
GenericClassSubscriptTestCase >> testListSubclassCompiles [
	"``class GenericList(list[T]):'' — the subscripted base must
	resolve at class-creation time.  ``list'' now answers a real
	GenericAlias, so this exercises PEP 560's __mro_entries__ rather
	than the old collapse.  Populating the list from an
	iterable arg is a separate gap (Grail's class instantiation
	does ``self new'' without forwarding the iterable to list's
	constructor); this regression covers only the subscription.

	``module.func'' returns a BoundMethod (Python attribute-load
	semantics); call it explicitly to read the function's result."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #list_subclass_compiles)
			@env1:value: { } value: nil)
		equals: true

]

{ #category : 'Grail-Tests' }
GenericClassSubscriptTestCase >> testMapSubclassWorks [
	"``class GenericMap(dict[K, V]):'' — two-parameter generic base."

	| result |
	result := (testModule @env1:___pyAttrLoad___: #map_subclass_works)
		@env1:value: { } value: nil.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 2) equals: 'missing'

]

{ #category : 'Grail-Tests' }
GenericClassSubscriptTestCase >> testSubscriptionReturnsSelfForAlias [
	"Bare subscription, per class.  ``list'' and ``dict'' have opted IN to
	real parameterised generics, so ``list[int]'' is a GenericAlias whose
	__origin__ is list -- CPython's answer.  A plain class that has not is
	CPython's TypeError.

	This test used to assert that BOTH collapsed.  list had to change:
	while ``list[int] is list'' held, singledispatch's register() accepted
	a subscripted generic as a dispatch class and silently registered the
	unsubscripted one, where CPython raises."

	| result |
	result := (testModule @env1:___pyAttrLoad___: #subscription_returns_self_for_use_as_alias)
		@env1:value: { } value: nil.
	self assert: (result at: 1) equals: true.
	self assert: (result at: 2) equals: true

]
