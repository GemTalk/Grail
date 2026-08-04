! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperTwoArgLocalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperTwoArgLocalTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperTwoArgLocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperTwoArgLocalTestCase
!
! ``super(Cls, obj)'' where Cls is a METHOD-LOCAL class.
!
! The zero-arg ``super()'' already handled this: a class defined inside a
! function is not a module attribute, so CallAst resolves it through the
! class's closure cell (``___cell_<ClassName>___'') instead of the module
! instance's class accessor.  The TWO-arg form never got that branch -- it
! always took the accessor, which answers NIL for such a class.
!
! Every Super consumer then walked ``nil superClass'': an env-0
! MessageNotUnderstood, which Python cannot catch.  So one bad call did not
! fail by itself, it took down the whole module run -- which is how it
! presented in test_functools' test_cache_invalidation, as an uncatchable
! Smalltalk error in a test about cache invalidation with no visible
! connection to super().
!
! Two changes, and the second matters even though nothing routes to it today:
!   * CallAst gives the two-arg form the same closure-cell branch, when the
!     named class IS the one being compiled.  That is the shape the cell key
!     is stored under, and it covers every corpus occurrence -- each names its
!     own class (django's RelatedManager / ManyRelatedManager, test_enum's
!     auto_enum / TheirEnum, test_functools' TracingDict).  Naming a DIFFERENT
!     method-local class keeps the old path and the old limitation.
!   * Super class >> cls:obj: REJECTS a non-class, where it is still
!     catchable.  A future path that leaves cls nil now raises TypeError
!     rather than escaping as a Smalltalk error.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperTwoArgLocalTestCase removeAllMethods.
SuperTwoArgLocalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperTwoArgLocalTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_two_arg_local' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/super_two_arg_local.py')
		name: 'super_two_arg_local'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: SuperTwoArgLocalTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the method-local two-arg form ---

category: 'Grail-Tests - Method-Local'
method: SuperTwoArgLocalTestCase
testTwoArgSuperInAMethodLocalClass
	"The headline case.  Before, this raised an UNCATCHABLE env-0
	MessageNotUnderstood (``nil does not understand #superClass'') that took
	the whole module run with it."

	| got |
	got := (self at: 'local_two_arg') asArray.
	self assert: (got at: 1) asArray equals: #( 'Base' 'Sub' ).
	self assert: (got at: 2) @env0:asString equals: 'Sub->Base'.
%

category: 'Grail-Tests - Method-Local'
method: SuperTwoArgLocalTestCase
testTwoArgSuperResolvedFromASubclassInstance
	"``super(Sub, self).who()'' called on a SubSub instance.  The cell key is
	name-specific, so it answers Sub however far down the receiver is -- if
	it answered the receiver's own class instead, this would recurse until
	the stack gave out rather than reaching Base."

	self assert: (self at: 'local_two_arg_from_subclass') @env0:asString
		equals: 'Sub->Base'.
%

category: 'Grail-Tests - Method-Local'
method: SuperTwoArgLocalTestCase
testTwoArgSuperInAClassmethod
	"``super(Sub, cls)'' -- the shape test_enum uses for a metaclass
	(``super(auto_enum, metacls)'')."

	self assert: (self at: 'local_two_arg_classmethod') @env0:asString
		equals: 'Sub->Base.make'.
%

! --- the forms that already worked ---

category: 'Grail-Tests - Guards'
method: SuperTwoArgLocalTestCase
testZeroArgSuperInAMethodLocalClassStillWorks
	"This is the branch the fix was copied from; it must be untouched."

	self assert: (self at: 'local_zero_arg') @env0:asString equals: 'Sub->Base'.
%

category: 'Grail-Tests - Guards'
method: SuperTwoArgLocalTestCase
testTwoArgSuperAtModuleScopeStillWorks
	"A module-scope class keeps the accessor path, in __init__ and in an
	ordinary method."

	self assert: (self at: 'module_two_arg_init') asArray
		equals: #( 'ModBase' 'ModSub' ).
	self assert: (self at: 'module_two_arg_method') @env0:asString
		equals: 'ModSub->ModBase'.
%

! --- the uncatchable-error guard ---

category: 'Grail-Tests - Guards'
method: SuperTwoArgLocalTestCase
testANonClassFirstArgumentRaisesTypeError
	"Exercised directly: no Python spelling reaches it any more, which is the
	point -- the guard is there so a FUTURE path that leaves cls nil fails
	catchably instead of escaping as a Smalltalk MessageNotUnderstood.
	(``super(None, x)'' does not reach it: a non-NameAst first argument is
	not rewritten at all, so ``super'' stays an undefined name and raises
	NameError, exactly as before.)"

	self
		should: [Super @env1:cls: nil obj: 1]
		raise: (Python @env0:at: #'TypeError').
	self
		should: [Super @env1:cls: 17 obj: 1]
		raise: (Python @env0:at: #'TypeError').
%

set compile_env: 0
