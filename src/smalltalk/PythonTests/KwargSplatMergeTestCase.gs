! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KwargSplatMergeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KwargSplatMergeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
KwargSplatMergeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KwargSplatMergeTestCase — a call mixing an explicit named keyword with a
! ``**mapping`` splat (``f(a, methods=m, **opts)``).  CallAst>>printKeywordsDictOn:
! used to DROP the ``**opts`` when named kwargs were also present, so flask's
! ``Rule(rule, methods=methods, **options)`` lost its ``endpoint``.  The splat
! is now merged into the kwargs dict via ``@env1:update:``.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KwargSplatMergeTestCase removeAllMethods.
KwargSplatMergeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-KwargSplat'
method: KwargSplatMergeTestCase
loadFixture
	"Load tests/python/kwarg_splat_merge.py fresh."

	importlib @env1:modules @env0:removeKey: #'kwarg_splat_merge' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/kwarg_splat_merge.py')
		name: 'kwarg_splat_merge'
%

category: 'Grail-Tests-KwargSplat'
method: KwargSplatMergeTestCase
testClassNamedAndSplat
	"``Recorder('rule', methods=['GET'], **{'endpoint':'hello','x':1})`` —
	the flask ``Rule(...)`` shape against a class constructor (legacy
	``value:value:`` dispatch path).  ``endpoint`` must bind from the splat
	and the genuinely-extra ``x`` must reach ``**extra``."

	| r |
	r := self loadFixture @env1:class_named_and_splat.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 1) @env0:size equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true
%

category: 'Grail-Tests-KwargSplat'
method: KwargSplatMergeTestCase
testFuncNamedAndSplat
	"Same shape against a plain function (varargs ``_name:kw:`` path)."

	| r |
	r := self loadFixture @env1:func_named_and_splat.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true
%

category: 'Grail-Tests-KwargSplat'
method: KwargSplatMergeTestCase
testSplatOnly
	"A lone ``**splat`` (no explicit kwargs) must still pass through."

	| r |
	r := self loadFixture @env1:splat_only.
	self assert: (r @env1:__getitem__: 0) equals: 'rule'.
	self assert: (r @env1:__getitem__: 1) @env0:size equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 'hello'.
	self assert: (r @env1:__getitem__: 3) equals: true
%
