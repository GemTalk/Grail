! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncWithCopyContractsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncWithCopyContractsTestCase comment:
'Two boundary contracts: async-with validates its pair UP FRONT, and the
lazy-call family refuses copy and pickle.

PREFLIGHT.  CPython''s BEFORE_ASYNC_WITH loads both protocol halves before
calling either, naming a missing __aexit__ first -- so a manager with an
__aenter__ but no __aexit__ refuses before __aenter__ runs, let alone the
body (test_with_2).  AsyncWithAst emits PythonCoroutine class >>
___checkAsyncCM___: as the with-block''s first statement (a WithAst hook
the sync form leaves empty -- its gaps surface through the raising object
defaults, lazily but rightly worded).

THE PROBE BUG THIS FLUSHED OUT: ___definesProtocolMethod___:selectors:''s
lists knew ``__aexit__:_:_:'' and ``__aexit__:kw:'', but a vararg ``def
__aexit__(self, *e)'' compiles to the TRIPLE-underscore kwargs forwarder
``___aexit__:kw:'' -- so the first preflight refused half the REAL managers
in test_coroutines (11 tests, caught by the per-test diff before commit).
All four selector lists (enter/exit, sync/async) learned the forwarders.

COPY.  copy.copy, deepcopy and pickle funnel through __reduce_ex__, and
CPython refuses the family by type name -- ``cannot pickle ''coroutine''
object'' -- because a generator IS its suspended state, and no reduction
can be honest about a forked GsProcess (test_copy).  One method on
PythonGenerator plus the wrapper''s twin.

See tests/python/asyncwith_copy_contracts.py (11 checks, CPython-validated
first).'
%

expectvalue /Class
doit
AsyncWithCopyContractsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncWithCopyContractsTestCase removeAllMethods: 0.
AsyncWithCopyContractsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncWithCopyContractsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncwith_copy_contracts' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asyncwith_copy_contracts.py')
		name: 'asyncwith_copy_contracts'.
%

category: 'Grail-Helpers'
method: AsyncWithCopyContractsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncWithCopyContractsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - preflight'
method: AsyncWithCopyContractsTestCase
testThePairIsValidatedBeforeAnythingRuns
	"Missing __aexit__ (sync or async __aenter__ alike) refuses with
	CPython's message and neither __aenter__ nor the body has run; missing
	__aenter__ names its own half."

	self assertAll: #('missing_aexit_refuses_before_anything_runs'
		'missing_aexit_with_async_aenter_same_refusal'
		'missing_aenter_names_its_own_half')
%

category: 'Grail-Tests - preflight'
method: AsyncWithCopyContractsTestCase
testRealManagersOfBothAritiesPass
	"The fixed-arity and vararg __aexit__ compilation shapes -- the second is
	the triple-underscore forwarder the probe lists had to learn."

	self assertAll: #('fixed_arity_manager_still_works'
		'vararg_manager_still_works')
%

category: 'Grail-Tests - copy'
method: AsyncWithCopyContractsTestCase
testTheFamilyRefusesCopyAndPickle
	self assertAll: #('copy_of_a_coroutine_refuses'
		'deepcopy_of_a_coroutine_refuses' 'pickle_of_a_coroutine_refuses'
		'copy_of_a_generator_refuses' 'copy_of_an_async_generator_refuses'
		'copy_of_the_coroutine_wrapper_refuses')
%
