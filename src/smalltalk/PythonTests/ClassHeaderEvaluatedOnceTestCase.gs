! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassHeaderEvaluatedOnceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassHeaderEvaluatedOnceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassHeaderEvaluatedOnceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassHeaderEvaluatedOnceTestCase
!
! A class header is evaluated once, left to right, before anything uses it.
!
! CPython's order is fixed and observable: the base expressions as written, then
! the keyword expressions as written, then __prepare__, then the body.  Each is
! evaluated EXACTLY once, and PEP 560 asks each non-class base for
! __mro_entries__ exactly once.
!
! GRAIL RE-EMITTED THE SAME EXPRESSIONS AT EVERY CONSUMER, and the emit said so
! in as many words -- ``these are the SAME base expressions, re-emitted for the
! MI merge''.  Four duplicated evaluations, found by emitting and counting:
!
!   * the bases, to ___selectStorageBase___: and again to
!     ___mergeSecondaryBases___: -- ``class R(f(P), f(Q))'' called f four times;
!   * the metaclass, to ___grailPrepareNamespace___: and again to
!     ___grailSetMetaclass___:, the second one AFTER the body;
!   * every other keyword, once but after __prepare__ had already run;
!   * __mro_entries__, resolved separately by three consumers -- the storage
!     base choice, the MRO registration, and the method merge.
!
! Nothing about any of it raises.  A base or keyword expression with a side
! effect -- a registry, a counter, a factory -- simply does it twice, or at the
! wrong moment, and the class that comes out is the right class.  That is why
! every check in the fixture COUNTS or ORDERS the calls: a header evaluated twice
! looks correct from outside.
!
! NOW: ClassDefAst >> printClassHeaderOn: evaluates the header into block temps
! once, before the class is minted, and every consumer reads the temps.  The
! bases are resolved there too, once; the raw list travels beside the resolved
! one because __orig_bases__ records what was written, and importlib's
! ___registerBases___ still decides it by IDENTITY -- the resolver answers the
! same array when no hook fired.  importlib gained resolved: forms of the merge
! and the registration; the raw-bases forms delegate, so type() and the enum
! functional API are unchanged.
!
! A single base is NOT hoisted.  It is emitted exactly once already, inline, and
! hoisting it would change the commonest class statement for nothing.
!
! WHAT IS STILL NOT FIXED, and is pinned: __prepare__ is called as
! ``__prepare__(name, ())'' -- no bases and no keywords -- where CPython passes
! ``(name, bases, **kwds)''.  It is a different defect from this one, and fixing
! it means hoisting the single base too, i.e. changing the codegen of every class
! statement in the corpus.  testThePrepareArgumentGapIsStillThere goes RED on the
! day that is done.
!
! Drives tests/python/class_header_evaluated_once.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassHeaderEvaluatedOnceTestCase removeAllMethods.
ClassHeaderEvaluatedOnceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassHeaderEvaluatedOnceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_header_evaluated_once' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_header_evaluated_once.py')
		name: 'class_header_evaluated_once'.
%

category: 'Grail-Private'
method: ClassHeaderEvaluatedOnceTestCase
___reprOf___: key
	| b r |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	^ (b @env1:repr: (r @env1:__getitem__: key)) asString
%

category: 'Grail-Private'
method: ClassHeaderEvaluatedOnceTestCase
assertMatchesCPythonAt: key
	| b expected |
	b := builtins @env1:instance.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (self ___reprOf___: key)
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the bases'
method: ClassHeaderEvaluatedOnceTestCase
testEveryBaseIsEvaluatedOnce
	"Two and three computed bases, and the single-base control that was
	already right and must stay so."

	self assertMatchesCPythonAt: 'two_bases_evaluated_once'.
	self assertMatchesCPythonAt: 'three_bases_evaluated_once'.
	self assertMatchesCPythonAt: 'one_base_evaluated_once'.
%

