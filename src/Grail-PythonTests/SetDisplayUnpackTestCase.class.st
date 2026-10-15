Class {
	#name : 'SetDisplayUnpackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SetDisplayUnpackTestCase >> ___disagreementsIn___: aModule [
	| r exp bad |
	r := aModule @env1:___pyAttrLoad___: #r.
	exp := aModule @env1:___pyAttrLoad___: #EXPECTED.
	bad := OrderedCollection new.
	(exp @env1:keys) asArray do: [:k | | got want |
		got := (r @env1:__getitem__: k) asString.
		want := (exp @env1:__getitem__: k) asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	^ bad asArray

]

{ #category : 'Grail-Private' }
SetDisplayUnpackTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/set_display_unpack.py'

]

{ #category : 'Grail-Private' }
SetDisplayUnpackTestCase >> ___irModule___ [
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'sdu_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
SetDisplayUnpackTestCase >> ___textModule___ [
	"The same fixture with the seam forced OFF -- this cut changes BOTH paths,
	so the text arm needs exercising in its own right and not only as the thing
	the IR arm is compared against."

	(importlib @env1:modules) removeKey: #'sdu_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	^ [importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_text']
		ensure: [importlib ___irCodegenForce___: true]

]

{ #category : 'Grail-Setup' }
SetDisplayUnpackTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'sdu_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'sdu_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'sdu_ir'.
	self ___forgetCanonicalModule___: 'sdu_text'.
	irModule := nil

]

{ #category : 'Grail-Tests - set display unpacking' }
SetDisplayUnpackTestCase >> testANonIterableStarRaisesTypeError [
	"``{*5}'' is an ERROR, not a value, and the message is part of the
	contract: set>>update: is forgiving of several things the star is not, so
	an emit that reached it with the wrong argument could quietly succeed."

	| r |
	r := self ___irModule___ @env1:___pyAttrLoad___: #r.
	self assert: ((r @env1:__getitem__: 'star_a_non_iterable') asString)
		equals: ((self ___irModule___ @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: 'star_a_non_iterable') asString

]

{ #category : 'Grail-Tests - set display unpacking' }
SetDisplayUnpackTestCase >> testTheIRArmAgreesWithCPython [
	self assert: (self ___disagreementsIn___: self ___irModule___) isEmpty
		description: 'the IR arm disagrees with CPython: '
			, (self ___disagreementsIn___: self ___irModule___) printString

]

{ #category : 'Grail-Tests - set display unpacking' }
SetDisplayUnpackTestCase >> testTheRefusalRowIsGone [
	"The row this cut closes must not appear in the census of its own fixture.

	Named rows, not a total: a count can stay level while a row MOVES to the
	next refusal one guard down."

	| census counts |
	(importlib @env1:modules) removeKey: #'sdu_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_census']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	counts := census at: #counts.
	(importlib @env1:modules) removeKey: #'sdu_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_census'.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self assert: (counts at: #'shape:SetAst' otherwise: 0) = 0
		description: 'a set display still refuses as shape:SetAst: '
			, counts printString.
	self assert: (counts at: #'cm:shape:SetAst' otherwise: 0) = 0
		description: 'a class method still refuses as cm:shape:SetAst: '
			, counts printString

]

{ #category : 'Grail-Tests - set display unpacking' }
SetDisplayUnpackTestCase >> testTheTextArmAgreesWithCPython [
	"THE TEXT ARM IS NOT A CONTROL HERE, it is half the cut.  Every other row
	in this migration named a shape the text already emitted; this one named a
	shape NEITHER path had, so the text emit is new code and is tested as such."

	self assert: (self ___disagreementsIn___: self ___textModule___) isEmpty
		description: 'the TEXT arm disagrees with CPython: '
			, (self ___disagreementsIn___: self ___textModule___) printString

]
