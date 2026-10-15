Class {
	#name : 'ClassHeaderEvaluatedOnceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassHeaderEvaluatedOnceTestCase >> ___reprOf___: key [
	| b r |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	^ (b @env1:repr: (r @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Private' }
ClassHeaderEvaluatedOnceTestCase >> assertMatchesCPythonAt: key [
	| b expected |
	b := builtins @env1:instance.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (self ___reprOf___: key)
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ClassHeaderEvaluatedOnceTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_header_evaluated_once' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_header_evaluated_once.py')
		name: 'class_header_evaluated_once'.

]

{ #category : 'Grail-Tests - scope' }
ClassHeaderEvaluatedOnceTestCase >> testAHeaderThatRaisesStopsTheStatement [
	"The header is evaluated BEFORE the class is minted, so a base that raises
	leaves nothing half-built behind -- and the bases before it did run."

	self assertMatchesCPythonAt: 'raising_base_stops_the_statement'.

]

{ #category : 'Grail-Tests - the bases' }
ClassHeaderEvaluatedOnceTestCase >> testEveryBaseIsEvaluatedOnce [
	"Two and three computed bases, and a single one -- hoisted now as well, and
	still evaluated once."

	self assertMatchesCPythonAt: 'two_bases_evaluated_once'.
	self assertMatchesCPythonAt: 'three_bases_evaluated_once'.
	self assertMatchesCPythonAt: 'one_base_evaluated_once'.

]

{ #category : 'Grail-Tests - Controls' }
ClassHeaderEvaluatedOnceTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '31 checks, 0 xfail, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - the keywords' }
ClassHeaderEvaluatedOnceTestCase >> testEveryKeywordIsEvaluatedOnceAndInOrder [
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

]

{ #category : 'Grail-Tests - mro_entries' }
ClassHeaderEvaluatedOnceTestCase >> testMroEntriesIsAskedOnceAndOrigBasesSurvives [
	"Resolved once, by the header, rather than once per consumer -- and the
	identity test that decides __orig_bases__ still sees the raw list, so the
	attribute is kept when a hook fired and absent when none did."

	self assertMatchesCPythonAt: 'mro_entries_asked_once'.
	self assertMatchesCPythonAt: 'orig_bases_kept'.
	self assertMatchesCPythonAt: 'bases_resolved'.
	self assertMatchesCPythonAt: 'mro_after_resolution'.
	self assertMatchesCPythonAt: 'no_hook_no_orig_bases'.

]

{ #category : 'Grail-Tests - mro_entries' }
ClassHeaderEvaluatedOnceTestCase >> testMroEntriesRunsAfterTheKeywords [
	"CPython evaluates the whole header, keywords included, before
	__build_class__ asks any __mro_entries__.  The sole-base row also catches the
	older order defect: an inline sole base ran AFTER the hoisted keywords."

	self assertMatchesCPythonAt: 'mro_entries_after_keywords_sole'.
	self assertMatchesCPythonAt: 'mro_entries_after_keywords_many'.

]

{ #category : 'Grail-Tests - Controls' }
ClassHeaderEvaluatedOnceTestCase >> testMultipleInheritanceStillMergesAndChoosesStorage [
	"The consumers the header now feeds: a secondary base's methods still
	arrive, and the storage base still decides what an instance IS."

	self assertMatchesCPythonAt: 'secondary_base_method_merged'.
	self assertMatchesCPythonAt: 'storage_base_chosen'.

]

{ #category : 'Grail-Tests - scope' }
ClassHeaderEvaluatedOnceTestCase >> testNestedClassHeadersAreSeparate [
	"A class statement in another class's body declares header temps of the
	same names in an inner block.  GemStone scopes them, so neither header
	sees or clobbers the other's values -- measured, not assumed."

	self assertMatchesCPythonAt: 'nested_headers_are_separate'.
	self assertMatchesCPythonAt: 'nested_inner_bases'.
	self assertMatchesCPythonAt: 'nested_outer_bases'.

]

{ #category : 'Grail-Tests - prepare' }
ClassHeaderEvaluatedOnceTestCase >> testPrepareIsHandedResolvedBasesWithoutAskingTwice [
	"The bases AFTER __mro_entries__ -- for a sole base, whose substitution
	happens in ___subclass___, as well as for several -- and the hook asked once
	in both, which is what reading the stashed entries back is for."

	self assertMatchesCPythonAt: 'prepare_receives_resolved_sole_base'.
	self assertMatchesCPythonAt: 'prepare_receives_resolved_bases'.

]

{ #category : 'Grail-Tests - prepare' }
ClassHeaderEvaluatedOnceTestCase >> testPrepareIsHandedTheBasesAndKeywords [
	"One base, several, none (an EMPTY tuple, not (object,)), and a metaclass
	that is inherited rather than written -- each with the keywords other than
	``metaclass'', and the bases as a real tuple."

	self assertMatchesCPythonAt: 'prepare_receives_bases_and_keywords'.
	self assertMatchesCPythonAt: 'prepare_bases_is_a_tuple'.
	self assertMatchesCPythonAt: 'prepare_receives_several_bases'.
	self assertMatchesCPythonAt: 'prepare_receives_no_bases'.
	self assertMatchesCPythonAt: 'prepare_inherited_metaclass'.

]

{ #category : 'Grail-Tests - the keywords' }
ClassHeaderEvaluatedOnceTestCase >> testTheWholeHeaderPrecedesPrepare [
	"The ORDER half of the bug: a class keyword used to be evaluated after
	__prepare__ had already run.  CPython finishes the header first."

	self assertMatchesCPythonAt: 'whole_header_before_prepare'.

]
