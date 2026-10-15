Class {
	#name : 'ClassBodyLocalsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyLocalsTestCase >> setUp [
	"Reload tests/python/class_body_locals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_locals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_locals.py')
		name: 'class_body_locals'.

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testAnEnclosingLocalIsStillNotReadable [
	"The runtime probe must not turn the enclosing scope's locals into
	class-body names.  ``x'' is a local of f, the class binds nothing of that
	name, so the read is still the enclosing one and the class gains no
	attribute -- the very absence testLocalsClass is about, now checked with the
	probe switched on."

	self assert: testModule @env1:an_enclosing_local_is_still_not_readable asArray
		equals: #( 12 false ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testAWriteBindsAClassAttribute [
	"THE WRITE HALF, and test_scope's testClassAndGlobal.  The store binds a
	class attribute, the body READS IT BACK (CPython's class-body LOAD_NAME),
	and the enclosing local of the same name is untouched.  Grail answered
	( false false ) -- the snapshot swallowed the write, and the read resolved
	statically to the enclosing binding."

	self assert: testModule @env1:a_write_binds_a_class_attribute asArray
		equals: #( true false true ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testAWriteOutranksTheEnclosingClosure [
	"test_scope's testClassNamespaceOverridesClosure, first half: the class
	body's OWN binding wins over the enclosing def's local of that name, and
	leaves it alone.  Grail answered ( 42 42 )."

	self assert: testModule @env1:a_write_outranks_the_enclosing_closure asArray
		equals: #( 43 42 ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testAWriteThenDelLeavesNoAttribute [
	"...and its second half.  Deleting the name the write bound leaves the
	class without it -- and still does not reach the enclosing x, which is what
	the ordinary function-local delete emit (``x := nil'') would have done."

	self assert: testModule @env1:a_write_then_del_leaves_no_attribute asArray
		equals: #( false 42 ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testAWriteThroughAnAliasLandsToo [
	"The mapping is an OBJECT, not a compile-time spelling.  This is the shape
	enum's ``Period = vars()'' then ``Period['month_0'] = ...'' uses, and it is
	why the fix is a live mapping class rather than a rewrite of the literal
	``locals()[k] = v'' form -- no rewrite could follow the name."

	self assert: testModule @env1:a_write_through_an_alias_lands_too asArray
		equals: #( 5 true ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testCallingLocalsDoesNotPollute [
	"testLocalsClass's first half: calling locals() must not insert a free
	variable into the class namespace, so the class attribute ``x'' keeps the
	12 the body assigned rather than the enclosing 1."

	self assert: testModule @env1:calling_locals_does_not_pollute equals: 12.

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testEnclosingLocalIsNotInClassLocals [
	"THE BUG.  ``x'' is a local of the enclosing def.  A class body does not see
	it, so it must not appear in the class body's locals() -- and ``y'' and the
	method ``m'', which the body DOES bind, must.  Grail answered the enclosing
	function's locals here, which listed ``x'' and not ``y''."

	self assert: testModule @env1:enclosing_local_is_not_in_class_locals asArray
		equals: #( 'm' 'y' ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testFunctionLocalsStillWorkInsideAMethod [
	"A method body is a FUNCTION scope, so locals() there is unchanged.  The
	class-body branch keys off ``inClassBodyValueEmit'', which is false while
	method bodies are emitted even though classBeingCompiled is still set --
	getting that wrong would have captured every method's locals() too."

	self assert: testModule @env1:function_locals_still_work_inside_a_method asArray
		equals: #( 'a' 'b' ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testMethodsAreIncluded [
	"A sibling ``def'' is a class-body binding like any other."

	self assert: testModule @env1:methods_are_included asArray
		equals: #( 'm' ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testOnlyNamesBoundSoFar [
	"A class body executes sequentially, so locals() reports what is bound at
	THAT POINT: ``b'' is absent from the earlier call and present in the later
	one, which also sees the name the earlier call bound."

	self assert: testModule @env1:only_names_bound_so_far asArray first asArray
		equals: #( 'a' ).
	self assert: testModule @env1:only_names_bound_so_far asArray last asArray
		equals: #( 'a' 'b' 'early' ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testVarsWithNoArgumentAgrees [
	"Zero-arg vars() is locals() by definition, in a class body too -- both
	spellings go through the same rewrite."

	self assert: testModule @env1:vars_with_no_argument_agrees asArray
		equals: #( 'a' 'b' ).

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsTestCase >> testVarsWritesTheSameNamespace [
	"vars() is locals() for writes as much as for reads."

	self assert: testModule @env1:vars_writes_the_same_namespace asArray
		equals: #( 7 7 ).

]
