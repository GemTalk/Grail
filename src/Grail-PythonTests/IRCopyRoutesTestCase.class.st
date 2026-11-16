"
P2.2's @smalltalk_class consumer: the temporary class's IR-built defs are
moved onto the Smalltalk class by regenerating them there
(importlib ___irRegenerate___:onto:category:), where they used to be
recompiled from their ___irTextSources___ text twins.

The census rows (importlib ___irCensusCopy___:route:source:of:) say which
route each copy took.
"
Class {
	#name : 'IRCopyRoutesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___count___: aKey [
	^ (importlib ___irCensus___ at: #counts) at: aKey asSymbol otherwise: 0

]

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___load___: aFile as: aName [
	"A fresh forced-IR import of tests/python/<aFile>."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	^ importlib loadModuleFromPath: importlib grailDir , '/tests/python/' , aFile name: aName

]

{ #category : 'Grail-Setup' }
IRCopyRoutesTestCase >> tearDown [
	importlib ___irCensusOn: false.
	importlib ___irCensusReset___.
	importlib ___irCopiesRegenerate: true.
	importlib ___irCodegenEnabledInvalidate___.
	"What @smalltalk_class put on the Smalltalk class.  A category is a
	Symbol, and a Symbol is never = to a String, so it is compared with a Symbol."
	{GrailSTestTarget. GrailSTestTarget class} do: [:beh |
		| md doomed |
		md := beh methodDictForEnv: 1.
		md isNil ifFalse: [
			doomed := md keys select: [:sel |
				(beh categoryOfSelector: sel environmentId: 1) == #'Grail-ST-Extension'].
			doomed do: [:sel | beh removeSelector: sel environmentId: 1]]].
	#(#'ir_copies_without_text' #'grail_smalltalk_class') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testSmalltalkClassRegeneratesOntoTheSmalltalkClass [
	"@smalltalk_class moves the temporary class's defs onto the Smalltalk
	class by regenerating them, both sides, with no text twin."

	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[self ___load___: 'grail_smalltalk_class.py' as: 'grail_smalltalk_class']
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___count___: 'cp:st-class:regen') > 0.
	self assert: (self ___count___: 'cp:st-class:twin') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testSmalltalkClassTakesALocalClassHelperWithItsDef [
	"A def that defines a class (grail_local_class) is regenerated onto the
	Smalltalk class with its class statement's helper, which is the Smalltalk
	class's own and filed under 'Grail-ST-Extension' with the def, so it goes
	when the extension methods do.  With regeneration off the def is
	recompiled from its twin, which builds the class inline: no helper."

	#(true false) do: [:regen |
		| helpers result |
		self tearDown.
		importlib ___irCopiesRegenerate: regen.
		self ___load___: 'grail_smalltalk_class.py' as: 'grail_smalltalk_class'.
		result := GrailSTestTarget new @env1:grail_local_class.
		self assert: (result @env1:__getitem__: 0) equals: 'local'.
		self assert: (result @env1:__getitem__: 1) asString
			equals: 'GrailSTestTarget.grail_local_class.<locals>.Local'.
		helpers := (GrailSTestTarget methodDictForEnv: 1) keys select: [:sel |
			(BaseException ___classBodyHelperClassNameFor___: sel) notNil].
		regen
			ifTrue: [
				self assert: helpers size equals: 1.
				helpers do: [:sel |
					self assert: (GrailSTestTarget compiledMethodAt: sel environmentId: 1) inClass
						== GrailSTestTarget.
					self assert: (GrailSTestTarget categoryOfSelector: sel environmentId: 1)
						equals: #'Grail-ST-Extension']]
			ifFalse: [self assert: helpers isEmpty]]

]
