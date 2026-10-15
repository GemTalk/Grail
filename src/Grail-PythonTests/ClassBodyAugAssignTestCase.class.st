Class {
	#name : 'ClassBodyAugAssignTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyAugAssignTestCase >> setUp [
	"Reload tests/python/class_body_augassign.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_augassign' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_augassign.py')
		name: 'class_body_augassign'.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testAugmentedValueIsStored [
	"The attribute itself ends up with the augmented value: a body binding s to
	'a' and then doing ``s +='' leaves C.s == 'ab' rather than 'a'."

	self assert: testModule @env1:augmented_value_is_stored equals: 'ab'.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testChainedOps [
	"THE BUG.  Two augmented assignments after the initial binding: 1, then
	+1, then *5.  Both used to be dropped, so the class kept the initial 1."

	self assert: testModule @env1:chained_ops equals: 10.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testClassAttributeFromAMethod [
	"``G.c += 1'' inside a method is an ATTRIBUTE augmented assignment, a
	separate path that must keep working."

	self assert: testModule @env1:class_attribute_from_a_method equals: 6.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testInPlaceKeepsIdentity [
	"__iadd__ mutates rather than rebinding, so an alias taken BEFORE the
	augmented assignment sees the change.  The read-modify-write must hand the
	real object to the operator, not a copy."

	self assert: testModule @env1:in_place_keeps_identity asArray last
		equals: true.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testInsideAForLoop [
	"Inside a class-body ``for'', which the same runtime pass emits.  This one
	worked before only because nothing read ``t'' afterwards."

	self assert: testModule @env1:inside_a_for_loop equals: 6.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testInsideAnIf [
	"Class-body ``if'' has its own emit (emitClassBodyIf:on:); the augmented
	assignment inside it must still reach the class attribute."

	self assert: testModule @env1:inside_an_if equals: 7.

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testListInPlaceExtend [
	"``+='' on a list goes through __iadd__, which extends in place."

	self assert: testModule @env1:list_in_place_extend asArray
		equals: #( 1 2 3 ).

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testMethodLocalIsUnaffected [
	"A method body is a FUNCTION scope, so ``k += 41'' there is an ordinary
	local.  The class-body branch keys off ___inClassBodyRuntimeScope___, which
	walks out to the first FunctionDefAst and answers false -- getting that
	wrong would route every method-local augmented assignment at a class
	attribute."

	self assert: testModule @env1:method_local_is_unaffected asArray
		equals: #( 42 100 ).

]

{ #category : 'Grail-Tests' }
ClassBodyAugAssignTestCase >> testNonlocalAugAssignIsAppliedOnce [
	"A nonlocal target belongs to the enclosing-scope pass, not the class
	attribute pass.  Both passes scan the same statement list, so without the
	exclusion between them the increment would be applied TWICE and the answer
	would be 2."

	self assert: testModule @env1:nonlocal_augassign_is_applied_once equals: 1.

]
