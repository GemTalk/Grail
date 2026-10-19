Class {
	#name : 'SelfNamedClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SelfNamedClassTestCase >> resultAt: aKey [
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
SelfNamedClassTestCase >> selfNamedLocalResultsUnderIR: aBoolean [
	"Load tests/python/self_named_local.py under its own name with the IR arm
	forced on or off, and answer the repr of each failing check (empty when
	every check passed)."

	| mods module results failures |
	mods := importlib @env1:modules.
	mods removeKey: #'self_named_local' ifAbsent: [].
	self ___forgetCanonicalModule___: 'self_named_local'.
	importlib ___irCodegenForce___: aBoolean.
	module := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_named_local.py')
		name: 'self_named_local'.
	results := module @env1:___pyAttrLoad___: #'RESULTS'.
	failures := OrderedCollection new.
	#('as_parameter' 'as_assigned_local' 'as_method_local' 'as_lambda_parameter'
	  'as_comprehension_target' 'as_with_target' 'as_except_name' 'as_for_target')
		do: [:key |
			| v |
			v := (results @env1:__getitem__: key) @env1:__repr__ @env0:asString.
			v = 'True' ifFalse: [failures add: key , ' -> ' , v]].
	^ failures asArray

]

{ #category : 'Grail-Setup' }
SelfNamedClassTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'self_named_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_named_class.py')
		name: 'self_named_class'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'

]

{ #category : 'Grail-Setup' }
SelfNamedClassTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'self_named_local' ifAbsent: [].
	self ___forgetCanonicalModule___: 'self_named_local'.
	super tearDown

]

{ #category : 'Grail-Tests' }
SelfNamedClassTestCase >> testGlobalStoreFromAClassBody [
	"THE EMISSION SITE.  ``global _counter'' inside a method compiles to a
	store through the module self-reference, which is the expression that
	resolved to the class instead of the module.  Before the fix the module
	could not be imported at all, so this test could not even reach setUp."

	self assert: (self resultAt: 'global_store_from_a_class_body') equals: 'True'.
	self assert: (self resultAt: 'global_store_accumulates') equals: 'True'.

]

{ #category : 'Grail-Tests' }
SelfNamedClassTestCase >> testSelfNamedLocalUnderIRCodegen [
	self assert: (self selfNamedLocalResultsUnderIR: true) equals: #()

]

{ #category : 'Grail-Tests' }
SelfNamedClassTestCase >> testSelfNamedLocalUnderTextCodegen [
	"THE ARM THAT FAILED.  Before the fix the module could not even be
	imported: the first check's module-global read sent ___instance___ to the
	local."

	self assert: (self selfNamedLocalResultsUnderIR: false) equals: #()

]

{ #category : 'Grail-Tests' }
SelfNamedClassTestCase >> testTheBareNameIsTheClassNotTheModule [
	"Inside the module, ``self_named_class(21)'' constructs -- it does not
	reach the module singleton."

	self assert: (self resultAt: 'bare_name_is_the_class') equals: 'True'.
	self assert: (self resultAt: 'isinstance_against_bare_name') equals: 'True'.

]

{ #category : 'Grail-Tests' }
SelfNamedClassTestCase >> testTheModuleIsStillReachableAndDistinct [
	"The rename must not cost the module its identity: it is still in
	sys.modules under its real name, still not the class, and its attributes
	still resolve."

	self assert: (self resultAt: 'module_is_reachable_via_sys_modules') equals: 'True'.
	self assert: (self resultAt: 'module_attributes_still_reachable') equals: 'True'.
	self assert: (self resultAt: 'class_name_is_not_the_module') equals: 'True'.

]
