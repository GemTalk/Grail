"
P2.2's first consumer: the multiple-inheritance merge copies a secondary
base's IR-built methods onto the class being built by REGENERATING them there
(importlib ___irRegenerate___:onto:category:), where it used to recompile a
Smalltalk text twin from the base's ___irTextSources___ table.

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
	self assert: checks size equals: 14.
	checks keysAndValuesDo: [:name :r |
		self assert: (r at: 1) description: name , ' answered ' , (r at: 2)]

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___built___: aModule [
	^ aModule @env1:___pyAttrLoad___: #'Built'

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
IRMergeRegenerateTestCase >> ___load___: aFile as: aName [
	"A fresh forced-IR import of tests/python/<aFile>."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	^ importlib loadModuleFromPath: importlib grailDir , '/tests/python/' , aFile name: aName

]

{ #category : 'Grail-Private' }
IRMergeRegenerateTestCase >> ___loadBaseThen___: aBlock [
	"Import the base module, let aBlock prepare the cache, then import the
	module that merges from it with the census counting; answer the latter."

	| mod |
	self ___load___: 'ir_mi_merge_base.py' as: 'ir_mi_merge_base'.
	aBlock value.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	mod := [self ___load___: 'ir_mi_merge_regenerates.py' as: 'ir_mi_merge_regenerates']
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
	#(#'ir_mi_merge_regenerates' #'ir_mi_merge_base') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]

]

{ #category : 'Grail-Tests' }
IRMergeRegenerateTestCase >> testAMergeRebuildsABaseWhoseBuildersAreGone [
	"The base's builders dropped between its import and the merge, as for a
	base built in an earlier session: the merge rebuilds them from the base
	module's source and still regenerates rather than recompile text."

	| mod counts |
	mod := self ___loadBaseThen___: [importlib ___irBuilderCacheReset___].
	counts := self ___copyCounts___.
	self assert: (counts at: 'cp:mi:twin' ifAbsent: [0]) equals: 0.
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
	self assert: (counts at: 'cp:mi:twin' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi-class:twin' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) > 0.
	self ___assertChecksPass___: mod

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
	recompiled on either side."

	| mod built merged ir counts |
	mod := self ___loadBaseThen___: [].
	built := self ___built___: mod.
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
	self assert: (counts at: 'cp:mi:twin' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi-class:twin' ifAbsent: [0]) equals: 0.
	self assert: (counts at: 'cp:mi:regen' ifAbsent: [0]) + (counts at: 'cp:mi-class:regen' ifAbsent: [0])
		equals: ir size.
	self ___assertChecksPass___: mod

]
