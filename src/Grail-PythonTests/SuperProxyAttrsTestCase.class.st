Class {
	#name : 'SuperProxyAttrsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperProxyAttrsTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperProxyAttrsTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_proxy_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/super_proxy_attrs.py')
		name: 'super_proxy_attrs'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - Proxy state' }
SuperProxyAttrsTestCase >> testAClassReceiverMakesSelfAndSelfClassCoincide [
	"``super(C, E)'' has __self__ E and __self_class__ E.  Stated separately
	because __self_class__ is type(obj) for every OTHER receiver, so a naive
	``obj class'' answers the metaclass here."

	self assert: (self at: 'class_form_self') equals: true.
	self assert: (self at: 'class_form_self_class') equals: true.

]

{ #category : 'Grail-Tests - Copying' }
SuperProxyAttrsTestCase >> testADeepCopiedProxyStillDispatches [
	"The check that would have caught the old behaviour.  The generic path
	produced a proxy that passed ``type(u) is type(s)'' and ``u is not s'' while
	being EMPTY -- so only calling a method through it reveals anything."

	self assert: (self at: 'deep_copy_dispatches') equals: true.
	self assert: (self at: 'deep_copy_self_type') @env0:asString equals: 'E'.

]

{ #category : 'Grail-Tests - Copying' }
SuperProxyAttrsTestCase >> testADeepCopyIsANewProxyOverACopiedSelf [
	"The reductor answers ``(super, (thisclass, self))'', so deepcopy recurses
	into the ARGUMENTS -- which is what deep-copies __self__ while leaving
	__thisclass__ the same class object."

	self assert: (self at: 'deep_copy_is_new') equals: true.
	self assert: (self at: 'deep_copy_same_type') equals: true.
	self assert: (self at: 'deep_copy_self_is_copied') equals: true.
	self assert: (self at: 'deep_copy_state_copied') equals: true.
	self assert: (self at: 'deep_copy_thisclass_shared') equals: true.

]

{ #category : 'Grail-Tests - Copying' }
SuperProxyAttrsTestCase >> testAShallowCopyIsTheProxyItself [
	"CPython's asymmetry, not an accident: copy.copy(s) IS s, while deepcopy
	builds a new proxy.  Already held before this change; asserted as the guard
	that registering a reductor did not disturb it."

	self assert: (self at: 'shallow_copy_is_identical') equals: true.

]

{ #category : 'Grail-Tests - Equality' }
SuperProxyAttrsTestCase >> testTheClassFormComparesAgainstAnUnboundHandle [
	"test_special_methods runs its whole body twice -- ``for e in E(), E'' -- and
	the second pass compares against ``E.__reduce__'', which does not bind.
	Grail spells bound and unbound handles with different classes, so this is a
	second code path in __eq__ and not a repeat of the test above."

	self assert: (self at: 'class_form_reduce_equals') equals: true.

]

{ #category : 'Grail-Tests - Equality' }
SuperProxyAttrsTestCase >> testTheProxyDoesNotOwnTheCopyProtocol [
	"The other half of the interlock, and the reason the reductor had to be
	registered out-of-band: all five of these must be ABSENT, so super cannot be
	made copyable by defining __deepcopy__ or __reduce__ on it."

	#('absent___getnewargs__' 'absent___getnewargs_ex__' 'absent___setstate__'
		'absent___copy__' 'absent___deepcopy__')
		do: [:k | self assert: (self at: k) equals: true].

]

{ #category : 'Grail-Tests - Proxy state' }
SuperProxyAttrsTestCase >> testTheProxyReportsItsSelfAndThisClass [
	"These describe the proxy, so they must be answered BEFORE the parent walk --
	which is why they sit beside the existing __class__ interception rather than
	anywhere else."

	self assert: (self at: 'self_is_the_object') equals: true.
	self assert: (self at: 'thisclass_is_the_named_class') equals: true.
	self assert: (self at: 'self_class_is_the_objects_type') equals: true.

]

{ #category : 'Grail-Tests - Equality' }
SuperProxyAttrsTestCase >> testTheProxysPicklingHandlesEqualTheObjectsOwn [
	"Attribute access on a super object resolves against the PARENT chain, so
	``s.__reduce__'' is the underlying object's reduce and CPython returns the
	very same function.  A super object must not make the pickling protocol look
	different from the object's own."

	self assert: (self at: 'reduce_equals_objects') equals: true.
	self assert: (self at: 'reduce_ex_equals_objects') equals: true.
	self assert: (self at: 'getstate_equals_objects') equals: true.

]

{ #category : 'Grail-Tests - Type identity' }
SuperProxyAttrsTestCase >> testTheSuperTypeNamesItselfAsPythonDoes [
	"``Super'' cannot be named ``super'' in Smalltalk -- it is a pseudo-variable
	-- so the Python name comes from ___pythonBuiltinTypeName___.  One entry
	answers three questions: the type name, __module__ (whose first test is
	``___pythonBuiltinTypeName___ notNil''), and the type name super's own
	TypeError messages print."

	self assert: (self at: 'type_name') @env0:asString equals: 'super'.
	self assert: (self at: 'type_module') @env0:asString equals: 'builtins'.

]
