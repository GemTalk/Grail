! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for VarargsNamingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'VarargsNamingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
VarargsNamingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! VarargsNamingTestCase
!
! When a Python ``def f(*args, **kwargs):'' is compiled, Grail emits
! a Smalltalk method ``_f: positional kw: kwargs'' and an inner block
! ``[| args kwargs ... |'' that declares the user's vararg / kwarg
! names as rebindable temps.  Collision: when the user's name matches
! the Smalltalk method-param convention (``positional'' for *vararg,
! ``kwargs'' for **kwarg), the block temp shadows the method param
! and the body's binding line ``kwargs := kwargs ifNil: [...]'' reads
! the nil temp instead of the passed-in dict.  Every call effectively
! drops its keyword arguments.
!
! Fix: FunctionDefAst's generateModuleMethodSourceOn: and
! generateMethodSourceOn: detect the collision and rename method
! params to internal sentinels (``___pos___'' / ``___kw___'') so the
! block-temp / method-param namespace stays clean.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
VarargsNamingTestCase removeAllMethods.
VarargsNamingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: VarargsNamingTestCase
setUp
	"Reload tests/python/varargs_naming.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'varargs_naming' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/varargs_naming.py')
		name: 'varargs_naming'.
%

category: 'Grail-Tests - kwargs collision'
method: VarargsNamingTestCase
testKwargsCollisionPropagatesKwargs
	"``def f(*args, **kwargs):'' — user's **kwarg literally named
	``kwargs'' matches the Smalltalk method param convention.
	Pre-fix, calling ``f(1, 2, name='World', extra=True)'' delivered
	an empty kwargs dict.  Fixed: kwargs has the 2 entries."

	| result |
	result := testModule @env1:collides_kwargs_result.
	self assert: (result @env1:__getitem__: 0) equals: 2.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 'World'
%

category: 'Grail-Tests - positional collision'
method: VarargsNamingTestCase
testPositionalCollisionPropagatesArgs
	"``def f(*positional, **kw):'' — symmetric collision on the
	positional side: the user's *vararg is named ``positional''
	(matching the Smalltalk method-param convention).  The first
	positional element must come through unchanged."

	| result |
	result := testModule @env1:collides_positional_result.
	self assert: (result @env1:__getitem__: 0) equals: 2.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 'first'
%

category: 'Grail-Tests - no collision'
method: VarargsNamingTestCase
testNoCollisionStillWorks
	"``def f(*items, **options):'' — neither name collides with
	the method-param convention.  The original codegen path stays
	in effect.  Sanity check that the conditional rename doesn't
	break the non-collision case."

	| result |
	result := testModule @env1:no_collision_result.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: true
%
