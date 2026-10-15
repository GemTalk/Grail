Class {
	#name : 'EnumCompositeNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumCompositeNameTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumCompositeNameTestCase >> setUp [
	"Reload tests/python/enum_composite_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_composite_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_composite_name.py')
		name: 'enum_composite_name'.

]

{ #category : 'Grail-Tests - Edges of the decomposition' }
EnumCompositeNameTestCase >> testExplicitCompositeKeepsItsClassBodyName [
	"``BOTH = 3'' is a NAMED member, not a pseudo-member: it keeps BOTH, and the
	lookup answers it rather than building a composite."

	self assert: (self resultAt: 'explicit') asString equals: 'BOTH'.
	self assert: (self resultAt: 'explicit_repr') asString equals: '<Named.BOTH: 3>'.
	self assert: (self resultAt: 'explicit_is_lookup').

]

{ #category : 'Grail-Tests - The global repr still decomposes' }
EnumCompositeNameTestCase >> testGlobalEnumPrefixesEveryPiece [
	"The one consumer that cannot read the stored name: each NAMED piece carries
	the module, leftover KEEP bits stay bare, and a composite no named member
	covers still formats as Cls(value)."

	self assert: (self resultAt: 'global_single') asString equals: 'MOD.LOW'.
	self assert: (self resultAt: 'global_composite') asString
		equals: 'MOD.LOW|MOD.HIGH'.
	self assert: (self resultAt: 'global_keep') asString equals: 'MOD.LOW|4'.
	self assert: (self resultAt: 'global_nameless') asString equals: 'MOD.Head(8)'.

]

{ #category : 'Grail-Tests - Edges of the decomposition' }
EnumCompositeNameTestCase >> testKeepCompositeIsNamedTheWayItPrints [
	"Uncovered bits are a piece of the name too, matching the repr."

	self assert: (self resultAt: 'keep') asString equals: 'R|8'.
	self assert: (self resultAt: 'keep_repr') asString equals: '<Keep.R|8: 12>'.

]

{ #category : 'Grail-Tests - A composite carries the joined name' }
EnumCompositeNameTestCase >> testNameAndSunderName [
	"Both spellings, and three members join too."

	self assert: (self resultAt: 'name') asString equals: 'RED|GREEN'.
	self assert: (self resultAt: 'sunder_name') asString equals: 'RED|GREEN'.
	self assert: (self resultAt: 'three') asString equals: 'RED|GREEN|BLUE'.
	self assert: (self resultAt: 'single_name') asString equals: 'RED'.

]

{ #category : 'Grail-Tests - A composite carries the joined name' }
EnumCompositeNameTestCase >> testTheCompositeIsStillCached [
	"Naming happens at construction, and the composite is still the same object
	on the next lookup -- so the name is not recomputed per read."

	self assert: (self resultAt: 'cached').
	self assert: (self resultAt: 'repr') asString equals: '<Color.RED|GREEN: 3>'.
	self assert: (self resultAt: 'str') asString equals: 'Color.RED|GREEN'.

]

{ #category : 'Grail-Tests - A composite carries the joined name' }
EnumCompositeNameTestCase >> testTheNameIsReachableThroughAUserStr [
	"The defect in one line: a flag whose __str__ answers self._name_ printed
	'None' while the built-in repr, which computes the same join separately,
	looked right."

	self assert: (self resultAt: 'user_str_single') asString equals: 'R'.
	self assert: (self resultAt: 'user_str_composite') asString equals: 'R|X'.

]

{ #category : 'Grail-Tests - Edges of the decomposition' }
EnumCompositeNameTestCase >> testZeroStaysNameless [
	"Nothing to decompose, so None -- as CPython's ``<Color: 0>'' implies."

	self assert: (self resultAt: 'zero') @env1:__repr__ asString equals: 'None'.
	self assert: (self resultAt: 'zero_repr') asString equals: '<Color: 0>'.

]
