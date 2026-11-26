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

P4.2 builds the simple statements -- expressions, assignments, imports, del,
if / for / while -- through IR, as IR helpers beside the text ones, so:

  * tests/python/module_statements_ir.py agrees with CPython 3.14 through IR
    helpers, on the text arm, and with the statements kept on text
    (GRAIL_IR_MODULE_STATEMENTS off): every statement's result, the frame's
    line inside if / for / while bodies and in inspect.stack(), and an uncaught
    error from five kinds of IR statement walked to the importer;
  * IR groups over budget are split on the generated method, with 0 fallbacks;
  * an IR group whose build fails is compiled as text, late, and still agrees
    -- a counted fallback, and a raise in strict mode.

P4.3a builds the def statements through IR -- a top-level def's records and
decorators, and a def in an if or a loop: tests/python/module_defs_ir.py agrees
with CPython 3.14 through IR in strict mode, split over budget, and on the
text arm.
"
Class {
	#name : 'ModuleBodySeamTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'registrySnapshot',
		'savedTotals'
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
ModuleBodySeamTestCase >> ___loadDefsIR: irBoolean [
	"Load the def statements fixture with the seam forced on or off, fresh, as
	___loadFixtureIR: loads the frames one."

	self ___reset___: #('module_defs_ir' 'module_defs_ir_body').
	importlib ___irCodegenForce___: irBoolean.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/module_defs_ir.py'
		name: 'module_defs_ir'

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
ModuleBodySeamTestCase >> ___loadStatementsIR: irBoolean [
	"Load the statements fixture with the seam forced on or off, fresh, as
	___loadFixtureIR: loads the frames one."

	self ___reset___: #('module_statements_ir' 'module_statements_ir_body').
	importlib ___irCodegenForce___: irBoolean.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/module_statements_ir.py'
		name: 'module_statements_ir'

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___offsetOf___: aHelperSelector [
	"The offset a helper is named for, then its statement index when two
	helpers share an offset (``___irModStmt_<offset>_<k>___''), as one number
	that sorts them in source order."

	| s parts |
	s := aHelperSelector asString.
	parts := (s copyFrom: ModuleBodySeam helperPrefix size + 1 to: s size - 3) subStrings: '_'.
	^ (parts first asNumber * 100000) + (parts size > 1 ifTrue: [(parts at: 2) asNumber] ifFalse: [0])

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___reset___: someModuleNames [
	registrySnapshot ifNil: [registrySnapshot := importlib ___canonicalRegistrySnapshot___].
	someModuleNames do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n]

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___sentHelpersOf___: aDispatcher [
	"The helper selectors the seam's ``initialize'' sends, read from its source,
	in source order."

	| src out i |
	src := aDispatcher sourceString.
	out := OrderedCollection new.
	i := 1.
	[i := src indexOfSubCollection: 'self ' , ModuleBodySeam helperPrefix startingAt: i.
	 i > 0] whileTrue: [
		| j |
		j := src indexOf: $. startingAt: i.
		out add: (src copyFrom: i + 5 to: j - 1) asSymbol.
		i := j].
	^ (out asSortedCollection: [:a :b | (self ___offsetOf___: a) <= (self ___offsetOf___: b)]) asArray

]

{ #category : 'Grail-Private' }
ModuleBodySeamTestCase >> ___write: aString to: aPath [
	| f |
	f := GsFile openWriteOnServer: aPath.
	f nextPutAll: aString.
	f close

]

{ #category : 'Grail-Setup' }
ModuleBodySeamTestCase >> setUp [
	"testFailedIRBuildsCompileAsText provokes fallbacks on purpose: keep the
	counts it adds out of the shard's, which run_tests.sh fails a strict run
	on (as IRStrictModeTestCase does)."

	| temps |
	super setUp.
	temps := SessionTemps current.
	savedTotals := {
		temps at: #'___grailIRFallbackTotal___' otherwise: nil.
		temps at: #'___grailIRInvariantTotal___' otherwise: nil }

]

{ #category : 'Grail-Setup' }
ModuleBodySeamTestCase >> tearDown [
	| temps |
	ModuleBodySeam limitsForce: nil.
	ModuleBodySeam failIRBuildsForce: false.
	importlib ___irStrictForce___: nil.
	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	temps := SessionTemps current.
	#(#'___grailIRFallbackTotal___' #'___grailIRInvariantTotal___') doWithIndex: [:k :i |
		(savedTotals at: i)
			ifNil: [temps removeKey: k ifAbsent: []]
			ifNotNil: [:v | temps at: k put: v]].
	self ___reset___: #('module_body_frames_across_helpers' 'module_body_frames_big'
		'seam_reimport_probe' 'module_statements_ir' 'module_statements_ir_body'
		'module_defs_ir' 'module_defs_ir_body').
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	super tearDown

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testDefStatementsAgreeWithCPythonOnTheTextArm [
	"The oracle: one text ``initialize'', no helper, the same answers."

	| mod |
	mod := self ___loadDefsIR: false.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (self ___helpersOf___: (mod @env1:___pyAttrLoad___: #'m') class) isEmpty

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testDefStatementsAgreeWithCPythonThroughIR [
	"P4.3a: every def statement of the defs fixture's body -- plain, annotated,
	defaulted, keyword-only, decorated, async, the PEP 695 scope def, and the
	defs in an if and a for -- is built through IR, in strict mode, so a build
	that fails raises rather than falling back.  Every check reads CPython's
	answer, the census counts every def statement as IR (``msi:'' equal to
	``ms:'', no ``msr:'' row for a def) -- the generic defs' synthesised
	assignments and dels among them -- and the one text helper left holds the
	statement P4.3a does not build, ``class Later''."

	| mod body helpers rows text |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	importlib ___irStrictForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[mod := self ___loadDefsIR: true]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	rows := (importlib ___irCensus___ at: #byModule) at: 'module_defs_ir_body'.
	self assert: (rows at: #'msi:FunctionDef' ifAbsent: [0])
		equals: (rows at: #'ms:FunctionDef') description: rows printString.
	self assert: (rows at: #'msi:AsyncFunctionDef' ifAbsent: [0])
		equals: (rows at: #'ms:AsyncFunctionDef') description: rows printString.
	self assert: (rows keys select: [:k | (k beginsWith: 'msr:nested:') or: [k beginsWith: 'msr:moduleDef']])
		isEmpty description: rows printString.
	body := (mod @env1:___pyAttrLoad___: #'m') class.
	helpers := self ___helpersOf___: body.
	text := helpers reject: [:sel |
		BaseException ___isIRPythonMethod___: (body compiledMethodAt: sel environmentId: 1)].
	self assert: text size equals: 1 description: helpers printString.
	self assert: (rows at: #'msr:typeParams' ifAbsent: [0]) equals: 0 description: rows printString.
	"A top-level def's body is its method's: no IR helper carries it, so none
	answers its lines as positions (#1137).  The plain def's docstring and
	return line are in no helper; the def line is."
	(helpers reject: [:sel | text includes: sel]) do: [:sel |
		| src |
		src := (body compiledMethodAt: sel environmentId: 1) sourceString.
		self deny: (src indexOfSubCollection: 'A docstring.') > 0 description: sel.
		self deny: (src indexOfSubCollection: 'return (a, b, args, c, d is SENTINEL, e, kw)') > 0
			description: sel].
	self assert: ((helpers reject: [:sel | text includes: sel]) anySatisfy: [:sel |
		((body compiledMethodAt: sel environmentId: 1) sourceString
			indexOfSubCollection: 'def plain(a, b=2') > 0]).
	self assert: (self ___sentHelpersOf___: (body compiledMethodAt: #initialize environmentId: 1))
		equals: helpers

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testDefStatementsOverBudgetAreSplit [
	"With a budget of a few dozen step points the groups holding def statements
	are split in half and rebuilt from the AST, a def in an if or a loop -- a
	closure -- among them, and every check still reads CPython's answer: a
	def statement's build registers nothing that a second build would
	duplicate."

	| mod rows |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	importlib ___irStrictForce___: true.
	ModuleBodySeam limitsForce: #(nil 40 nil nil nil).
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[mod := self ___loadDefsIR: true]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	rows := (importlib ___irCensus___ at: #byModule) at: 'module_defs_ir_body'.
	self assert: (rows at: #'mh:split' ifAbsent: [0]) > 0 description: rows printString

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testFailedIRBuildsCompileAsText [
	"Every IR group build raises (ModuleBodySeam failIRBuildsForce:).  Without
	strict mode each group's statements are written as text after the rest and
	compiled as a text helper -- no IR helper is left, each failure is a counted
	fallback, and every check still reads CPython's answer.  In strict mode the
	same failure raises."

	| mod body |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	ModuleBodySeam failIRBuildsForce: true.
	importlib ___irStrictForce___: false.
	mod := self ___loadStatementsIR: true.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) > 0.
	body := (mod @env1:___pyAttrLoad___: #'m') class.
	self assert: ((self ___helpersOf___: body) select: [:sel |
			BaseException ___isIRPythonMethod___: (body compiledMethodAt: sel environmentId: 1)])
		isEmpty.
	importlib ___irStrictForce___: true.
	self should: [self ___loadStatementsIR: true] raise: SystemError

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
	"Fewer than under P4.1: the filler assignments are IR now (P4.2), and an
	IR method carries fewer step points than the text for the same statements."
	self assert: helpers size > 10 description: helpers size printString.
	"A helper still over budget is one statement, which cannot be split, and the
	census counts exactly those."
	over := helpers select: [:sel |
		((ModuleBodySeam budgetOf: (big compiledMethodAt: sel environmentId: 1)) at: 2) > 60].
	self assert: over size <= (rows at: #'mh:overBudget' ifAbsent: [0])
		description: over printString , ' vs ' , rows printString

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testHelpersSharingAnOffsetHaveDistinctSelectors [
	"One statement per helper: the three statements the parser synthesises for
	the fixture's decorated ``class Generic[T]'' share the class's offset, so
	three helpers start there.  Each gets a selector of its own -- the later
	ones ``___irModStmt_<offset>_<k>___'' -- the dispatcher sends each once,
	and the class is built once, its decorator at the decorator's line."

	| mod body helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	ModuleBodySeam limitsForce: #(nil nil nil nil 1).
	mod := self ___loadStatementsIR: true.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	body := (mod @env1:___pyAttrLoad___: #'m') class.
	helpers := self ___helpersOf___: body.
	self assert: (helpers anySatisfy: [:sel | (sel asString occurrencesOf: $_) > 7])
		description: 'no helper shares an offset: ' , helpers printString.
	self assert: (self ___sentHelpersOf___: (body compiledMethodAt: #initialize environmentId: 1))
		equals: helpers

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testIRGroupsOverBudgetAreSplit [
	"With a budget of a few dozen step points the IR groups are over it too and
	are split in half, rebuilt from the AST, on the generated method; every
	check still reads CPython's answer and nothing falls back."

	| mod rows |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	ModuleBodySeam limitsForce: #(nil 40 nil nil nil).
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[mod := self ___loadStatementsIR: true]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	rows := (importlib ___irCensus___ at: #byModule)
		at: 'module_statements_ir_body' ifAbsent: [KeyValueDictionary new].
	self assert: (rows at: #'mh:split' ifAbsent: [0]) > 0 description: rows printString.
	self assert: (rows at: #'mh:irHelper' ifAbsent: [0]) > 5 description: rows printString

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
	"Eight characters move every statement's offset, so every helper is renamed
	(v1's helpers start at 1, 17, 27 and 46; v2's at 9, 25, 35, 54 and 76)."
	v2 := '# moved
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

	"Out of sys.modules only: the module stays registered, so the edited source
	is rebuilt INTO the same class -- the case where an old helper could linger."
	self ___write: v2 to: path.
	(importlib @env1:modules) removeKey: #'seam_reimport_probe' ifAbsent: [].
	mod := importlib loadModuleFromPath: path name: 'seam_reimport_probe'.
	self assert: mod class == cls description: 'the rebuild made a new class'.
	self assert: (mod @env1:___pyAttrLoad___: #'f') equals: 6.
	second := self ___helpersOf___: cls.
	self assert: second size >= 3 description: second printString.
	self assert: (second select: [:sel | first includes: sel]) isEmpty
		description: 'stale helpers survived: ' , (second select: [:sel | first includes: sel]) printString.
	"The class holds exactly the helpers its new ``initialize'' sends."
	init := cls compiledMethodAt: #initialize environmentId: 1.
	self assert: (self ___sentHelpersOf___: init) equals: second.

	"...and once more on the text arm, edited again so it rebuilds: no helper."
	importlib ___irCodegenForce___: false.
	self ___write: v2 , 'g = f + 1
' to: path.
	(importlib @env1:modules) removeKey: #'seam_reimport_probe' ifAbsent: [].
	mod := importlib loadModuleFromPath: path name: 'seam_reimport_probe'.
	self assert: mod class == cls description: 'the text rebuild made a new class'.
	self assert: (mod @env1:___pyAttrLoad___: #'g') equals: 7.
	self assert: (self ___helpersOf___: mod class) isEmpty
		description: (self ___helpersOf___: mod class) printString.
	self deny: (BaseException ___isModuleSeamDispatcher___:
		(mod class compiledMethodAt: #initialize environmentId: 1))

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testSimpleStatementsAgreeWithCPythonOnTheTextArm [
	"The oracle: one text ``initialize'', no helper, the same answers."

	| mod |
	mod := self ___loadStatementsIR: false.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	self assert: (self ___helpersOf___: (mod @env1:___pyAttrLoad___: #'m') class) isEmpty

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testSimpleStatementsAgreeWithCPythonThroughIR [
	"The statements fixture's body alternates IR and text helpers, and every
	check reads CPython's answer.  An IR helper is a ``<module>'' frame named by
	its class's file -- its own source is Python, with no stamp -- and the
	annotate store, which has to run before the first statement and is text,
	has a helper of its own when that statement is IR: ``___irModStmt_0___''.
	No fallback: every group built."

	| mod body helpers ir text file |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[mod := self ___loadStatementsIR: true]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	"...and the call on a statement's second line reads that line, as
	CPython's frame does (the text arm reads the statement's first)."
	self assert: (mod @env1:___pyAttrLoad___: #'MULTILINE_AGREES') == true
		description: ((mod @env1:___pyAttrLoad___: #'MULTILINE') @env1:__repr__) asString.
	self assert: (importlib ___irStats___ at: #fallbacks) equals: 0.
	body := (mod @env1:___pyAttrLoad___: #'m') class.
	helpers := self ___helpersOf___: body.
	ir := helpers select: [:sel |
		BaseException ___isIRPythonMethod___: (body compiledMethodAt: sel environmentId: 1)].
	text := helpers reject: [:sel | ir includes: sel].
	self assert: ir size >= 2 description: helpers printString.
	self assert: text size >= 2 description: helpers printString.
	self assert: helpers first equals: #'___irModStmt_0___'.
	"...and the dispatcher sends each helper once: a decorated generic class's
	synthesised statements share one offset, and their text and IR helpers
	must not share a selector (the class would be built twice)."
	self assert: (self ___sentHelpersOf___: (body compiledMethodAt: #initialize environmentId: 1))
		equals: helpers.
	self assert: (text includes: #'___irModStmt_0___').
	file := importlib grailDir , '/tests/python/module_statements_ir_body.py'.
	ir do: [:sel |
		| meth |
		meth := body compiledMethodAt: sel environmentId: 1.
		self assert: (body categoryOfSelector: sel environmentId: 1) equals: #'Grail-Module Body'.
		self assert: (BaseException ___pythonFrameNameForMethod___: meth) equals: '<module>'.
		self assert: (BaseException ___pythonFilenameForMethod___: meth) isNil.
		self assert: (BaseException ___pythonFileForClassOf___: meth) equals: file].
	"The fixture imports the body six times (once, then once per uncaught
	probe), and each import builds the same IR helpers."
	self assert: (((importlib ___irCensus___ at: #byModule)
			at: 'module_statements_ir_body') at: #'mh:irHelper') equals: 6 * ir size

]

{ #category : 'Grail-Tests' }
ModuleBodySeamTestCase >> testSimpleStatementsAgreeWithCPythonWithTheStatementsOnText [
	"GRAIL_IR_MODULE_STATEMENTS off, the A/B control: P4.1's seam, every helper
	compiled from text, the same answers."

	| mod body |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	importlib ___irModuleStatementsForce___: false.
	mod := self ___loadStatementsIR: true.
	self assert: (self ___disagreementsIn___: mod) equals: '[]'.
	body := (mod @env1:___pyAttrLoad___: #'m') class.
	self assert: (self ___helpersOf___: body) notEmpty.
	self assert: ((self ___helpersOf___: body) select: [:sel |
			BaseException ___isIRPythonMethod___: (body compiledMethodAt: sel environmentId: 1)])
		isEmpty

]