category: 'Grail-Tests - the keywords'
method: ClassHeaderEvaluatedOnceTestCase
testEveryKeywordIsEvaluatedOnceAndInOrder
	"The metaclass, ordinary keywords in the order WRITTEN (b before a), a
	``**splat'', and enum's boundary -- each once, and each still reaching the
	consumer it was evaluated for."

	self assertMatchesCPythonAt: 'metaclass_evaluated_once'.
	self assertMatchesCPythonAt: 'keywords_evaluated_once_in_order'.
	self assertMatchesCPythonAt: 'keywords_reach_the_hook'.
	self assertMatchesCPythonAt: 'splat_evaluated_once'.
	self assertMatchesCPythonAt: 'splat_reaches_the_hook'.
	self assertMatchesCPythonAt: 'boundary_evaluated_once'.
	self assertMatchesCPythonAt: 'boundary_took_effect'.
%

category: 'Grail-Tests - the keywords'
method: ClassHeaderEvaluatedOnceTestCase
testTheWholeHeaderPrecedesPrepare
	"The ORDER half of the bug: a class keyword used to be evaluated after
	__prepare__ had already run.  CPython finishes the header first."

	self assertMatchesCPythonAt: 'whole_header_before_prepare'.
%

category: 'Grail-Tests - mro_entries'
method: ClassHeaderEvaluatedOnceTestCase
testMroEntriesIsAskedOnceAndOrigBasesSurvives
	"Resolved once, by the header, rather than once per consumer -- and the
	identity test that decides __orig_bases__ still sees the raw list, so the
	attribute is kept when a hook fired and absent when none did."

	self assertMatchesCPythonAt: 'mro_entries_asked_once'.
	self assertMatchesCPythonAt: 'orig_bases_kept'.
	self assertMatchesCPythonAt: 'bases_resolved'.
	self assertMatchesCPythonAt: 'mro_after_resolution'.
	self assertMatchesCPythonAt: 'no_hook_no_orig_bases'.
%

category: 'Grail-Tests - scope'
method: ClassHeaderEvaluatedOnceTestCase
testAHeaderThatRaisesStopsTheStatement
	"The header is evaluated BEFORE the class is minted, so a base that raises
	leaves nothing half-built behind -- and the bases before it did run."

	self assertMatchesCPythonAt: 'raising_base_stops_the_statement'.
%

category: 'Grail-Tests - scope'
method: ClassHeaderEvaluatedOnceTestCase
testNestedClassHeadersAreSeparate
	"A class statement in another class's body declares header temps of the
	same names in an inner block.  GemStone scopes them, so neither header
	sees or clobbers the other's values -- measured, not assumed."

	self assertMatchesCPythonAt: 'nested_headers_are_separate'.
	self assertMatchesCPythonAt: 'nested_inner_bases'.
	self assertMatchesCPythonAt: 'nested_outer_bases'.
%

category: 'Grail-Tests - Controls'
method: ClassHeaderEvaluatedOnceTestCase
testMultipleInheritanceStillMergesAndChoosesStorage
	"The consumers the header now feeds: a secondary base's methods still
	arrive, and the storage base still decides what an instance IS."

	self assertMatchesCPythonAt: 'secondary_base_method_merged'.
	self assertMatchesCPythonAt: 'storage_base_chosen'.
%

category: 'Grail-Tests - Recorded gaps'
method: ClassHeaderEvaluatedOnceTestCase
testThePrepareArgumentGapIsStillThere
	"The fixture's XFAIL.  __prepare__ is still called with no bases and no
	keywords.  When that is fixed this goes RED -- the signal to retire the
	XFAIL and let the row be asserted like the others."

	self
		assert: (self ___reprOf___: 'prepare_receives_bases_and_keywords')
		equals: '(''Prepared'', [], [])'
%

category: 'Grail-Tests - Controls'
method: ClassHeaderEvaluatedOnceTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '23 checks, 1 xfail, 0 disagreeing [], keys match: True'
%
