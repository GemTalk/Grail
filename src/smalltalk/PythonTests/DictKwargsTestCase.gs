! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictKwargsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictKwargsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DictKwargsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictKwargsTestCase
!
! Python ``dict(a=1, b=2)'' produces a dict whose keys are
! Python ``str''s.  Grail's CallAst varargs codegen builds the
! kwargs IdentityKeyValueDictionary with Symbol keys (fast
! Smalltalk-side ``at: #name'' lookup); the ``dict()'' constructor
! must convert those Symbol keys to Strings at the boundary so
! subsequent Python-level lookups by string literal
! (``d['name']'') match.
!
! Pre-fix, jinja2's render-context lookup missed every interpolated
! variable because the context (built by ``dict(*args, **kwargs)'')
! had Symbol-keyed entries while the template body looked them up
! by String.  Boundary-only conversion: internal kwargs traffic
! (keyword-only unpacking, ``**kwargs'' rebind) still uses Symbols
! for speed — only ``dict>>_new:kw:'' normalises.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DictKwargsTestCase removeAllMethods.
DictKwargsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DictKwargsTestCase
setUp
	"Reload tests/python/dict_kwargs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dict_kwargs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_kwargs.py')
		name: 'dict_kwargs'.
%

category: 'Grail-Tests - String key lookup'
method: DictKwargsTestCase
testDictFromKwargsAllowsStringKeyLookup
	"``dict(name='World', greeting='Hello')'' then ``d['name']''
	must return 'World'.  Pre-fix the lookup KeyError'd because
	the dict had Symbol keys."

	| result |
	result := testModule @env1:dict_from_kwargs.
	self assert: (result @env1:__getitem__: 0) equals: 'World'.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello'
%

category: 'Grail-Tests - in operator'
method: DictKwargsTestCase
testDictFromKwargsContainmentByStringKey
	"``'x' in dict(x=1)'' is True.  ``in'' uses string equality."

	self assert: (testModule @env1:dict_kwargs_key_type) equals: true
%

category: 'Grail-Tests - keys() iteration'
method: DictKwargsTestCase
testDictFromKwargsKeysAreStrings
	"Iterating ``dict(a=1, b=2).keys()'' yields Python ``str''
	values, sortable by string ordering."

	| result |
	result := testModule @env1:dict_kwargs_iteration.
	self assert: result size equals: 2.
	self assert: (result @env1:__getitem__: 0) equals: 'a'.
	self assert: (result @env1:__getitem__: 1) equals: 'b'
%

category: 'Grail-Tests - get with default'
method: DictKwargsTestCase
testDictFromKwargsGetMissingReturnsDefault
	"``d.get('missing', 'fallback')'' returns the default when the
	string key isn't present.  Confirms the lookup uses string
	equality, not symbol identity."

	self assert: (testModule @env1:dict_kwargs_get_default) equals: 'fallback'
%

category: 'Grail-Tests - merged dict + kwargs'
method: DictKwargsTestCase
testDictMergedPositionalAndKwargsStringKeys
	"``dict({'a': 1}, b=2)'' merges positional dict + kwargs.
	Both keys are accessible via string lookup."

	| result |
	result := testModule @env1:dict_kwargs_merged_with_positional.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2
%
