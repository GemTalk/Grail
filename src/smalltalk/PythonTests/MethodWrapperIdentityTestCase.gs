! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodWrapperIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodWrapperIdentityTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodWrapperIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodWrapperIdentityTestCase
!
! WHAT A staticmethod / classmethod WRAPPER SAYS ABOUT WHAT IT WRAPS.
!
! ``staticmethod(f)'' and ``classmethod(f)'' are objects in their own right, and
! CPython makes them report the IDENTITY of the wrapped callable: the same
! __module__, __qualname__, __name__, __doc__ and __annotations__ objects f
! itself answers, plus f under BOTH ``__func__'' (the descriptor protocol's
! spelling) and ``__wrapped__'' (the one introspection follows -- inspect.signature
! unwraps through it, functools.wraps sets it).  Their repr names the wrapped
! callable.
!
! Grail forwarded some and not others, and each miss had a different shape:
!
!   * __wrapped__ and __module__ were missing outright, so
!     ``getattr(wrapper, attr)'' raised AttributeError.
!   * __annotations__ WAS forwarded but was not listed in
!     ___pythonValueAttrs___, so reading it handed back a BoundMethod instead of
!     the dict.  That one is worth noticing: a bound method is truthy, so a
!     careless check passes and only an isinstance or an equality test catches it.
!   * __repr__ answered ``<staticmethod object>'', which says nothing about the
!     one interesting thing a wrapper has.
!
! test_decorators' test_staticmethod and test_classmethod assert all of it; both
! now pass, taking the module's errors from 5 to 3.
!
! THE OTHER HALF IS CATCHABILITY.  CPython made STATICMETHOD callable in 3.10
! (bpo-43682) and deliberately left classmethod alone -- a classmethod has
! nothing to bind its first argument to until a class supplies one.  Grail
! refused the call too, but by falling through to an env-1
! MessageNotUnderstood on #'__call__', which Python cannot catch: so
! ``assertRaises(TypeError, wrapper, 1)'' did not FAIL, it took the whole test
! down as an error.  Both call entry points now raise the catchable TypeError,
! because otherwise which one a caller happens to reach decides whether the
! refusal can be handled.
!
! THE FIXTURE ASSERTS RELATIONS, NOT LITERALS, and its function is nested inside
! a def to match upstream -- both deliberate.  A Grail MODULE-LEVEL function
! answers a FRESH object per read for __qualname__, __name__ and __annotations__,
! so ``f.__name__ is f.__name__'' is false and identity cannot hold however
! faithfully the wrapper forwards; its __doc__ is None even with a docstring.
! Written at module scope the fixture reported the wrapper as broken when the
! wrapper was fine.  That gap is recorded as its own XFAIL row rather than
! folded in here, and the test below pins it so the two cannot be confused.
!
! Fixture: tests/python/method_wrapper_identity.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: MethodWrapperIdentityTestCase
setUp
	probe := self ___loadProbe___: 'method_wrapper_identity'.
%

category: 'Grail-Private'
method: MethodWrapperIdentityTestCase
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
method: MethodWrapperIdentityTestCase
reprAt: aKey
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testAStaticmethodForwardsTheWrappedIdentity
	"__func__, __wrapped__, and the five forwarded attributes, by IDENTITY.
	__wrapped__ and __module__ used to raise AttributeError outright."

	self assert: (self reprAt: 'staticmethod_forwards')
		equals: '[True, True, True]'.
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testAClassmethodForwardsTheWrappedIdentity
	"The same set, on the other wrapper.  Both are checked rather than one: the
	two classes carry SEPARATE copies of every forwarding method and of
	___pythonValueAttrs___, so a fix applied to one leaves the other exactly as
	it was."

	self assert: (self reprAt: 'classmethod_forwards')
		equals: '[True, True, True]'.
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testAnnotationsReadsAsTheMappingNotABoundMethod
	"THE MISS THAT LOOKED LIKE A HIT.  __annotations__ was forwarded but absent
	from ___pythonValueAttrs___, so the read wrapped the forwarding METHOD and
	answered a BoundMethod.  That is truthy, so a plain ``if ann:'' passes and
	only an isinstance or equality check catches it -- which is what this test
	does."

	self assert: (self reprAt: 'annotations_is_a_mapping') equals: '[True, True]'.
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testTheReprNamesTheWrappedCallable
	"``<staticmethod(<function f at 0x...>)>''.  Asserted as the FORM, built from
	the same repr a reader would get, because Grail reprs a function as
	``<BoundMethod object at ...>'' -- a separate gap that a literal expectation
	here would have entangled with this one."

	self assert: (self reprAt: 'staticmethod_repr') equals: 'True'.
	self assert: (self reprAt: 'classmethod_repr') equals: 'True'.
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testAClassmethodObjectRefusesTheCallCatchably
	"A staticmethod object is callable (bpo-43682, 3.10); a classmethod object is
	not.  The point of the test is CATCHABILITY, not the refusal: Grail already
	refused, but as an env-1 MessageNotUnderstood that Python cannot catch, so
	``assertRaises(TypeError, wrapper, 1)'' errored the test instead of passing
	it."

	self assert: (probe @env1:__getitem__: 'staticmethod_is_callable') equals: 1.
	self assert: (self reprAt: 'classmethod_is_not_callable')
		equals: '"TypeError: ''classmethod'' object is not callable"'.
%

category: 'Grail-Tests'
method: MethodWrapperIdentityTestCase
testAModuleLevelFunctionsIdentityAttrsAreStillUnstable
	"THE GAP THIS WORK SURFACED, pinned so it cannot be mistaken for the wrapper
	one.  A Grail module-level function answers a FRESH object per read for
	__name__, __qualname__ and __annotations__, and None for __doc__ even with a
	docstring -- so ``f.__name__ is f.__name__'' is false and no amount of correct
	forwarding makes identity hold through a wrapper.  A nested def has none of
	these problems, which is why the fixture nests its function exactly as
	upstream does.  CPython answers True, True, True and the docstring."

	self assert: (self reprAt: 'module_level_function_attrs_are_unstable')
		equals: '[False, False, False, None]'.
%
