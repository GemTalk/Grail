! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodOverrideArityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodOverrideArityTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodOverrideArityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodOverrideArityTestCase
!
! An override that CHANGES the parameter count of the method it overrides.
!
! Grail spells a method's arity into its selector, so
!
!     class Base:    def f(self):        ...   ->   f
!     class Derived: def f(self, extra): ...   ->   f:
!
! leaves BOTH selectors reachable through the class chain.  Those are the same
! two spellings a synthesized property getter/setter pair has, so the pair
! branch in ``object >> ___pyAttrLoad___'' claimed the name, PERFORMED the
! unary, and answered a RETURN VALUE where Python answers a bound method.
! ``Derived().f('x')'' then died with ``'Unicode7' object is not callable'' --
! it had Base.f's STRING in hand and tried to call it.
!
! No ``super'' is involved: the same failure reproduces with a plain ``def''
! body.  It surfaced while writing super() fixtures, which is why it LOOKED
! like a Super bug.
!
! The category probe that already guards this branch (``a fixed-arity
! forwarder is not a setter'') cannot separate these: both halves of an
! override are ordinary ``Grail-Class Methods'', exactly what an explicit
! ``@x.setter'' carries.  OWNERSHIP separates them -- a property pair is
! declared together on ONE class, so its two spellings share an owner, while
! an override's never do.  Hence
! ``___unaryGetterShadowedBySetter___:setter:''.
!
! Only the WIDENING direction is fixed.  The mirror shape -- a subclass
! narrowing an inherited ``name:'' to a unary ``name'' -- remains broken, and
! is left so on purpose: it is shape-identical to a property whose GETTER
! alone is overridden while the setter is inherited, which is exactly what
! test_property's ``PropertySubNewGetter'' does.  A symmetric rule was tried
! and regressed test_property; separating those two needs property
! provenance that Grail does not record today.
!
! The property tests here are the guard on that reasoning, not decoration:
! they pin that a genuine pair still reads as a VALUE, both when declared
! locally and when inherited intact from an ancestor.
!
! Every expectation is CPython 3.14's own output for tests/python/
! method_override_arity.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodOverrideArityTestCase removeAllMethods.
MethodOverrideArityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodOverrideArityTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'method_override_arity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/method_override_arity.py')
		name: 'method_override_arity'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: MethodOverrideArityTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the headline failure, in both directions ---

category: 'Grail-Tests - Arity-Changing Override'
method: MethodOverrideArityTestCase
testOverrideWideningTheParameterCount
	"``def f(self, extra)'' over an inherited ``def f(self)''.  Before, the
	attribute load answered Base.f's RESULT -- the string 'base' -- and the
	call site raised ``'Unicode7' object is not callable''."

	self assert: (self at: 'widen') @env0:asString equals: 'base+x'.
%

category: 'Grail-Tests - Arity-Changing Override'
method: MethodOverrideArityTestCase
testAnInheritedMethodIsStillReachable
	"``g'' is inherited, not overridden.  The guard is narrow enough that
	adding it did not disturb ordinary inheritance alongside an override of
	a DIFFERENT name on the same class."

	self assert: (self at: 'inherited') @env0:asString equals: 'base-g:i'.
%

category: 'Grail-Tests - Arity-Changing Override'
method: MethodOverrideArityTestCase
testOverrideAcrossTwoLevels
	"Three classes, ``f'' widening at each step (0 -> 1 -> 2 params), each
	level delegating up through super().  Every link is an owner mismatch."

	self assert: (self at: 'deep') @env0:asString equals: 'base+a+b'.
%

! --- the override as a first-class object, not just as a call ---

category: 'Grail-Tests - Bound Method'
method: MethodOverrideArityTestCase
testTheOverrideReadsAsABoundMethod
	"``m = d.f'' then ``m('h')''.  The load has to answer a bound method; it
	used to answer the parent's return value, so the handle was a string."

	self assert: (self at: 'handle') @env0:asString equals: 'base+h'.
	self assert: (self at: 'callable') equals: true.
%

category: 'Grail-Tests - Bound Method'
method: MethodOverrideArityTestCase
testTheOverrideReadsThroughGetattr
	"getattr() takes the same load path as attribute syntax, so it must
	agree -- a fix that only corrected the compiled send would not."

	self assert: (self at: 'getattr') @env0:asString equals: 'base+ga'.
%

! --- guards: the parent, and genuine property pairs, are untouched ---

category: 'Grail-Tests - Guards'
method: MethodOverrideArityTestCase
testTheParentsOwnInstanceIsUnaffected
	"Both overridden names, called on a Base instance.  The override must
	not reach back up and change what the parent's own instances do."

	self assert: (self at: 'base_f') @env0:asString equals: 'base'.
	self assert: (self at: 'base_g') @env0:asString equals: 'base-g:y'.
%

category: 'Grail-Tests - Guards'
method: MethodOverrideArityTestCase
testAGenuinePropertyPairStillReadsAsAValue
	"The branch this fix narrows.  A ``@property''/``@prop.setter'' pair is
	declared on ONE class, so its owners match and the pair branch still
	claims it: the read answers the assigned VALUE, not a bound method."

	self assert: (self at: 'prop_read') @env0:asString equals: 'assigned'.
	self assert: (self at: 'prop_not_callable') equals: false.
%

category: 'Grail-Tests - Guards'
method: MethodOverrideArityTestCase
testAnInheritedPropertyPairStillReadsAsAValue
	"The case that makes ``same owner'' the right test rather than ``declared
	on the receiver's own class'': the pair is inherited intact, so a chain
	walk finds one owner for each spelling and they are the SAME ancestor."

	self assert: (self at: 'prop_inherited') @env0:asString equals: 'initial'.
%
