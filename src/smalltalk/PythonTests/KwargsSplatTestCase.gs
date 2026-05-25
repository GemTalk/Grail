! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KwargsSplatTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KwargsSplatTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
KwargsSplatTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KwargsSplatTestCase
!
! Python's call-site **kwargs splat + callee-side keyword extraction
! must round-trip cleanly.  The pre-fix bug: CallAst built kwargs
! with Symbol keys in an IdentityKeyValueDictionary; the user's
! ``**kwargs'' block-temp received that Symbol-keyed dict; user
! code that did ``kwargs.get('name')'' or ``kwargs['name']'' missed
! because String literal lookup didn't match Symbol keys.  And
! ``f(*args, **kwargs); g(*args, **kwargs)'' forwarded the
! Symbol-keyed dict unchanged — fine for direct internal-Symbol
! lookups, but every Python-level string-key access broke.
!
! Fix: all kwargs are String-keyed Python ``str''s backed by a
! value-comparison KeyValueDictionary.  CallAst's
! printKeywordsDictOn:, FunctionDefAst's positional + kwonly
! extraction, and Smalltalk-side kwarg consumers all use the
! same convention.  Surfaced as the jinja2 for-loop interpolation
! blocker (``{% for x in items %}{{ x }}{% endfor %}'' rendered
! empty items because frame.symbols.loads.items() unpacking via
! ``f(*args, **kwargs)'' silently dropped the per-item store-as-param
! flag).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KwargsSplatTestCase removeAllMethods.
KwargsSplatTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: KwargsSplatTestCase
setUp
	"Reload tests/python/kwargs_splat.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'kwargs_splat' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/kwargs_splat.py')
		name: 'kwargs_splat'.
%

! --- Direct receiver ---

category: 'Grail-Tests - Direct receiver'
method: KwargsSplatTestCase
testDirectReceiverExtractsNamedParam
	"``receiver('n', store_as_param=True, extra='hi')'' — named param
	extracts True; leftover kwargs reach **rest with String key 'extra'."

	| result |
	result := testModule @env1:direct_basic.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 'hi'
%

category: 'Grail-Tests - Direct receiver'
method: KwargsSplatTestCase
testDirectReceiverDefaultsFire
	"``receiver('n')'' — defaults fire when nothing passed."

	| result |
	result := testModule @env1:direct_default.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: 'MISSING'
%

! --- Splat-forwarding ---

category: 'Grail-Tests - Splat forwarding'
method: KwargsSplatTestCase
testSplatForwardsAllArgs
	"``via_splat('n', store_as_param=True, extra='hi')'' forwards
	through ``receiver(node, *args, **kwargs)''.  Pre-fix the named
	param ``store_as_param'' extracted False because the forwarded
	Symbol-keyed kwargs didn't match the String-keyed includesKey:
	probe in the callee's prologue."

	| result |
	result := testModule @env1:splat_basic.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 'hi'
%

category: 'Grail-Tests - Splat forwarding'
method: KwargsSplatTestCase
testSplatPreservesDefaults
	"``via_splat('n')'' — empty splat forwards no kwargs; callee
	uses defaults."

	| result |
	result := testModule @env1:splat_default.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: 'MISSING'
%

! --- User-side kwargs.get / 'name' lookup ---

category: 'Grail-Tests - User kwargs'
method: KwargsSplatTestCase
testUserKwargsGetByStringKey
	"``def collect(**kwargs): return kwargs.get('a', 'A?')'' —
	the user-visible kwargs must be looked up by Python ``str''
	(string literal in the source)."

	| result |
	result := testModule @env1:collect_present.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2
%

category: 'Grail-Tests - User kwargs'
method: KwargsSplatTestCase
testUserKwargsGetFallsBackToDefault
	"``kwargs.get('b', 'B?')'' returns 'B?' when 'b' missing."

	| result |
	result := testModule @env1:collect_missing.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 'B?'
%

! --- Keyword-only via splat ---

category: 'Grail-Tests - Kwonly via splat'
method: KwargsSplatTestCase
testKwonlySplatForwarding
	"``with_kwonly_splat('n', must_pass=42, also='custom')'' forwards
	to a callee whose ``must_pass'' is keyword-ONLY.  Kwargs must
	reach the kwonly extraction site after splat-forwarding."

	| result |
	result := testModule @env1:kwonly_via_splat.
	self assert: (result @env1:__getitem__: 0) equals: 42.
	self assert: (result @env1:__getitem__: 1) equals: 'custom'
%

! --- kwargs.keys() yields strings ---

category: 'Grail-Tests - Key types'
method: KwargsSplatTestCase
testKwargsKeysAreStrings
	"Iterating ``kwargs.keys()'' yields Python ``str''s — sortable
	by string ordering, matching CPython semantics."

	| result |
	result := testModule @env1:keys_check.
	self assert: result @env0:size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 'alpha'.
	self assert: (result @env1:__getitem__: 1) equals: 'mid'.
	self assert: (result @env1:__getitem__: 2) equals: 'zeta'
%
