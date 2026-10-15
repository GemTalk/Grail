Class {
	#name : 'ClassBodyNonlocalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyNonlocalTestCase >> setUp [
	"Reload tests/python/class_body_nonlocal.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_nonlocal' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_nonlocal.py')
		name: 'class_body_nonlocal'.

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testAugmentedAssignmentReachesEnclosing [
	"test_scope's testNonLocalClass shape: ``nonlocal x; x += 1'' must increment
	the enclosing function's x and bind no class attribute.  The statement used
	to compile to nothing whatsoever, so the method read 0."

	self assert: testModule @env1:augmented_assignment_reaches_enclosing asArray
		equals: { 1. false }.

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testEnclosingFunctionSeesTheWrite [
	"The write is visible to the enclosing function directly, after the class
	statement -- not only through a method closing over the name."

	self assert: testModule @env1:enclosing_function_sees_the_write equals: 15.

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testMethodReadsTheBindingNotACopy [
	"A method closing over the nonlocal name reads the BINDING, so a write made
	after the class statement is visible to it -- the class-body write must not
	snapshot the value."

	self assert: testModule @env1:nonlocal_value_is_readable_by_a_method_after_later_writes asArray
		equals: #( 1 101 ).

]

{ #category : 'Grail-Tests - nonlocal __class__ in a method' }
ClassBodyNonlocalTestCase >> testNonlocalClassDoesNotBreakSiblingMethods [
	"A sibling method of the same class is unaffected -- zero-arg super() in
	particular still resolves, since it reads the defining class lexically and
	not through the name this method rebinds."

	| pair |
	pair := testModule @env1:nonlocal_class_does_not_break_siblings.
	self assert: (pair @env1:__getitem__: 0) equals: 'repaired'.
	self assert: (pair @env1:__getitem__: 1) equals: 'base+derived'

]

{ #category : 'Grail-Tests - nonlocal __class__ in a method' }
ClassBodyNonlocalTestCase >> testNonlocalClassInMethodCompiles [
	"``nonlocal __class__'' in a METHOD body -- the one name CPython exempts
	from needing an enclosing binding, since a class body supplies __class__ to
	its methods as an implicit closure cell.

	popScope stripped EVERY nonlocal name from the scope's local set, so the
	following assignment had no declared Smalltalk temp to target.  That is a
	CompileError, and Class.gs answers one by installing a stub that raises
	``Grail could not compile this method (codegen gap)'' when called -- so the
	failure surfaced only at call time.  test_super's TestSuper.tearDown is
	this exact shape, and because tearDown runs after EVERY test in the class,
	one uncompilable method errored nine of them.

	The name is now kept local when no enclosing scope binds it, which declares
	the temp.  Grail resolves __class__ lexically rather than through a
	rebindable cell, so the write stays within the method -- and the damage
	CPython's tearDown exists to repair cannot occur here in the first place."

	self assert: testModule @env1:nonlocal_class_in_method_compiles equals: 'T'

]

{ #category : 'Grail-Tests - nonlocal __class__ in a method' }
ClassBodyNonlocalTestCase >> testOrdinaryNonlocalStillWritesThrough [
	"The ordinary case must be untouched: a nonlocal that DOES have an
	enclosing binding still writes through to it rather than binding a fresh
	local.  That is the whole point of stripping the name, and the new
	exemption is conditioned on there being no enclosing binding at all."

	self assert: testModule @env1:nonlocal_with_enclosing_binding_still_writes_through
		equals: 2.
	self assert: testModule @env1:nonlocal_in_nested_function_still_writes_through
		equals: 'set by inner'

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testPlainAssignmentReachesEnclosing [
	"``nonlocal z; z = 42'' binds the OUTER z.  This is the case that was wrong
	in both directions -- the enclosing z kept its old value AND a class
	attribute ``z'' appeared, which CPython does not create."

	self assert: testModule @env1:plain_assignment_reaches_enclosing asArray
		equals: { 42. false }.

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testSameNameElsewhereStillBindsAClassAttribute [
	"The exclusion is scoped to the body that DECLARED the name nonlocal.  A
	different class body binding the same name still gets its class attribute,
	so the fix cannot be suppressing attributes by name globally."

	self assert: testModule @env1:same_name_elsewhere_still_binds_a_class_attribute asArray
		equals: { 1. 99. false. true }.

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testSeveralNonlocalNames [
	"``nonlocal a, b'' with both written, one augmented and one plain."

	self assert: testModule @env1:several_nonlocal_names asArray
		equals: #( 2 6 ).

]

{ #category : 'Grail-Tests' }
ClassBodyNonlocalTestCase >> testUnassignableNonlocalTargetStillCompiles [
	"REGRESSION GUARD.  A ``nonlocal'' declaration says the name is not local to
	the class body; it does NOT promise Grail has a Smalltalk temp for it.
	``__class__'' is the case that bites -- CPython supplies it as an implicit
	method closure cell, so ``nonlocal __class__; __class__ = 42'' is legal
	there, and emitting the write unconditionally is CompileError 1001 in Grail,
	which the class-body compile turns into a raise-on-call stub for the whole
	enclosing method.  That is what it did to test_super's
	test_various___class___pathologies, turning a plain assertion failure into a
	codegen gap -- a change the scoreboard gate did not flag, because the
	module's fail+error TOTAL was unchanged.

	___nonlocalTargetIsAssignableHere___: now skips the write for such a name.
	Asserted here is the part Grail and CPython agree on: the module compiles,
	the method runs, and ``__class__'' is not a class attribute."

	self deny: testModule @env1:unassignable_nonlocal_target_still_compiles.

]
