Class {
	#name : 'SuperLookupTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperLookupTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperLookupTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_lookup' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_lookup.py')
		name: 'super_lookup'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - Classmethods' }
SuperLookupTestCase >> testAClassmethodReachedThroughSuperGetsTheClass [
	"``cls'' must be the CLASS, not the instance super() was bound to.  Which
	receiver to use is decided by the LOOKUP -- it answers whether the method
	came from the class side -- because re-deriving it downstream from the
	method object was wrong twice: ``lives on a metaclass'' caught ordinary
	inherited methods and ran KeyValueDictionary's __setitem__ against a class."

	self assert: (self at: 'classmethod_receiver_is_a_class') @env0:asString
		equals: '(''B'', (''B'', ''A''), ''B'')'.

]

{ #category : 'Grail-Tests - Missing names' }
SuperLookupTestCase >> testAMissingNameRaisesAtLookupNotAtCall [
	"``getattr(s, '__deepcopy__', None)'' must answer None, and hasattr must
	answer False.  Both were wrong because the proxy resolved lazily and was
	truthy for every name -- so copy.deepcopy called it and the AttributeError
	escaped the guard that was supposed to absorb it (test_deep_copying,
	test_pickling)."

	self assert: (self at: 'getattr_with_default') @env0:asString equals: 'None'.
	self assert: (self at: 'hasattr_is_false') equals: false.
	self assert: (self at: 'bare_access') @env0:asString equals: 'AttributeError'.

]

{ #category : 'Grail-Tests - Missing names' }
SuperLookupTestCase >> testAPresentNameIsUnaffected [
	"Raising early must not cost the ordinary case: the whole arity family is
	probed, so a name defined at ANY arity still gets the deferred proxy and
	the call-time resolution is unchanged."

	self assert: (self at: 'present_name_still_works') @env0:asString
		equals: 'A'.

]

{ #category : 'Grail-Tests - Classmethods' }
SuperLookupTestCase >> testSuperReachesAParentClassmethodFromAnInstanceMethod [
	"``super(): no parent method 'cm''' until the lookup consulted the class
	side for an instance receiver too."

	self assert: (self at: 'classmethod_chain') @env0:asString
		equals: '(''instance'', (''C'', (''C'', ''A''), ''B''), ''C'')'.

]

{ #category : 'Grail-Tests - Classmethods' }
SuperLookupTestCase >> testTheOrdinaryInstanceChainIsUndisturbed [
	"The guard on all of it: a plain cooperative super() chain must still
	resolve instance-side and bind the instance.  Widening the search without
	this is how the class side swallowed methods that were never classmethods."

	self assert: (self at: 'instance_chain') @env0:asString equals: 'ABC'.

]
