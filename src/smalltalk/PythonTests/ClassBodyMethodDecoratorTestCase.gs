! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyMethodDecoratorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyMethodDecoratorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ClassBodyMethodDecoratorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyMethodDecoratorTestCase -- ``@deco def m'' inside a class body.
!
! In CPython the decorator runs while the class body executes, so the class dict
! only ever holds the wrapper.  Grail compiles the def to a real Smalltalk method
! first, so the earliest the decorator can run is once the class exists -- the
! rebinding therefore stores OVER the compiled method rather than in place of it,
! as ``Cls.m = A(B(Cls.m))''.
!
! That only works because of the lookup rule this suite also pins: a
! class-attribute store SHADOWS a compiled method of the same name.  It used to
! shadow it on the CLASS path only -- the Behavior branch of ___pyAttrLoad___
! consults the per-class store before its method wrap, while the instance path
! reached the BoundMethod wrap first and the store was never read.  So ``A.m =
! f'' made ``A.m'' the wrapper while ``a.m()'' still ran the original: a
! monkey-patching bug in its own right, and what made class-body method
! decorators unimplementable in this shape.
!
! Three further things had to be true, each found by a test here failing:
!
!   * The chain's base must be minted as an UnboundMethod for the COMPILED
!     method, not read back as ``Cls.m''.  The read is not idempotent -- the
!     rebinding stores onto the committed class, so re-executing the class body
!     would read the previous run's wrapper and wrap the wrapper.  Flask's
!     ``@setupmethod'' did exactly that (two nested wrapper frames, the inner
!     guard raising NotImplementedError).
!   * super() needed the same shadowing rule; its lookup walked compiled methods
!     only, so it ran the parent's UNDECORATED method.
!   * callable() and the call protocol had to accept an UnboundMethod.  A
!     decorator that returns its argument unchanged (@unittest.skip and friends)
!     leaves one as the class attribute, and unittest's own discovery keeps a
!     name only when ``callable(getattr(cls, name))'' -- so such test methods
!     silently VANISHED from discovery rather than failing.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyMethodDecoratorTestCase removeAllMethods.
ClassBodyMethodDecoratorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
loadFixture
	"Load tests/python/class_body_decorators.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'class_body_decorators' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_decorators.py')
		name: 'class_body_decorators'
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDecoratorIsApplied
	"The whole point: a class-body method decorator takes effect at all."

	self assert: self loadFixture @env1:decorator_is_applied equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDecoratorAppliedToFreshAndExistingInstances
	"The rebinding is a CLASS attribute, so instances created before it and
	after it both see it."

	self assert: self loadFixture
		@env1:decorator_applied_to_fresh_and_existing_instances
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testStackedDecoratorsApplyBottomUp
	"``@A @B def m'' is A(B(m)) -- the decorator nearest the def runs first."

	self assert: self loadFixture @env1:stacked_decorators_apply_bottom_up
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testWrapsCopiesNameOffTheUnboundMethod
	"functools.wraps reads __name__ off what it is handed -- an UnboundMethod
	for a class-body decorator.  update_wrapper SKIPS a name it cannot read, so
	the missing accessor made @wraps look like a silent no-op."

	self assert: self loadFixture @env1:wraps_copies_name_off_the_unbound_method
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testUnboundMethodReportsItsOwnMetadata
	"``Cls.m.__name__'' / ``__qualname__'' independent of any decorator."

	self assert: self loadFixture @env1:unbound_method_reports_its_own_metadata
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testFailingDecoratorLeavesTheMethodIntact
	"Strictly additive.  A decorator that raises leaves the compiled method in
	place -- the old behaviour of dropping it -- instead of breaking the class."

	self assert: self loadFixture @env1:failing_decorator_leaves_the_method_intact
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDeclarativeDecoratorsAreUntouched
	"@staticmethod / @classmethod / @property are handled at PARSE time by
	re-classing the def; re-applying them at class-build time would double-handle
	them."

	self assert: self loadFixture @env1:declarative_decorators_are_untouched
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testPropertySetterStillWorks
	"``@x.setter'' is an accessor form, not a decorator to apply."

	self assert: self loadFixture @env1:property_setter_still_works equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDecoratedMethodIsInherited
	"A subclass with no override sees the parent's decorated method."

	self assert: self loadFixture @env1:decorated_method_is_inherited equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testSuperSeesTheParentsDecoratedMethod
	"super() has its own lookup, which walked compiled methods only."

	self assert: self loadFixture @env1:super_sees_the_parents_decorated_method
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDundersCanBeDecorated
	"__init__ and __repr__ are ordinary methods as far as this goes."

	self assert: self loadFixture @env1:dunders_can_be_decorated equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testMonkeyPatchingAMethodIsVisibleThroughInstances
	"The independent bug the shadowing rule fixes: ``A.m = f'' was visible as
	``A.m'' but ``a.m()'' still ran the original compiled method."

	self assert: self loadFixture
		@env1:monkey_patching_a_method_is_visible_through_instances
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testNonCallableClassAttributeShadowsAMethod
	"Assigning a non-callable over a method answers the VALUE, not a bound
	method -- CPython replaces the class-dict entry outright."

	self assert: self loadFixture @env1:non_callable_class_attribute_shadows_a_method
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testClassAccessedMethodIsCallable
	"``callable(Cls.m)''.  An UnboundMethod implements the call protocol as
	value:value:, not __call__, so callable() answered False -- and unittest
	discovery, which keeps a name only when ``callable(getattr(cls, name))'',
	dropped rebound test methods entirely rather than failing them."

	self assert: self loadFixture @env1:class_accessed_method_is_callable
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testUnboundMethodIsCallableThroughABinding
	"A decorator that returns its argument unchanged (@unittest.skip and
	friends) leaves an UnboundMethod as the class attribute; an instance read
	has to bind self to it like any other function in a class dict."

	self assert: self loadFixture @env1:unbound_method_is_callable_through_a_binding
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testDecoratorIsNotReappliedOnReimport
	"Re-executing a class body must REPLACE the wrapper, not stack another layer
	on it.  The rebinding stores onto the committed class, so reading the base
	back as ``Cls.m'' picked up the previous run's wrapper -- flask's
	``@setupmethod'' ended up applied twice, and its inner guard raised
	NotImplementedError on every Flask() construction.  The base is therefore
	minted as an UnboundMethod for the compiled method instead.

	Driven from Smalltalk because it needs the module evicted from sys.modules
	and re-imported, which is what the codegen actually has to survive."

	| path results |
	path := importlib grailDir , '/tests/python/class_body_decorators.py'.
	results := OrderedCollection new.
	1 to: 3 do: [:i |
		| mod cls inst |
		importlib @env1:modules removeKey: #'class_body_decorators' ifAbsent: [nil].
		mod := importlib loadModuleFromPath: path name: 'class_body_decorators'.
		cls := mod @env1:___pyAttrLoad___: #'Stacked'.
		inst := cls @env1:value: #() value: nil.
		results add: ((inst @env1:___pyAttrLoad___: #'m') @env1:value: #() value: nil) asString].
	"One layer of each decorator on every import, never two."
	self assert: results asArray
		equals: (Array with: 'OUT(IN(base))' with: 'OUT(IN(base))' with: 'OUT(IN(base))')
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testInstanceDecoratorIsApplied
	"A decorator that is a callable INSTANCE rather than a function was
	dropped in silence: codegen applies it through ___pyCallValue___:kw:,
	which only object implemented -- as the TypeError ``not callable'' --
	and the application guard discarded that.  PythonInstance now forwards
	___pyCallValue___:kw: to its value:value:, which does the real __call__
	dispatch."

	self assert: self loadFixture @env1:instance_decorator_is_applied
		equals: true
%

category: 'Grail-Tests-ClassBodyMethodDecorator'
method: ClassBodyMethodDecoratorTestCase
testAPlainInstanceIsStillNotCallable
	"The other side of that fix: callable() decides by asking which class
	OWNS a call entry point, so PythonInstance's new inherited forwarder
	must be excluded exactly like its value:value: already was, or every
	object in the image reports callable."

	self assert: self loadFixture @env1:a_plain_instance_is_still_not_callable
		equals: true
%
