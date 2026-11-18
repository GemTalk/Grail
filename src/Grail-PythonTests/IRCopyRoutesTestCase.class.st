"
P2.2's run-time consumers: the self-send dispatcher's ``___grailOrig_''
shadow, the ``del C.m'' shadow, UnboundMethod's ``___grailDirect'' copy onto
an unrelated class, and @smalltalk_class.  Each copies an IR-built method
without compiling any Smalltalk text (the run-time ones from a builder the
session has cached; otherwise they keep the twin): it is
generated for the target from its IR builder, under the selector the copy is
installed by (importlib ___irMethodFor___:on:, ___irMethodFor___:on:as:,
___irRegenerate___:onto:category:).

The census rows (importlib ___irCensusCopy___:route:source:of:) say which
route each copy took; tests/python/ir_copies_without_text.py is the CPython
oracle for what the copies must do.
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
IRCopyRoutesTestCase >> ___checksOf___: aModule [
	"name -> { ok. actual repr } for every check in the fixture's run_checks."

	| out |
	out := Dictionary new.
	((aModule @env1:___pyAttrLoad___: #'run_checks') @env1:__call__) do: [:t |
		out at: (t @env1:__getitem__: 0) asString
			put: { (t @env1:__getitem__: 1) == true. (t @env1:__getitem__: 2) @env1:__repr__ asString }].
	^ out

]

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___count___: aKey [
	^ (importlib ___irCensus___ at: #counts) at: aKey asSymbol otherwise: 0

]

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___examples___: aKey [
	"The census's examples for aKey: up to five ``module.Class>>selector''."

	^ ((importlib ___irCensus___ at: #examples) at: aKey asSymbol ifAbsent: [#()]) asArray

]

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___helpersOf___: aBehavior [
	"The selectors of aBehavior's method-local class helpers
	(``___irClassDef_<n>_<C>___'')."

	^ (aBehavior methodDictForEnv: 1) keys select: [:sel |
		(BaseException ___classBodyHelperClassNameFor___: sel) notNil]

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

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___runChecksCounting___: aModule [
	"Run the fixture's checks with the census counting the copies they make;
	assert every check agrees with CPython."

	| checks |
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	checks := [self ___checksOf___: aModule] ensure: [importlib ___irCensusOn: false].
	self assert: checks size equals: 8.
	checks keysAndValuesDo: [:name :r |
		self assert: (r at: 1) description: name , ' answered ' , (r at: 2)].
	^ checks

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
IRCopyRoutesTestCase >> testADefsClassHelperIsReachedByEveryCopy [
	"A def that defines a class sends its class statement's helper
	(``___irClassDef_<n>_<C>___''), a method of the def's own class.  No
	copier copies a helper on its own; each copy has to REACH the def's.  The
	dispatcher's shadow on a SUBCLASS reaches the definer's by inheritance,
	and the del shadow is on the definer itself, so both are generated with
	no text and no helper of their own.  The direct copy onto an UNRELATED
	class cannot reach it, so it keeps the def's text twin, which builds the
	class inline: the one twin a run-time copy here still takes."

	| mod lbase lsub delLocal away shadow |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	lbase := mod @env1:___pyAttrLoad___: #'LBase'.
	lsub := mod @env1:___pyAttrLoad___: #'LSub'.
	delLocal := mod @env1:___pyAttrLoad___: #'DelLocal'.
	away := mod @env1:___pyAttrLoad___: #'Away'.
	self assert: (self ___helpersOf___: lbase) size equals: 1.
	self assert: (self ___helpersOf___: lsub) isEmpty.
	self assert: (self ___helpersOf___: away) isEmpty.
	self assert: (self ___helpersOf___: delLocal) size equals: 1.
	shadow := lsub compiledMethodAt: #'___grailOrig_build' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow inClass == lsub.
	self assert: (BaseException ___isIRPythonMethod___: shadow).
	shadow := delLocal compiledMethodAt: #'___grailOrig_m' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow selector equals: #'___grailOrig_m'.
	self assert: (BaseException ___isIRPythonMethod___: shadow).
	self assert: (self ___count___: 'cp:direct:twin') equals: 1.
	self assert: ((self ___examples___: 'cp:direct:twin') allSatisfy: [:e |
		e includesString: 'five_local'])

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testAShadowOnASubclassIsGeneratedForTheSubclass [
	"Patching ``Sub.label'' puts Base's label on Sub as the dispatcher's
	shadow.  A method SHARED there would answer Base to
	whichClassIncludesSelector: -- its inClass -- and the dispatcher would
	decline the patch; generated for Sub, it is Sub's own."

	| mod sub shadow |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	sub := mod @env1:___pyAttrLoad___: #'Sub'.
	shadow := sub compiledMethodAt: #'___grailOrig_label' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow inClass == sub.
	self assert: shadow selector equals: #'___grailOrig_label'.
	self assert: (BaseException ___isIRPythonMethod___: shadow).
	self assert: (self ___count___: 'cp:dispatch-shadow:regen') > 0.
	self assert: (self ___count___: 'cp:dispatch-shadow:twin') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testEveryRuntimeCopyAvoidsTheTextTwin [
	"The del shadow and the direct copy recompile no text twin: each is
	generated under the selector it is installed by.

	The special receiver still compiles its twin, by design for now: its IR
	route exposed an IR codegen bug (a lambda in a comprehension whose target
	shadows the receiver parameter captures the receiver,
	ClassBodyDefAsPlainFunctionTestCase), so it waits for that fix.  Its text
	fallback must find the twin of a shadow generated under a prefixed
	selector -- ``captured(None)'' after ``del'' is exactly that."

	| mod |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	#('del-shadow' 'dispatch-shadow') do: [:site |
		self assert: (self ___count___: 'cp:' , site , ':twin') equals: 0].
	"Save five_local's, whose class helper Away cannot reach
	(testADefsClassHelperIsReachedByEveryCopy)."
	self assert: (self ___count___: 'cp:direct:twin') equals: 1.
	self assert: (self ___count___: 'cp:del-shadow:regen') > 0.
	self assert: (self ___count___: 'cp:direct:regen') > 0.
	self assert: (self ___count___: 'cp:special:twin') > 0
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

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testTheTextRouteIsTheControl [
	"With regeneration turned off every copy goes back to its text twin, and
	the checks still pass: the two routes agree."

	| mod |
	importlib ___irCopiesRegenerate: false.
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	self assert: (self ___count___: 'cp:dispatch-shadow:regen') equals: 0.
	self assert: (self ___count___: 'cp:special:twin') > 0

]
