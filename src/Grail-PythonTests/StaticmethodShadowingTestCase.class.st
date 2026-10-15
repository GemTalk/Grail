Class {
	#name : 'StaticmethodShadowingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StaticmethodShadowingTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
StaticmethodShadowingTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'staticmethod_shadowing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/staticmethod_shadowing.py')
		name: 'staticmethod_shadowing'.
	probe := testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Tests - Precedence' }
StaticmethodShadowingTestCase >> testAMultiArgumentStaticmethodIsUnaffected [
	"The NON-shadowing multi-arg case.  The shadowing one is still broken and
	is documented in the class comment rather than asserted here."

	self assert: (self at: 'a_multi_argument_staticmethod_is_unaffected')
		equals: true

]

{ #category : 'Grail-Tests - Precedence' }
StaticmethodShadowingTestCase >> testAnUnshadowedStaticmethodIsUnaffected [
	self assert: (self at: 'an_unshadowed_staticmethod_is_unaffected') equals: true

]

{ #category : 'Grail-Tests - Calling Still Works' }
StaticmethodShadowingTestCase >> testAShadowingClassmethodWorksToo [
	"The same code path names @classmethod, so it is checked rather than
	assumed to follow."

	self assert: (self at: 'a_shadowing_classmethod_works_too') equals: true

]

{ #category : 'Grail-Tests - Calling Still Works' }
StaticmethodShadowingTestCase >> testAShadowingStaticmethodCallsViaAnInstance [
	self assert: (self at: 'a_shadowing_staticmethod_calls_via_an_instance')
		equals: true

]

{ #category : 'Grail-Tests - Access Does Not Invoke' }
StaticmethodShadowingTestCase >> testAShadowingStaticmethodIsAnsweredNotCalled [
	"Off the CLASS -- one of the two readers that had the defect."

	self assert: (self at: 'a_shadowing_staticmethod_is_answered_not_called')
		equals: true

]

{ #category : 'Grail-Tests - Access Does Not Invoke' }
StaticmethodShadowingTestCase >> testAShadowingStaticmethodIsAnsweredViaAnInstanceToo [
	"Off an INSTANCE -- the other reader.  Both had it, so both are pinned:
	fixing one would have moved the wrong answer rather than removed it."

	self assert: (self at: 'a_shadowing_staticmethod_is_answered_via_an_instance_too')
		equals: true

]

{ #category : 'Grail-Tests - Calling Still Works' }
StaticmethodShadowingTestCase >> testAShadowingStaticmethodStillCallsCorrectly [
	self assert: (self at: 'a_shadowing_staticmethod_still_calls_correctly')
		equals: true

]

{ #category : 'Grail-Tests - Precedence' }
StaticmethodShadowingTestCase >> testTheBaseAttributeIsUndisturbed [
	"The branch being gated exists to serve ordinary class-body data
	attributes; narrowing it must not stop them working."

	self assert: (self at: 'the_base_attribute_is_undisturbed') equals: true

]

{ #category : 'Grail-Tests - Precedence' }
StaticmethodShadowingTestCase >> testTheSubclassOutranksTheInheritedAttribute [
	self assert: (self at: 'the_subclass_outranks_the_inherited_attribute')
		equals: true

]
