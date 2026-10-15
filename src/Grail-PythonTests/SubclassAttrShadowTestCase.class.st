Class {
	#name : 'SubclassAttrShadowTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SubclassAttrShadowTestCase >> resultAt: aKey [
	"True when the fixture's check agreed with CPython; otherwise the
	``got X, want Y'' string, which is what the failure message should say."

	| v |
	v := probe @env1:__getitem__: aKey.
	v == true ifTrue: [^ 'ok'].
	^ v @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
SubclassAttrShadowTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'subclass_attr_shadow' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subclass_attr_shadow.py')
		name: 'subclass_attr_shadow'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testDepthOfTheNamedBase [
	"The value comes from the base NAMED IN THE HEADER, not from the class that
	declares the accessor, in a three-deep chain carrying a distinct value at
	each level.  ``middle_named_base_wins'' is the one that exercises the merge
	(the named base ties on depth with the leftmost, so it is copied and must
	still answer its OWN 1 rather than the declaring class's 0);
	``deepest_named_base_wins'' names the deepest base, which therefore becomes
	the storage base and is inherited -- it was green before the fix too, and is
	kept as the paired control rather than presented as a second repro."

	self assert: (self resultAt: 'deepest_named_base_wins') equals: 'ok'.
	self assert: (self resultAt: 'middle_named_base_wins') equals: 'ok'.

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testMiChildSeesNearestBase [
	"THE BUG.  ``class C(S1, B)'' where B was reassigned after its class body:
	C.x must answer B's value, not the value B's own base declared."

	self assert: (self resultAt: 'mi_child_sees_nearest_base') equals: 'ok'.
	self assert: (self resultAt: 'base_keeps_its_own_value') equals: 'ok'.
	self assert: (self resultAt: 'subclass_sees_reassignment') equals: 'ok'.

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testMutableAttrIsSharedNotCopied [
	"CPython does not copy a base's attribute into a subclass at all, so a
	mutable one is the SAME OBJECT seen from both.  Grail's copy-down stores the
	value, not a clone, so mutating it through the merged class is visible on the
	base -- asserted rather than assumed, because a fix that cloned instead of
	referencing would pass every other check here."

	self assert: (self resultAt: 'mutable_attr_is_shared_not_copied') equals: 'ok'.

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testPrecedenceControls [
	"The other direction: reading the nearer value must not start OVERRIDING
	things that legitimately outrank it.  An attribute never reassigned still
	resolves to its declaring class; a value on the leftmost (storage) base
	still beats a secondary base's; and the child's own class body beats both."

	self assert: (self resultAt: 'unreassigned_attr_still_inherits') equals: 'ok'.
	self assert: (self resultAt: 'leftmost_base_wins') equals: 'ok'.
	self assert: (self resultAt: 'own_body_outranks_bases') equals: 'ok'.

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testShallowFirstBaseWasAlwaysCorrect [
	"THE DISCRIMINATOR, kept as a standing check.  With a SHALLOW first base, B
	is the deepest base and becomes the storage base, so nothing is copied and
	the read was already right.  That is the shape four earlier minimal repros
	had, and it is why the defect read as absent.  If this ever becomes the only
	passing row again, the repro has lost its teeth."

	self assert: (self resultAt: 'shallow_first_base_is_correct') equals: 'ok'.

]

{ #category : 'Grail-Tests' }
SubclassAttrShadowTestCase >> testYamlShapeClassmethodMutatingCls [
	"pyyaml's actual shape, reduced: a @classmethod doing ``cls.tbl = ...'' at
	import time populates the MIDDLE class's storage, leaving the declaring
	base's empty.  This is the one that made every YAML scalar a str."

	self assert: (self resultAt: 'yaml_shape_base_untouched') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_middle_populated') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_loader_sees_middle') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_loader_contents') equals: 'ok'.

]
