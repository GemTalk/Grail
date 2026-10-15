Class {
	#name : 'CachedPropertyDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
CachedPropertyDescriptorTestCase >> setUp [
	"Reload tests/python/cached_property_descriptor.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cached_property_descriptor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/cached_property_descriptor.py')
		name: 'cached_property_descriptor'.

]

{ #category : 'Grail-Tests - Descriptor' }
CachedPropertyDescriptorTestCase >> testAliasToDecoratedDefBindsTheDescriptor [
	"``b = a'' where ``a'' is a DECORATED sibling def binds the decorated object,
	so cached_property sees itself bound twice and raises -- with the names in
	SOURCE order, which is what CPython reports.

	Two things had to change.  Such an alias was compiled as a delegating
	METHOD, which called the UNdecorated compiled method; and the __set_name__
	walk visited class-attribute names before the unordered decorator store, so
	even once both names held the descriptor it named them backwards."

	self assert: testModule @env1:alias_to_decorated_def_binds_the_descriptor
		equals: 'Cannot assign the same cached_property to two different names (''a'' and ''b'').'

]

{ #category : 'Grail-Tests - Descriptor' }
CachedPropertyDescriptorTestCase >> testAliasToPlainDefStillDelegates [
	"The delegating-method path is still taken for an UNdecorated sibling: it
	exists because operator dispatch resolves compiled methods, not attributes,
	so ``__ne__ = __eq__'' has to remain callable as an operator."

	self assert: testModule @env1:alias_to_plain_def_still_delegates asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - Caching' }
CachedPropertyDescriptorTestCase >> testAttributeNameMayDifferFromTheFunctionName [
	"``cached_cost = cached_property(get_cost)'' caches under the name it is
	BOUND to -- which __set_name__ supplies -- not the function's own.  The
	interleaved get_cost() calls keep counting; the cached reads do not."

	self assert: (testModule @env1:attribute_name_may_differ_from_the_function_name)
		asArray equals: #( 2 3 4 3 ).

]

{ #category : 'Grail-Tests - Caching' }
CachedPropertyDescriptorTestCase >> testComputesOncePerInstance [
	"The whole point.  Unfixed, this counted up: 2, 3, 4."

	self assert: (testModule @env1:computes_once_per_instance) asArray
		equals: #( 2 2 2 2 2 ).

]

{ #category : 'Grail-Tests - Errors' }
CachedPropertyDescriptorTestCase >> testConstructionArity [
	"cached_property takes exactly one POSITIONAL argument."

	self assert: (testModule @env1:construction_arity) asArray
		equals: #( 'no-arg:TypeError' 'two-args:TypeError' 'by-keyword:TypeError' ).

]

{ #category : 'Grail-Tests - Introspection' }
CachedPropertyDescriptorTestCase >> testDocumentedAttributes [
	"func / attrname / __doc__ -- the three CPython documents.  The docstring
	comes off the wrapped function, which works for a nested def (the
	closure carries it) though not yet for a class METHOD."

	| got |
	got := (testModule @env1:documented_attributes) asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'prop'.
	self assert: (got at: 3) @env0:asString equals: 'A described property.'.

]

{ #category : 'Grail-Tests - Protocol' }
CachedPropertyDescriptorTestCase >> testExplicitGet [
	"__get__ called by hand, the way CPython's test does.  It must consult
	the cache itself -- ___pyAttrLoad___'s slot probe is not in the way
	here -- and answer the descriptor for a None instance."

	self assert: (testModule @env1:explicit_get) asArray
		equals: #( 42 42 42 true ).

]

{ #category : 'Grail-Tests - Descriptor' }
CachedPropertyDescriptorTestCase >> testMetaclassLevelCachedProperty [
	"A cached_property on a METACLASS, read through the class.  Python reads an
	attribute off a class by consulting its TYPE, so ``MyClass.prop'' finds
	MyMeta's descriptor -- which Grail reaches through the recorded
	``metaclass=''.

	Caching then fails, exactly as in CPython: a class's __dict__ does not
	support item assignment.  Grail gets there by a different route (a Class
	cannot hold dynamic instVars) and reports the same message, naming the
	METACLASS -- the Smalltalk class of a class is ``MyClass class'', which is
	not a name CPython would print."

	self assert: testModule @env1:metaclass_level_cached_property
		equals: 'The ''__dict__'' attribute on ''MyMeta'' instance does not support item assignment for caching ''prop'' property.'

]

{ #category : 'Grail-Tests - Introspection' }
CachedPropertyDescriptorTestCase >> testModuleAndQualname [
	"The CLASS names itself functools.cached_property; an INSTANCE reports
	the module that defined the wrapped function, because CPython's __init__
	copies __module__ across.  Without that copy ``Cls.attr.__module__''
	answers 'functools' and no longer matches ``Cls.__module__''."

	| got |
	got := (testModule @env1:module_and_qualname) asArray.
	self assert: (got at: 1) @env0:asString equals: 'functools'.
	self assert: (got at: 2) @env0:asString equals: 'cached_property'.
	self assert: (got at: 3) @env0:asString equals: 'cached_property_descriptor'.

]

{ #category : 'Grail-Tests - Errors' }
CachedPropertyDescriptorTestCase >> testNoDictToCacheInRaises [
	"A __slots__ class has nowhere to cache, so CPython raises rather than
	silently recompute on every read."

	self assert: (testModule @env1:no_dict_to_cache_in) @env0:asString
		equals: 'No ''__dict__'' attribute on ''SlottedCostItem'' instance to cache ''cost'' property.'.

]

{ #category : 'Grail-Tests - Introspection' }
CachedPropertyDescriptorTestCase >> testReadingThroughTheClassAnswersTheDescriptor [
	"CPython's __get__ answers self for a None instance, so ``Cls.attr'' is
	the descriptor -- which is what makes the isinstance check and the
	.func / .attrname reads below possible at all."

	| got |
	got := (testModule @env1:reading_through_the_class_answers_the_descriptor) asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'cost'.
	self assert: (got at: 3) equals: true.

]

{ #category : 'Grail-Tests - Errors' }
CachedPropertyDescriptorTestCase >> testSetNameNeverCalledRaises [
	"``Foo.cp = cached_property(f)'' after the class exists: __set_name__
	only fires at class CREATION, so the descriptor never learns its name
	and must raise instead of guessing one."

	self assert: (testModule @env1:set_name_never_called) @env0:asString
		equals: 'Cannot use cached_property instance without calling __set_name__ on it.'.

]

{ #category : 'Grail-Tests - Protocol' }
CachedPropertyDescriptorTestCase >> testSubclassable [
	"A pass-through function could not be subclassed at all.  CPython's own
	test subclasses it to add __set__ -- which makes it a DATA descriptor,
	and caching still has to hold (the second read answers the cached 1, not
	the mutated 999)."

	self assert: (testModule @env1:subclassable) asArray equals: #( true 1 1 ).

]

{ #category : 'Grail-Tests - Caching' }
CachedPropertyDescriptorTestCase >> testTheSameDescriptorMaySeveTwoClasses [
	"One descriptor bound under the SAME name on two classes is fine, and
	each instance caches separately.  Only a second name in ONE class is an
	error (testTwoNamesForOneDescriptorRaises)."

	self assert: (testModule @env1:the_same_descriptor_may_serve_two_classes)
		asArray equals: #( 1 2 1 2 ).

]

{ #category : 'Grail-Tests - Errors' }
CachedPropertyDescriptorTestCase >> testTwoNamesForOneDescriptorRaises [
	"Two names in ONE class body: reads of the second would recompute
	forever, so CPython refuses at class-definition time -- and names both,
	in declaration order."

	self assert: (testModule @env1:two_names_for_one_descriptor) @env0:asString
		equals: 'Cannot assign the same cached_property to two different names (''a'' and ''b'').'.

]
