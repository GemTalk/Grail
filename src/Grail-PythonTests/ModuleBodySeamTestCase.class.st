"
P4.1 of the IR-only codegen plan: the module body's STATEMENT SEAM
(ModuleBodySeam).  On the IR arm a module's ``initialize'' is built through IR
and only sends to statement helpers; the helpers hold the statements.  What has
to survive that is everything that reads the module frame, so the tests are
about frames, and about the helpers themselves:

  * tests/python/module_body_frames_across_helpers.py agrees with CPython 3.14
    on both arms: the ``<module>'' frame's name, file and line in the first
    helper and in a later one, the f_back chain and inspect.stack() (one frame
    for the body, not two), globals() identity, a traceback caught at module
    scope, and an uncaught raise from a later helper walked to the importer;
  * the same with limits small enough that groups go over budget and are
    SPLIT on the generated method;
  * a reimport after an edit leaves no stale ``___irModStmt_*___'' selector, and
    a rebuild on the text arm leaves none at all.
"
Class {
	#name : 'ModuleBodySeamTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___disagreementsIn___: aModule [
	^ ((aModule @env1:___pyAttrLoad___: #'DISAGREEMENTS') @env1:__repr__) asString

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___helpersOf___: aClass [
	"The statement helper selectors aClass holds, in source order."

	^ (((aClass selectorsForEnvironment: 1) select: [:sel | ModuleBodySeam isHelperSelector: sel])
		asSortedCollection: [:a :b | (self ___offsetOf___: a) <= (self ___offsetOf___: b)]) asArray

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___loadFixtureIR: irBoolean [
	"Load the frame fixture with the seam forced on or off, fresh: both modules
	out of sys.modules and the canonical registry, so each compiles."

	self ___reset___: #('module_body_frames_across_helpers' 'module_body_frames_big').
	importlib ___irCodegenForce___: irBoolean.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/module_body_frames_across_helpers.py'
		name: 'module_body_frames_across_helpers'

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___offsetOf___: aHelperSelector [
	| s |
	s := aHelperSelector asString.
	^ (s copyFrom: ModuleBodySeam helperPrefix size + 1 to: s size - 3) asNumber

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___reset___: someModuleNames [
	registrySnapshot ifNil: [registrySnapshot := importlib ___canonicalRegistrySnapshot___].
	someModuleNames do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n]

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___write: aString to: aPath [
	| f |
	f := GsFile openWriteOnServer: aPath.
	f nextPutAll: aString.
	f close

]

{ #category : 'Grail-Setup' }
ModuleBodySeamTestCase >> tearDown [
	ModuleBodySeam limitsForce: nil.
	importlib ___irCodegenEnabledInvalidate___.
	self ___reset___: #('module_body_frames_across_helpers' 'module_body_frames_big'
		'seam_reimport_probe').
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	super tearDown

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testFramesAgreeWithCPythonOnTheTextArm [
	"The oracle: one text ``initialize'', no helper, the same answers."

	| mod big |
	mod := self ___loadFixtureIR: false.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	big := (mod @env1:___pyAttrLoad___: #'m') class.
	self assert: (self ___helpersOf___: big) isEmpty.
	self deny: (BaseException ___isModuleSeamDispatcher___:
		(big compiledMethodAt: #initialize environmentId: 1))

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testFramesAgreeWithCPythonThroughTheSeam [
	"The fixture's module is split into helpers -- the first group, the one the
	first had no room for, the class statement's own, the rest -- and every
	frame check still reads CPython's answer.  No fallback: the seam built."

	| mod big helpers init |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	mod := self ___loadFixtureIR: true.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	big := (mod @env1:___pyAttrLoad___: #'m') class.
	helpers := self ___helpersOf___: big.
	self assert: helpers size >= 4
		description: 'the big module was not split: ' , helpers printString.
	init := big compiledMethodAt: #initialize environmentId: 1.
	self assert: (BaseException ___isModuleSeamDispatcher___: init).
	self assert: (BaseException ___isIRPythonMethod___: init).
	self assert: (big categoryOfSelector: #initialize environmentId: 1) equals: #'Grail-Module Body'.
	helpers do: [:sel |
		self assert: (init sourceString includesString: sel asString).
		self assert: (big categoryOfSelector: sel environmentId: 1) equals: #'Grail-Module Body'.
		self assert: (BaseException ___isModuleStatementHelper___:
			(big compiledMethodAt: sel environmentId: 1))].
	"The dispatcher names the file every def of the module reports."
	self assert: (BaseException ___pythonFilenameForMethod___: init)
		equals: importlib grailDir , '/tests/python/module_body_frames_big.py'.
	"...and a helper is neither in dir() nor an attribute."
	self deny: (((mod @env1:___pyAttrLoad___: #'m') @env1:__dir__) asArray
		anySatisfy: [:n | n asString beginsWith: ModuleBodySeam helperPrefix])

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testGroupsOverBudgetAreSplitAndKeepTheirFrames [
	"With a budget of a few dozen step points every packed group is over it and
	is split in half, recursively, on the GENERATED method.  The frames still
	read CPython's answers, so a split group is as much the ``<module>'' frame
	as a packed one."

	| mod big helpers rows over |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	ModuleBodySeam limitsForce: #(nil 60 nil nil nil).
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[mod := self ___loadFixtureIR: true]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	rows := (importlib ___irCensus___ at: #byModule)
		at: 'module_body_frames_big' ifAbsent: [KeyValueDictionary new].
	self assert: (rows at: #'mh:split' ifAbsent: [0]) > 0 description: rows printString.
	big := (mod @env1:___pyAttrLoad___: #'m') class.
	helpers := self ___helpersOf___: big.
	self assert: helpers size > 20 description: helpers size printString.
	"A helper still over budget is one statement, which cannot be split, and the
	census counts exactly those."
	over := helpers select: [:sel |
		((ModuleBodySeam budgetOf: (big compiledMethodAt: sel environmentId: 1)) at: 2) > 60].
	self assert: over size <= (rows at: #'mh:overBudget' ifAbsent: [0])
		description: over printString , ' vs ' , rows printString

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testReimportAfterAnEditLeavesNoStaleHelpers [
	"A helper is named for its first statement's offset, so an edit above it
	renames it.  The rebuild compiles the new names into the same class, and the
	stale sweep (importlib ___removeStaleModuleMethods___:) removes the old ones:
	the class holds exactly the helpers its new ``initialize'' sends.  A rebuild
	on the text arm compiles none, and leaves none."

	| path v1 v2 mod cls first second init |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	path := self tmp: 'seam_reimport_probe.py'.
	v1 := 'a = 1
b = a + 1
c = b + 1
class K:
    x = c
d = K.x + 1
e = d + 1
'.
	v2 := '# moved down by this line
' , v1 , 'f = e + 1
'.
	"Two statements per group, so the module has several helpers."
	ModuleBodySeam limitsForce: #(nil nil nil nil 2).
	self ___write: v1 to: path.
	self ___reset___: #('seam_reimport_probe').
	importlib ___irCodegenForce___: true.
	mod := importlib loadModuleFromPath: path name: 'seam_reimport_probe'.
	cls := mod class.
	first := self ___helpersOf___: cls.
	self assert: first size >= 3 description: first printString.
	self assert: (mod @env1:___pyAttrLoad___: #'e') equals: 5.

	self ___write: v2 to: path.
	self ___reset___: #('seam_reimport_probe').
	mod := importlib loadModuleFromPath: path name: 'seam_reimport_probe'.
	self assert: mod class == cls description: 'the rebuild made a new class'.
	self assert: (mod @env1:___pyAttrLoad___: #'f') equals: 6.
	second := self ___helpersOf___: cls.
	self assert: second size >= 3 description: second printString.
	self assert: (second select: [:sel | first includes: sel]) isEmpty
		description: 'stale helpers survived: ' , (second select: [:sel | first includes: sel]) printString.
	init := cls compiledMethodAt: #initialize environmentId: 1.
	second do: [:sel |
		self assert: (init sourceString includesString: sel asString)].

	importlib ___irCodegenForce___: false.
	self ___reset___: #('seam_reimport_probe').
	mod := importlib loadModuleFromPath: path name: 'seam_reimport_probe'.
	self assert: (mod @env1:___pyAttrLoad___: #'f') equals: 6.
	self assert: (self ___helpersOf___: mod class) isEmpty
		description: (self ___helpersOf___: mod class) printString.
	self deny: (BaseException ___isModuleSeamDispatcher___:
		(mod class compiledMethodAt: #initialize environmentId: 1))

]
