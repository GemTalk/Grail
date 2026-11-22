"
P2.2's first consumer: the multiple-inheritance merge copies a secondary
base's IR-built methods onto the class being built by REGENERATING them there
(importlib ___irRegenerate___:onto:category:), where it used to recompile a
Smalltalk text twin from the base's ___irTextSources___ table.  Since P2.3b
there is no table: a base whose builders cannot be rebuilt makes the merge
raise a TypeError instead.

The fixture, tests/python/ir_mi_merge_regenerates.py, is its own CPython
oracle; its secondary base Mixin lives in tests/python/ir_mi_merge_base.py, so
a test can import the base, drop its builders, and only then build the class
that merges from it -- what a base deployed by an earlier session looks like.
"
Class {
	#name : 'IRMergeRegenerateTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___assertChecksPass___: aModule [
	| checks |
	checks := Dictionary new.
	((aModule @env1:___pyAttrLoad___: #'run_checks') @env1:__call__) do: [:t |
		checks at: (t @env1:__getitem__: 0) asString
			put: { (t @env1:__getitem__: 1) == true. (t @env1:__getitem__: 2) @env1:__repr__ asString }].
	self assert: checks size equals: 16.
	checks keysAndValuesDo: [:name :r |
		self assert: (r at: 1) description: name , ' answered ' , (r at: 2)]

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___assertCopiedChecksPass___: aModule [
	"The fixture's checks of the copies onto HelperFirst and DefFirst."

	| n |
	n := 0.
	((aModule @env1:___pyAttrLoad___: #'run_copied_checks') @env1:__call__) do: [:t |
		n := n + 1.
		self assert: (t @env1:__getitem__: 1) == true
			description: (t @env1:__getitem__: 0) asString , ' answered '
				, (t @env1:__getitem__: 2) @env1:__repr__ asString].
	self assert: n equals: 6

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___built___: aModule [
	^ aModule @env1:___pyAttrLoad___: #'Built'

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___copyCopiedDefsOnto___: aName of: aModule helpersFirst: aBoolean [
	"Copy Mixin's defs that define a class (the fixture's COPIED) onto
	aModule's class aName through the merge's copier, both sides, and offer
	the copier every class helper Mixin holds as well: BEFORE the defs when
	aBoolean, after them otherwise.  Answer the class.

	The order is forced here because the merge itself meets a def and its
	helper in method-dictionary order, which follows symbol hashes and so
	differs between databases (#2255's CI failure)."

	| mixin target |
	mixin := aModule @env1:___pyAttrLoad___: #'Mixin'.
	target := aModule @env1:___pyAttrLoad___: aName asSymbol.
	{ mixin -> target. mixin class -> target class } do: [:pair |
		| helpers defs |
		helpers := (self ___helpersOf___: pair key) asArray.
		defs := #(#'with_class' #'cm_class' #'sm_class') select: [:sel |
			pair key includesSelector: sel environmentId: 1].
		(aBoolean ifTrue: [helpers , defs] ifFalse: [defs , helpers]) do: [:sel |
			importlib ___copyMethod___: sel from: pair key to: pair value
				category: 'Grail-MI-Inherited']].
	^ target

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___copyCounts___ [
	"The census's cp: rows for the merge so far: route -> count."

	| counts out |
	counts := importlib ___irCensus___ at: #counts.
	out := Dictionary new.
	counts keysAndValuesDo: [:k :v |
		((k asString beginsWith: 'cp:mi') or: [k asString beginsWith: 'cp:rebuild'])
			ifTrue: [out at: k asString put: v]].
	^ out

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___copyInBothOrders___: aModule [
	"HelperFirst gets Mixin's class-defining defs with their helpers offered
	first, DefFirst with them offered last, the census counting."

	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[self ___copyCopiedDefsOnto___: 'HelperFirst' of: aModule helpersFirst: true.
	 self ___copyCopiedDefsOnto___: 'DefFirst' of: aModule helpersFirst: false]
		ensure: [importlib ___irCensusOn: false]

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___helpersOf___: aBehavior [
	"The selectors of aBehavior's method-local class helpers
	(``___irClassDef_<n>_<C>___'')."

	^ (aBehavior methodDictForEnv: 1) keys select: [:sel |
		(BaseException ___classBodyHelperClassNameFor___: sel) notNil]

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___load___: aFile as: aName [
	"A fresh forced-IR import of tests/python/<aFile>."

	^ self ___load___: aFile as: aName ir: true

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___load___: aFile as: aName ir: aBoolean [
	"A fresh import of tests/python/<aFile> (or of aFile, when it is a full
	path), with the IR path forced on or off."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: aBoolean.
	^ importlib loadModuleFromPath: ((aFile beginsWith: '/')
			ifTrue: [aFile]
			ifFalse: [importlib grailDir , '/tests/python/' , aFile])
		name: aName

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___loadBaseThen___: aBlock [
	"Import the base module, let aBlock prepare the cache, then import the
	module that merges from it with the census counting; answer the latter."

	^ self ___loadBaseThen___: aBlock ir: true

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___loadBaseThen___: aBlock ir: aBoolean [
	"___loadBaseThen___:, both modules compiled with the IR path forced on or
	off."

	| mod |
	self ___load___: 'ir_mi_merge_base.py' as: 'ir_mi_merge_base' ir: aBoolean.
	aBlock value.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	mod := [self ___load___: 'ir_mi_merge_regenerates.py' as: 'ir_mi_merge_regenerates' ir: aBoolean]
		ensure: [importlib ___irCensusOn: false].
	^ mod

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___mergedMethodsOf___: aClass [
	"Every method of aClass, both sides, that the merge put there."

	| out |
	out := OrderedCollection new.
	{ aClass. aClass class } do: [:c |
		(c methodDictForEnv: 1) keysAndValuesDo: [:sel :meth |
			(c categoryOfSelector: sel environmentId: 1) = #'Grail-MI-Inherited'
				ifTrue: [out add: meth]]].
	^ out

]

{ #category : 'Grail-Setup' }
IRMergeRegenerateTestCase >> tearDown [
	importlib ___irCensusOn: false.
	importlib ___irCensusReset___.
	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irBuilderCacheLimit: nil.
	#(#'ir_mi_merge_regenerates' #'ir_mi_merge_base' #'ir_mi_merge_astral') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAClassHelperArrivesWithItsDefInEitherOrder [
	"A def that defines a class sends its class statement's HELPER
	(``___irClassDef_<n>_<C>___''), an IR method of its own class with no def
	id.  The copier never copies a helper on its own: regenerating the def
	installs it on the target.  So whether the copier is offered the helpers
	before the defs (HelperFirst) or after (DefFirst), each target ends with
	every helper as its OWN method -- inClass the target, filed as a helper --
	no builder is asked for a helper (no refused rebuild), and the local
	classes are the ones CPython builds."

	| mod mixin helpers counts |
	mod := self ___loadBaseThen___: [].
	mixin := mod @env1:___pyAttrLoad___: #'Mixin'.
	helpers := { mixin -> (self ___helpersOf___: mixin). mixin class -> (self ___helpersOf___: mixin class) }.
	self assert: ((helpers at: 1) value size + (helpers at: 2) value size) equals: 3
		description: 'Mixin should hold three class helpers (with_class, cm_class, sm_class)'.
	self ___copyInBothOrders___: mod.
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:helper' ifAbsent: [0]) + (counts at: 'cp:mi-class:helper' ifAbsent: [0])
		equals: 6.
	self assert: (counts at: 'cp:rebuild:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:refused' ifAbsent: [0]) + (counts at: 'cp:mi-class:refused' ifAbsent: [0])
		equals: 0.
	self assert: (counts at: 'cp:mi:shared' ifAbsent: [0]) + (counts at: 'cp:mi-class:shared' ifAbsent: [0])
		equals: 0.
	#(#'HelperFirst' #'DefFirst') do: [:name |
		| target |
		target := mod @env1:___pyAttrLoad___: name.
		helpers do: [:each |
			| side |
			side := each key isMeta ifTrue: [target class] ifFalse: [target].
			each value do: [:sel |
				| h |
				h := side compiledMethodAt: sel environmentId: 1 otherwise: nil.
				self assert: h notNil description: name , ' lacks ' , sel.
				self assert: h inClass == side
					description: name , '>>' , sel , ' is ' , h inClass name , '''s'.
				self assert: (side categoryOfSelector: sel environmentId: 1)
					equals: #'Grail-IR Class Helpers']]].
	self ___assertCopiedChecksPass___: mod

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testADefCopiedOnTheTextPathNeedsNoClassHelper [
	"The control: on the TEXT path (GRAIL_IR_CODEGEN=0) each def is recompiled
	from its own text, which builds the class inline.  No helper reaches
	either target, and the local classes are still CPython's.  (Until P2.3b
	the control was the IR path with regeneration off, which recompiled each
	IR def's text twin.)"

	| mod |
	mod := self ___loadBaseThen___: [] ir: false.
	self ___copyInBothOrders___: mod.
	self assert: ((self ___copyCounts___) at: 'cp:mi:text' ifAbsent: [0]) > 0.
	self assert: ((self ___copyCounts___) at: 'cp:mi:regen' ifAbsent: [0]) equals: 0.
	#(#'HelperFirst' #'DefFirst') do: [:name |
		| target |
		target := mod @env1:___pyAttrLoad___: name.
		self assert: (self ___helpersOf___: target) isEmpty.
		self assert: (self ___helpersOf___: target class) isEmpty].
	self ___assertCopiedChecksPass___: mod

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAMergeFromABaseWhoseSourceIsGoneRaises [
	"The base loaded from a copy that is then DELETED, its builders dropped:
	the merge cannot regenerate the secondary base's methods, and a method
	SHARED onto the merging class would answer the base to
	whichClassIncludesSelector:.  Until P2.3b the merge recompiled the base's
	text twin; now the class statement raises a TypeError naming the base's
	module and the cause, and nothing is copied by text."

	| path raised counts |
	path := self tmp: 'ir_mi_merge_base.py'.
	(GsFile openWriteOnServer: path)
		nextPutAll: (GsFile openReadOnServer: importlib grailDir , '/tests/python/ir_mi_merge_base.py') contents;
		close.
	self ___load___: path as: 'ir_mi_merge_base' ir: true.
	GsFile removeServerFile: path.
	importlib ___irBuilderCacheReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	raised := nil.
	[[self ___load___: 'ir_mi_merge_regenerates.py' as: 'ir_mi_merge_regenerates' ir: true]
		on: TypeError
		do: [:ex | raised := ex messageText asString. ex return: nil]]
			ensure: [importlib ___irCensusOn: false].
	self assert: raised notNil description: 'the merge did not raise'.
	#('Grail cannot copy' '(module ''ir_mi_merge_base'')' 'is gone' 'secondary base') do: [:s |
		self assert: (raised includesString: s) description: raised].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:refused' ifAbsent: [0]) + (counts at: 'cp:mi-class:refused' ifAbsent: [0]) > 0.
	self assert: (counts at: 'cp:mi:text' ifAbsent: [0]) equals: 0

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAMergeRebuildsABaseWhoseBuildersAreGone [
	"The base's builders dropped between its import and the merge, as for a
	base built in an earlier session: the merge rebuilds them from the base
	module's source and still regenerates rather than recompile text."

	| mod counts |
	mod := self ___loadBaseThen___: [importlib ___irBuilderCacheReset___].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) > 0.
	self assert: (counts at: 'cp:rebuild:ok' ifAbsent: [0]) > 0
		description: 'nothing was rebuilt, so this did not exercise a miss'.
	self assert: (counts at: 'cp:rebuild:refused' ifAbsent: [0]) equals: 0.
	self ___assertChecksPass___: mod

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAMergeWithNoCacheAtAllStillRegenerates [
	"With caching off every builder the merge asks for is rebuilt from source,
	one per method."

	| mod counts |
	mod := self ___loadBaseThen___: [
		importlib ___irBuilderCacheReset___.
		importlib ___irBuilderCacheLimit: 0].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi-class:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) > 0.
	self ___assertChecksPass___: mod

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAnIRClassCarriesNoTextTable [
	"Since P2.3b an IR-built class carries no ___irTextSources___ table (nor
	its chunks), and ___textSourceFor___:in:selector: answers nil for its
	methods: nothing copies an IR method by its text.  The merge still gives
	Merged every method of Mixin, quotes and an astral-plane character
	included -- what the split table was once tested on -- and the merged
	copies are regenerated."

	| mod mixin meth |
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	mod := [self ___load___: 'ir_mi_merge_astral.py' as: 'ir_mi_merge_astral' ir: true]
		ensure: [importlib ___irCensusOn: false].
	mixin := mod @env1:___pyAttrLoad___: #'Mixin'.
	meth := mixin compiledMethodAt: #'astral' environmentId: 1.
	self assert: (BaseException ___isIRPythonMethod___: meth).
	self assert: (importlib ___textSourceFor___: meth in: mixin selector: #'astral') isNil.
	#(#'___irTextSources___' #'___irTextSources_1___:') do: [:sel |
		self assert: (mixin class whichClassIncludesSelector: sel environmentId: 1) isNil
			description: 'Mixin class still answers ' , sel].
	self
		assert: (mod @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '7 checks, 0 disagreeing [], keys match: True'.
	self assert: ((self ___copyCounts___) at: 'cp:mi:regen' ifAbsent: [0]) >= 6

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testCopiesDoNotPushABaseOutOfTheCache [
	"The cache limit counts builders, and a copy is another key of the builder
	it came from, so merging a base onto many classes does not evict the
	base's builders: with room for only a few builders, the base module's
	builders survive more keys than the limit and nothing is rebuilt."

	| mod counts |
	mod := self ___loadBaseThen___: [importlib ___irBuilderCacheLimit: 20].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) > 0.
	self assert: (counts at: 'cp:rebuild:ok' ifAbsent: [0]) equals: 0.
	self assert: importlib ___irBuilderCacheBuilderCount___ <= 20.
	self assert: importlib ___irBuilderCache___ size > 20
		description: 'fewer keys than the limit, so a key-counted cache would not have evicted either'.
	self ___assertChecksPass___: mod

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testMergedMethodsAreRegeneratedForTheClass [
	"Every IR method the merge copied onto Built is an IR method whose class
	is Built -- regenerated, not recompiled from text and not shared -- and
	carries the def id of the base method it came from (Mixin's, in the base
	module, or LocalMixin's, here).  No text twin was
	recompiled on either side.  The class helpers of Mixin's class-defining
	defs are Built's own too, both sides, whichever order the merge met them
	in."

	| mod built merged ir counts helpers |
	mod := self ___loadBaseThen___: [].
	built := self ___built___: mod.
	helpers := 0.
	{ built. built class } do: [:side |
		(self ___helpersOf___: side) do: [:sel |
			helpers := helpers + 1.
			self assert: (side compiledMethodAt: sel environmentId: 1) inClass == side
				description: sel , ' on ' , side name , ' is not its own']].
	self assert: helpers equals: 3.
	merged := self ___mergedMethodsOf___: built.
	ir := merged select: [:m | BaseException ___isIRPythonMethod___: m].
	self assert: ir size >= 10
		description: 'only ' , ir size printString , ' merged IR methods; the merge did not run'.
	ir do: [:m |
		self assert: (m inClass == built or: [m inClass == built class])
			description: m selector , ' is on ' , m inClass name.
		self assert: (#('ir_mi_merge_base' 'ir_mi_merge_regenerates')
				includes: (((importlib ___irDefIdOf___: m) ifNil: ['?']) subStrings: '|') first)
			description: m selector , ' carries no def id from a base'].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi-class:refused' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) + (counts at: 'cp:mi-class:regen' ifAbsent: [0])
		equals: ir size.
	self ___assertChecksPass___: mod

]
