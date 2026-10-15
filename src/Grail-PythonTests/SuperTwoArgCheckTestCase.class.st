Class {
	#name : 'SuperTwoArgCheckTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperTwoArgCheckTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperTwoArgCheckTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_two_arg_check' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/super_two_arg_check.py')
		name: 'super_two_arg_check'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - Acceptances' }
SuperTwoArgCheckTestCase >> testACooperativeMixinChainStillResolves [
	"THE case that made this impossible before.  ``class Derived(Mixin, Base)''
	reaches Base through the C3 linearization, and Mixin is not a Smalltalk
	superclass of Derived -- so a chain-only check rejects ``super(Mixin, self)'',
	the most common legitimate two-argument call there is.  That is what the four
	Django failures were, and the cause was a bare env-1 send to an env-0
	___mroOf___: whose DNU an on:do: was swallowing."

	self assert: (self at: 'cooperative_mixin_chain') @env0:asString
		equals: 'Derived+Mixin+Base'.

]

{ #category : 'Grail-Tests - Rejections' }
SuperTwoArgCheckTestCase >> testAnUnrelatedInstanceIsRejected [
	"``super(C, list())''.  Also pins the PYTHON type name: the message said
	``OrderedCollection'' while CPython says ``list'', so it matched
	structurally and failed on the noun."

	self assert: (self at: 'reject_unrelated_instance') @env0:asString
		equals: 'super(type, obj): obj (instance of list) is not an instance or subtype of type (C).'.

]

{ #category : 'Grail-Tests - Rejections' }
SuperTwoArgCheckTestCase >> testAnUnrelatedTypeIsRejected [
	"``super(int, <C instance>)''.  The TypeError must come from the
	CONSTRUCTOR: before, a proxy was built and the failure surfaced from the
	later lookup as ``'super' object has no attribute 'method''', which is a
	diagnosis of the wrong thing entirely."

	self assert: (self at: 'reject_unrelated_type') @env0:asString
		equals: 'super(type, obj): obj (instance of C) is not an instance or subtype of type (int).'.

]

{ #category : 'Grail-Tests - Acceptances' }
SuperTwoArgCheckTestCase >> testArgumentOneMustStillBeATypeFirst [
	"The argument-1 diagnosis outranks the obj check.  Order matters: testing obj
	against a non-class first walks ``inheritsFrom: 1'' and dies in the kernel
	with an uncatchable ArgumentTypeError, which is how ``super(1, int)''
	presented."

	self assert: (self at: 'arg1_not_a_type') @env0:asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - Acceptances' }
SuperTwoArgCheckTestCase >> testASubclassPassedAsObjIsAccepted [
	"The ``or subtype'' half: ``super(Base, Derived)'' is legitimate.  Base is on
	Derived's linearization even though ``Derived inheritsFrom: Base'' is false,
	so this passes only because the MRO branch now actually runs."

	self assert: (self at: 'subclass_as_obj_ok') @env0:asString
		equals: 'constructed'.

]

{ #category : 'Grail-Tests - Rejections' }
SuperTwoArgCheckTestCase >> testATypePassedAsObjIsRejectedAndNamedAsAType [
	"``super(C, list)''.  CPython distinguishes the two readings in the wording
	-- ``type list'' rather than ``instance of list'' -- because that is what
	says whether you passed the wrong object or the wrong class."

	self assert: (self at: 'reject_type_as_obj') @env0:asString
		equals: 'super(type, obj): obj (type list) is not an instance or subtype of type (C).'.

]
