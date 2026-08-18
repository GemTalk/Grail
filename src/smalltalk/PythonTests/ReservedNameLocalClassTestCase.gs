! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReservedNameLocalClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReservedNameLocalClassTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReservedNameLocalClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReservedNameLocalClassTestCase
!
! A CLASS NAMED AFTER A SMALLTALK PSEUDO-VARIABLE, DEFINED INSIDE A def.
!
! Six Python identifiers cannot be Smalltalk variables: ``self'', ``super'',
! ``nil'', ``true'', ``false'', ``thisContext''.  Grail has always carried such
! a BINDING under a ``_<name>'' transport -- FunctionDefAst declares the temp
! that way, NameAst reads it that way -- but a CLASS bound to one of those names
! was emitted with the raw Python name as its assignment target:
!
!     | ___curPos___ _super C |        "what the method declares"
!     super := (...) ___subclass___:   "what the class def emitted"
!
! ``super := ...'' is not legal Smalltalk.  So this was not a wrong answer: the
! METHOD FAILED TO COMPILE and the whole enclosing function became a codegen-gap
! stub (test_super's test_shadowed_local, which now passes).
!
! WHY IT SURVIVED A FIXTURE THAT LOOKS LIKE IT WOULD HAVE CAUGHT IT.  A
! module-scope class def wraps its emit in a block and declares its OWN block
! temp -- and GemStone permits ``[| super | ...]'', refusing only a method temp.
! super_shadowing_static.py binds ``class super:'' at module level and has
! passed since the day it was written.  One indent deeper it would not have.
!
! FOUR EMITTERS HAVE TO AGREE, and they are not free to give the same answer:
!
!   * ClassDefAst >> ___stVarName___ -- the assignment target, and the receiver
!     of every ___compileMethod: in the class's own emit.
!   * CallAst >> ___classBeingCompiledVar___ -- that same variable as seen from
!     a class-body statement.  Split from ``classBeingCompiled'' itself, which
!     must stay the PYTHON name: it is compared against source identifiers, keys
!     the ___cell_<name>___ store, and is an attribute selector on the module.
!   * NameAst >> ___readsThroughClassCell___ -- whether THIS read goes through
!     the class's closure cell (a method body: no link to the enclosing temps)
!     or inline in the enclosing method (an attribute value, a base, a
!     decorator).  Opposite answers for the same name, which is why the
!     reserved-name rename must consult the very same predicate the cell branch
!     acts on rather than a copy of it -- the copy disagreed, and
!     ``class C: borrowed = super.msg'' read the module.
!   * ClassDefAst >> ___enclosingScopeIdentifierFor___: -- the cell STORE, which
!     runs back in the enclosing scope.
!
! THE GUARD THAT MATTERS is the last one.  ``self'' is reserved but is normally
! the Smalltalk RECEIVER, with no transport temp anywhere, so a store that
! mangled it emitted an undeclared variable and cost the enclosing method.  That
! shape is live upstream -- a method-local class closing over the test's own
! ``self'' to call an assertion -- and it is exactly how
! test_mixed_staticmethod_hierarchy broke while test_shadowed_local was being
! fixed.  It is a test here, not a comment.
!
! Fixture: tests/python/reserved_name_local_class.py (self-verifying under
! CPython 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: ReservedNameLocalClassTestCase
setUp
	probe := self ___loadProbe___: 'reserved_name_local_class'.
%

category: 'Grail-Private'
method: ReservedNameLocalClassTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: ReservedNameLocalClassTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testAFunctionLocalClassNamedSuperCompilesAndIsCalled
	"The headline case, and the one that failed to COMPILE.  A method of a
	sibling class reads the shadowing class through zero-arg ``super()'',
	which resolves it from the class's closure cell."

	self assert: (self at: 'local_super') @env0:asString equals: 'quite super'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testAFunctionLocalClassNamedSelfIsNotTheReceiver
	"``self'' as a CLASS name.  The receiver parameter is deliberately spelled
	``inner'' in the fixture, so nothing here can pass by reading the receiver
	and calling it a hit."

	self assert: (self at: 'local_self') @env0:asString equals: 'quite self'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testTheOtherReservedNamesAreCoveredToo
	"``nil'', ``true'' and ``false'' are ordinary Python identifiers and reach
	the same three emitters.  One check rather than three: they differ only in
	spelling, and a fix that handled one would handle all of them or none."

	self assert: (self at: 'local_nil_true_false') @env0:asString equals: 'ntf'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testAReservedNameClassNestedInAClassBodyStillWorks
	"A different emitter: a class nested in a class BODY declares its own block
	temp rather than borrowing the enclosing method's, and stores the class as
	an attribute of the outer one.  The temp and the attribute symbol are the
	two halves that must NOT be spelled the same way."

	self assert: (self at: 'reserved_nested_in_class_body') @env0:asString
		equals: 'nested super'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testAClassBodyReadsTheEnclosingTempNotACell
	"The opposite answer to the method-body read above, for the same name in the
	same function.  A class-body attribute VALUE emits inline in the enclosing
	method, where the transport temp is reachable and no cell was ever stored --
	so standing the rename down here read the module instead and raised
	``module has no attribute 'msg'''."

	self assert: (self at: 'reserved_read_in_class_body') @env0:asString
		equals: 'body read'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testACapturedSelfIsStillTheReceiver
	"THE REGRESSION GUARD.  ``self'' is reserved, but a captured ``self'' is the
	enclosing method's RECEIVER -- there is no ``_self'' temp to name.  Mangling
	it in the closure-cell store emitted an undeclared variable and cost the
	whole enclosing method; this is the shape that caught it
	(test_super's test_mixed_staticmethod_hierarchy)."

	self assert: (self at: 'captured_self_still_receiver') @env0:asString
		equals: 'host'.
%

category: 'Grail-Tests'
method: ReservedNameLocalClassTestCase
testAShadowingLocalSuperReceivesTheArgumentsTheSourceWrote
	"Under the shadow ``super(1, 2)'' is an ordinary two-argument construction
	of an ordinary class -- NOT the builtin's (type, obj) form.  Confirms the
	local shadow reaches CallAst's 2-arg rewrite as well as the zero-arg one."

	self assert: (self at: 'local_super_instantiated') @env0:asString
		equals: '(1, 2)'.
%
