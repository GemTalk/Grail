Class {
	#name : 'ModuleSpecTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleSpecTestCase >> assertMatchesAt: key in: tableName [
	"Compare the fixture's recorded result against its expectation table, both
	through repr so a True and a 'True' cannot pass for each other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: tableName) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Private' }
ModuleSpecTestCase >> assertMatchesCPythonAt: key [
	^ self assertMatchesAt: key in: #EXPECTED

]

{ #category : 'Grail-Setup' }
ModuleSpecTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_spec' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_spec.py')
		name: 'module_spec'.

]

{ #category : 'Grail-Tests' }
ModuleSpecTestCase >> testALazilyResolvedSmalltalkBuiltinCarriesASpec [
	"THE SECOND WAY INTO sys.modules, and the one that used to skip every stamp.

	A pure-Smalltalk builtin (grail, os.path, _weakref, socket, ...) comes from
	no loader: on a sys.modules miss, importlib class >> lookupModule: finds the
	class on the symbol list and mints its singleton.  That store was a bare
	``at:put:'', which reaches neither ___stampBuiltinsOn___: nor
	___stampBuiltinSpecOn___: -- they are called only from registerModule:with:
	and from the one-time sweep.  And the sweep fires at the FIRST registration
	of the session, so a module minted here afterwards was never stamped and
	nothing ever came back for it.

	Measured before the fix, in a session that had already imported one .py
	module: of 49 modules in sys.modules, grail, os.path and _weakref each
	carried ``__spec__'' None and no ``__builtins__''.  After it, 56 of 56 are
	covered -- the sole remaining blank being builtins' own ``__builtins__'',
	which CPython omits too.  The count is not a fixed 1: it is however many
	Smalltalk builtins a given session happens to resolve lazily.

	THE ORDERING IS THE TEST.  setUp has already loaded module_spec.py through
	the loader path, so the sweep has certainly run before the eviction below --
	which is exactly the sequence that used to leave the module bare.  Evicting
	and re-resolving inside the test is what makes this a regression test rather
	than a restatement of whatever the session happened to do first."

	| mods inst |
	mods := importlib @env1:modules.
	mods removeKey: #'_weakref' ifAbsent: [].
	inst := importlib @env1:lookupModule: '_weakref'.
	self deny: inst isNil
		description: '_weakref should resolve from the symbol list'.
	self deny: (inst dynamicInstVarAt: #'__spec__') isNil
		description: 'a lazily-resolved Smalltalk builtin must carry a __spec__'.
	self deny: (inst dynamicInstVarAt: #'__builtins__') isNil
		description: 'a lazily-resolved Smalltalk builtin must carry __builtins__'.

]

{ #category : 'Grail-Tests' }
ModuleSpecTestCase >> testAModuleCarriesARealSpec [
	"``mod.__spec__'' was None on every module before this."

	self assertMatchesCPythonAt: 'spec_is_not_none'.
	self assertMatchesCPythonAt: 'spec_type_name'.
	self assertMatchesCPythonAt: 'spec_name'.

]

{ #category : 'Grail-Tests' }
ModuleSpecTestCase >> testCachedIsAlwaysNone [
	"A DELIBERATE divergence, asserted so it stays deliberate.  CPython computes
	a __pycache__ path for any source module without checking it exists; Grail
	writes no bytecode.  Load-bearing, not cosmetic: _init_module_attrs sets
	``__cached__'' only when spec.cached is not None, so this None is what keeps
	module.__cached__ absent -- see ModuleCachedAbsentTestCase."

	self assertMatchesAt: 'cached_is_none' in: #GRAIL_ONLY.

]

{ #category : 'Grail-Tests' }
ModuleSpecTestCase >> testEveryMirrorAgreesWithTheSpecItCameFrom [
	"The invariant the whole change exists for.  CPython derives each of these
	in _init_module_attrs and warns when one drifts from the spec; a spec that
	merely sat alongside independently-written attributes would pass the
	presence test above and still be able to disagree here."

	self assertMatchesCPythonAt: 'file_is_spec_origin'.
	self assertMatchesCPythonAt: 'package_is_spec_parent'.
	self assertMatchesCPythonAt: 'loader_is_spec_loader'.

]

{ #category : 'Grail-Tests' }
ModuleSpecTestCase >> testLocationAndParentAreComputedFromTheSpecsOwnFields [
	"has_location decides whether __file__ is set at all -- it is what gives a
	namespace package __file__ None rather than a fabricated path -- and parent
	is what __package__ is set from."

	self assertMatchesCPythonAt: 'has_location'.
	self assertMatchesCPythonAt: 'parent_of_top_level_is_empty'.
	self assertMatchesCPythonAt: 'submodule_parent'.

]
