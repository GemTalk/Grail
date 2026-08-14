! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyLocalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyLocalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyLocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyLocalsTestCase
!
! ``locals()'' (and zero-arg ``vars()'') inside a CLASS BODY.
!
! A class body executes as a namespace, so its locals() is the mapping being
! built into the class.  Grail answered the ENCLOSING FUNCTION's locals instead:
! the classdef is emitted in that function's scope, so CallAst's
! functionBeingCompiled still pointed at it and the locals() rewrite used that
! snapshot.  The names it reported were from a different scope entirely -- and
! Python's scoping rules say a class body cannot see them at all, since class
! scope is skipped when resolving a free variable.  test_scope's testLocalsClass
! asserts exactly that absence.
!
! CallAst >> printLocalsCallOn: now branches on ``inClassBodyValueEmit'' -- the
! flag ClassDefAst already sets while emitting attribute value expressions -- and
! builds the dict from ``classBodyBoundNames'', the per-attribute set ClassDefAst
! already computes so that a class body's sequential execution order is
! respected.  So a name bound LATER in the body is correctly absent too
! (testOnlyNamesBoundSoFar).
!
! THE WRITES ARE CONNECTED TOO.  CPython's class-body locals() is not a report
! ABOUT the namespace, it IS the namespace, so storing into it binds a class
! attribute and the rest of the body reads it back:
!
!     x = 42
!     class X:
!         locals()['x'] = 43
!         y = x                -- 43, and X.x is 43; the outer x is still 42
!
! Both halves used to be lost.  The dict was a snapshot, so the write vanished;
! and the read was resolved STATICALLY, so ``y = x'' compiled to the enclosing
! scope's x before the write existed.  Now the answer is a ClassBodyLocals bound
! to the class (its __setitem__/__delitem__ go through the same
! ___classBodyDefinitionalStore___ / ___classBodyDefinitionalDelete___ any other
! class-body binding does), and a class-body read in a body that CALLS locals()
! probes the class's own dynamically-bound names before resolving statically --
! CPython's LOAD_NAME order.  That is test_scope's testClassAndGlobal and
! testClassNamespaceOverridesClosure, and it completes the module.
!
! The probe is gated on the body calling locals()/vars() because that is the only
! way a name can be bound behind codegen's back; every other class body emits
! exactly what it did before.  It reads the class's OWN holder and not the bases,
! since LOAD_NAME never sees inherited attributes.
!
! KNOWN GAPS, deliberate and documented on the emitting method rather than
! papered over:
!
!   * The ENTRIES are still a snapshot: an instance held across statements does
!     not grow as the body binds more names (``d = locals()'' then ``q = 2'' --
!     CPython's d has q, Grail's does not).  Closing that means executing class
!     bodies into a real mapping instead of scanning them; see
!     docs/Class_Body_Namespace.md.
!   * CPython seeds a class namespace with __module__ / __qualname__ /
!     __firstlineno__; Grail reports only the names the body itself binds.  The
!     fixtures filter dunders on both sides so the comparison is honest.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_locals.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyLocalsTestCase removeAllMethods.
ClassBodyLocalsTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyLocalsTestCase
setUp
	"Reload tests/python/class_body_locals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_locals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_locals.py')
		name: 'class_body_locals'.
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testEnclosingLocalIsNotInClassLocals
	"THE BUG.  ``x'' is a local of the enclosing def.  A class body does not see
	it, so it must not appear in the class body's locals() -- and ``y'' and the
	method ``m'', which the body DOES bind, must.  Grail answered the enclosing
	function's locals here, which listed ``x'' and not ``y''."

	self assert: testModule @env1:enclosing_local_is_not_in_class_locals asArray
		equals: #( 'm' 'y' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testOnlyNamesBoundSoFar
	"A class body executes sequentially, so locals() reports what is bound at
	THAT POINT: ``b'' is absent from the earlier call and present in the later
	one, which also sees the name the earlier call bound."

	self assert: testModule @env1:only_names_bound_so_far asArray first asArray
		equals: #( 'a' ).
	self assert: testModule @env1:only_names_bound_so_far asArray last asArray
		equals: #( 'a' 'b' 'early' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testMethodsAreIncluded
	"A sibling ``def'' is a class-body binding like any other."

	self assert: testModule @env1:methods_are_included asArray
		equals: #( 'm' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testCallingLocalsDoesNotPollute
	"testLocalsClass's first half: calling locals() must not insert a free
	variable into the class namespace, so the class attribute ``x'' keeps the
	12 the body assigned rather than the enclosing 1."

	self assert: testModule @env1:calling_locals_does_not_pollute equals: 12.
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testVarsWithNoArgumentAgrees
	"Zero-arg vars() is locals() by definition, in a class body too -- both
	spellings go through the same rewrite."

	self assert: testModule @env1:vars_with_no_argument_agrees asArray
		equals: #( 'a' 'b' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testFunctionLocalsStillWorkInsideAMethod
	"A method body is a FUNCTION scope, so locals() there is unchanged.  The
	class-body branch keys off ``inClassBodyValueEmit'', which is false while
	method bodies are emitted even though classBeingCompiled is still set --
	getting that wrong would have captured every method's locals() too."

	self assert: testModule @env1:function_locals_still_work_inside_a_method asArray
		equals: #( 'a' 'b' ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testAWriteBindsAClassAttribute
	"THE WRITE HALF, and test_scope's testClassAndGlobal.  The store binds a
	class attribute, the body READS IT BACK (CPython's class-body LOAD_NAME),
	and the enclosing local of the same name is untouched.  Grail answered
	( false false ) -- the snapshot swallowed the write, and the read resolved
	statically to the enclosing binding."

	self assert: testModule @env1:a_write_binds_a_class_attribute asArray
		equals: #( true false true ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testAWriteOutranksTheEnclosingClosure
	"test_scope's testClassNamespaceOverridesClosure, first half: the class
	body's OWN binding wins over the enclosing def's local of that name, and
	leaves it alone.  Grail answered ( 42 42 )."

	self assert: testModule @env1:a_write_outranks_the_enclosing_closure asArray
		equals: #( 43 42 ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testAWriteThenDelLeavesNoAttribute
	"...and its second half.  Deleting the name the write bound leaves the
	class without it -- and still does not reach the enclosing x, which is what
	the ordinary function-local delete emit (``x := nil'') would have done."

	self assert: testModule @env1:a_write_then_del_leaves_no_attribute asArray
		equals: #( false 42 ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testVarsWritesTheSameNamespace
	"vars() is locals() for writes as much as for reads."

	self assert: testModule @env1:vars_writes_the_same_namespace asArray
		equals: #( 7 7 ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testAWriteThroughAnAliasLandsToo
	"The mapping is an OBJECT, not a compile-time spelling.  This is the shape
	enum's ``Period = vars()'' then ``Period['month_0'] = ...'' uses, and it is
	why the fix is a live mapping class rather than a rewrite of the literal
	``locals()[k] = v'' form -- no rewrite could follow the name."

	self assert: testModule @env1:a_write_through_an_alias_lands_too asArray
		equals: #( 5 true ).
%

category: 'Grail-Tests'
method: ClassBodyLocalsTestCase
testAnEnclosingLocalIsStillNotReadable
	"The runtime probe must not turn the enclosing scope's locals into
	class-body names.  ``x'' is a local of f, the class binds nothing of that
	name, so the read is still the enclosing one and the class gains no
	attribute -- the very absence testLocalsClass is about, now checked with the
	probe switched on."

	self assert: testModule @env1:an_enclosing_local_is_still_not_readable asArray
		equals: #( 12 false ).
%
