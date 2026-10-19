Class {
	#name : 'InitSubclassMroTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InitSubclassMroTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
InitSubclassMroTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass_mro' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass_mro.py')
		name: 'init_subclass_mro'.

]

{ #category : 'Grail-Tests - storing from a hook' }
InitSubclassMroTestCase >> testAnAugmentedStoreStillGoesThroughTheInstancePath [
	"The control for the change above: an instance is unaffected, and a
	@property setter now SEES the augmented store rather than being written
	past -- which is what routing it the same way as a plain assignment
	means."

	self assertMatchesCPythonAt: 'instance_augmented'.
	self assertMatchesCPythonAt: 'property_setter_saw'.

]

{ #category : 'Grail-Tests - storing from a hook' }
InitSubclassMroTestCase >> testAnAugmentedStoreWorksWhereverTheReceiverIsAClass [
	"``cls.attr += v'' in a classmethod and in a hook.  Both used to die with
	an uncatchable ``dynamic instVars not supported in a Class''."

	self assertMatchesCPythonAt: 'classmethod_augmented'.
	self assertMatchesCPythonAt: 'hook_augmented'.

]

{ #category : 'Grail-Tests - Controls' }
InitSubclassMroTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '27 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - the dynamic builder' }
InitSubclassMroTestCase >> testNewClassForwardsItsKeywordsAndPrepareClassDoesNot [
	"The asymmetry test_errors asserts: the same arguments raise through
	new_class, which calls the builder, and do not through prepare_class,
	which never does."

	self assertMatchesCPythonAt: 'new_class_refuses_bad_keyword'.
	self assertMatchesCPythonAt: 'prepare_class_allows_it'.
	self assertMatchesCPythonAt: 'new_class_plain'.
	self assertMatchesCPythonAt: 'new_class_with_body'.
	"A metaclass that OWNS its keywords must not have them forwarded to the
	hook as well.  Forwarding everything made the check happen and turned two
	shapes CPython builds into a spurious TypeError -- a worse trade than the
	missing check, and the reason the forwarding is conditional."
	self assertMatchesCPythonAt: 'new_class_metaclass_eats_keywords'.
	self assertMatchesCPythonAt: 'new_class_metaclass_binds_keyword'.

]

{ #category : 'Grail-Tests - the MRO chain' }
InitSubclassMroTestCase >> testTheAncestorsAreLeftAlone [
	"A hook runs for the class being created and for nothing else: neither
	base's own attribute moves when A is built."

	self assertMatchesCPythonAt: 'diamond_left_untouched'.
	self assertMatchesCPythonAt: 'diamond_right_untouched'.
	self assertMatchesCPythonAt: 'own_hook_not_run_for_itself'.

]

{ #category : 'Grail-Tests - the MRO chain' }
InitSubclassMroTestCase >> testTheDiamondRunsItsHooksInMroOrder [
	"The shape where an MRO differs from a left-to-right base walk.  The
	ORDER row is the one that matters: the entry must be Middle and not Base,
	and Middle's super() must reach Right, which is in a different branch
	entirely."

	self assertMatchesCPythonAt: 'diamond_mro'.
	self assertMatchesCPythonAt: 'diamond_chain_order'.
	self assertMatchesCPythonAt: 'diamond_calls'.

]

{ #category : 'Grail-Tests - Controls' }
InitSubclassMroTestCase >> testTheOrdinarySingleBaseChainIsUnchanged [
	"The whole corpus bar the mixin case.  The MRO walk must leave a plain
	chain exactly as it was, including which hooks run for a class that adds
	none of its own."

	self assertMatchesCPythonAt: 'single_chain_order'.
	self assertMatchesCPythonAt: 'single_chain_one_hook'.

]

{ #category : 'Grail-Tests - the MRO chain' }
InitSubclassMroTestCase >> testTheTwoBaseCaseCrossesToASiblingBranch [
	"Entry at a base's ANCESTOR, continuing into a base that shares no
	ancestor with it -- the hop the Smalltalk-links walk could not make."

	self assertMatchesCPythonAt: 'two_base_chain_order'.
	self assertMatchesCPythonAt: 'secondary_base_hook'.
	"An ASSIGNED hook on a secondary base -- how @deprecated installs one.
	This needs the two searches (which class supplies it, and how) to agree:
	when they disagreed NEITHER hook ran, which was briefly worse than the
	base walk it replaced."
	self assertMatchesCPythonAt: 'assigned_mixin_chain_order'.

]

{ #category : 'Grail-Tests - the dynamic builder' }
InitSubclassMroTestCase >> testTypeForwardsClassKeywordsToTheHook [
	"CPython's 3.6+ ``type(name, bases, ns, **kwds)''.  A keyword the hook
	will not take is refused by the hook, naming the hook's OWNER -- and a
	stray keyword with no hook at all still reaches object's terminator."

	self assertMatchesCPythonAt: 'type_forwards_keywords'.
	self assertMatchesCPythonAt: 'type_keyword_refused_by_hook'.
	self assertMatchesCPythonAt: 'stray_keyword_still_refused'.

]

{ #category : 'Grail-Tests - the dynamic builder' }
InitSubclassMroTestCase >> testTypeRunsBothHalvesOfPep487 [
	"``type(name, bases, ns)'' ran neither, so a dynamically built class got
	nothing the identical class statement gets.  The statement row beside it
	is what the dynamic one has to match."

	self assertMatchesCPythonAt: 'type_runs_init_subclass'.
	self assertMatchesCPythonAt: 'type_runs_set_name'.
	self assertMatchesCPythonAt: 'statement_runs_set_name'.

]
