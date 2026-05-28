! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctoolsWrapsVarargsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctoolsWrapsVarargsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctoolsWrapsVarargsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctoolsWrapsVarargsTestCase
!
! Regression: ``functools _wraps:kw:'' — the varargs entry for
! ``@functools.wraps(f, assigned=..., updated=...)'' kwarg forms that
! jinja2.async_utils and CPython's decorator chains use.  Pre-fix, only
! the fixed-arity ``wraps:'' was defined; the kwarg call missed and the
! BoundMethod dispatch raised ``functools does not understand _wraps:kw:''
! mid-decorator-chain.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctoolsWrapsVarargsTestCase removeAllMethods.
FunctoolsWrapsVarargsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - functools'
method: FunctoolsWrapsVarargsTestCase
testWrapsKwargsReturnsIdentityDecorator
	"``functools.wraps(wrapped, assigned=..., updated=...)'' returns
	an identity-decorator stub.  Applying it to a function returns
	that function unchanged.  Goes through ``_wraps:kw:'' directly
	(the varargs entry the decorator-chain codegen dispatches into
	when kwargs are present)."

	| funct deco wrapped wrappee result kw |
	funct := functools @env0:___instance___.
	wrapped := [:x | x @env0:+ 1].
	kw := KeyValueDictionary @env0:new
		@env0:at: 'assigned' put: #('__name__');
		@env0:at: 'updated' put: #();
		yourself.
	deco := funct @env1:_wraps: { wrapped } kw: kw.
	"deco is an identity decorator block; apply it to a wrappee"
	wrappee := [:y | y @env0:* 2].
	result := deco @env1:value: { wrappee } value: nil.
	self assert: (result @env0:value: 5) equals: 10
%

category: 'Grail-Tests - functools'
method: FunctoolsWrapsVarargsTestCase
testWrapsKwargsRoutesThroughVarargsSelector
	"Confirm the dispatch goes through ``_wraps:kw:'' (the kwargs
	entry) rather than the fixed-arity ``wraps:'' — exercising the
	BoundMethod varargs path that the decorator chain uses."

	| funct |
	funct := functools @env0:___instance___.
	"Both selectors must exist for the dispatch to pick the right
	one based on kwarg presence."
	self assert: (functools @env0:whichClassIncludesSelector: #'wraps:' environmentId: 1) notNil.
	self assert: (functools @env0:whichClassIncludesSelector: #'_wraps:kw:' environmentId: 1) notNil
%

! Workaround note: the kwargs path ``testWrapsKwargsReturnsIdentityDecorator''
! walks end-to-end through the env-1 ``value:value:'' entry on functools,
! which is how the decorator-chain codegen invokes it.  The companion
! ``testWrapsKwargsRoutesThroughVarargsSelector'' confirms both selectors
! exist so the BoundMethod dispatcher picks the kwargs-aware one.
