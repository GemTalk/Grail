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

category: 'Grail-Tests - __class__ name'
method: SuperTwoArgLocalTestCase
testClassNameReadsDefiningClass
	"The bare name ``__class__'' inside a method reads the class the method
	was DEFINED in -- CPython's implicit closure cell, the same one zero-arg
	super() consults.

	Grail had no such name, so the read fell through to the fast-path builtin
	wrap and answered a BoundMethod for ``builtins.__class__''.  That is the
	SAME object for every class, so ``__class__ is X'' was quietly false
	everywhere rather than raising -- test_super's
	test___class___instancemethod / _classmethod / _staticmethod."

	self assert: (probe @env1:__getitem__: 'class_name_instance') equals: true.
	self assert: ((probe @env1:__getitem__: 'class_name_cm_sm') @env1:__getitem__: 0)
		equals: true.
	self assert: ((probe @env1:__getitem__: 'class_name_cm_sm') @env1:__getitem__: 1)
		equals: true
%

category: 'Grail-Tests - __class__ name'
method: SuperTwoArgLocalTestCase
testClassNameIsDefiningClassNotTypeOfSelf
	"A method inherited by a subclass still sees the class whose body it
	appeared in, not type(self).  That distinction is why the closure-cell key
	is name-specific (``___cell_<ClassName>___''), and it is what makes
	__class__ share CallAst's resolution with zero-arg super() rather than
	reaching for the receiver's class."

	| pair |
	pair := probe @env1:__getitem__: 'class_name_defining'.
	self assert: (pair @env1:__getitem__: 0) equals: true.
	self assert: (pair @env1:__getitem__: 1) equals: true.
	self assert: (probe @env1:__getitem__: 'class_name_with_super') equals: 'B+D'
%

category: 'Grail-Tests - __class__ name'
method: SuperTwoArgLocalTestCase
testExplicitLocalShadowsClassNameCell
	"An enclosing function that declares ``__class__'' itself still wins: the
	cell read stands down for a ``nonlocal __class__'' local.

	The stand-down test is per-ENCLOSING-FUNCTION, not isVariableIsDeclared:,
	which also consults module scope.  A single ``global __class__'' anywhere
	in a file registers the name there -- test_super does exactly that inside
	one test -- which made __class__ look declared for the whole module and
	stood the branch down in every unrelated method."

	self assert: (probe @env1:__getitem__: 'class_name_local_wins')
		equals: 'shadowed'
%

category: 'Grail-Tests - super as a name'
method: SuperTwoArgLocalTestCase
testSuperIsAFirstClassName
	"``super'' was only ever a CallAst rewrite -- the zero-arg form and the
	2-arg form with a bare NameAst first argument.  Every other use raised
	``name 'super' is not defined'', because ``super'' is a Smalltalk
	PSEUDO-VARIABLE and the identifier can never be emitted as itself, so
	nothing was emitted at all.

	NameAst resolves it to the Super class, which IS Python's super type here,
	so ``f = super'', ``class mysuper(super)'' and a direct call all see a real
	object."

	self assert: (probe @env1:__getitem__: 'super_is_a_name') equals: true.
	self assert: (probe @env1:__getitem__: 'super_subclassed') equals: 'mysuper'
%

category: 'Grail-Tests - super as a name'
method: SuperTwoArgLocalTestCase
testSuperConstructorArgumentChecks
	"Calling it runs CPython's own argument diagnostics, which the generic
	class-call path could not give: it reported its own ``takes wrong number
	of arguments'' wording instead."

	self assert: (probe @env1:__getitem__: 'super_too_many_arguments')
		equals: true.
	self assert: (probe @env1:__getitem__: 'super_first_arg_type') equals: true
%

category: 'Grail-Tests - super as a name'
method: SuperTwoArgLocalTestCase
testSuperProxyClassIsTheSuperType
	"``super().__class__'' is the super type itself.  The proxy delegates every
	attribute to the parent chain, which turned this into a parent-method
	proxy and made the comparison quietly false."

	self assert: (probe @env1:__getitem__: 'super_proxy_class') equals: true
%

category: 'Grail-Tests - super as a name'
method: SuperTwoArgLocalTestCase
testTwoArgSuperAcceptsNonModuleClasses
	"The 2-arg rewrite assumed its first argument NAMED a module-level class
	and emitted a module-attribute read for it.  Any other kind of name became
	a miss -- nil -- and Super then reported ``argument 1 must be a type, not
	NoneType'', a diagnosis of the wrong thing entirely.  A parameter holding a
	class and a builtin type are both ordinary and both were broken."

	self assert: (probe @env1:__getitem__: 'super_two_arg_local_class')
		equals: true.
	self assert: (probe @env1:__getitem__: 'super_two_arg_builtin') equals: true
%
