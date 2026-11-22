"
P2.2's run-time consumers: the self-send dispatcher's ``___grailOrig_''
shadow, the ``del C.m'' shadow, UnboundMethod's special-receiver form and its
``___grailDirect'' copy onto an unrelated class, and @smalltalk_class.  Each
copies an IR-built method without compiling any Smalltalk text (the shadows
and the direct copy from a builder the session has cached, else one rebuilt
from the def's Python source): it is generated for the target from its IR
builder, under the selector the copy is installed by (importlib
___irMethodFor___:on:as:, ___irRegenerate___:onto:category:).  A def that
defines a class takes its class statement along: a copy onto a class that
cannot reach the def's helper performs one generated for that class
(PyMethodIRBuilder >> ___irWithHelpersReachableFrom___:do:).

There is no text twin to fall back on since P2.3b.  A copy with no builder
to be had -- the def's module changed on disk or is gone -- shares the method
on its own class and raises a TypeError anywhere else
(testACopyWithNoBuilderSharesOnItsOwnClassAndRefusesElsewhere).

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

	^ self ___load___: aFile as: aName ir: true

]

{ #category : 'Grail-Private' }
IRCopyRoutesTestCase >> ___load___: aFile as: aName ir: aBoolean [
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
IRCopyRoutesTestCase >> ___runChecksCounting___: aModule [
	"Run the fixture's checks with the census counting the copies they make;
	assert every check agrees with CPython."

	| checks |
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	checks := [self ___checksOf___: aModule] ensure: [importlib ___irCensusOn: false].
	self assert: checks size equals: 16.
	checks keysAndValuesDo: [:name :r |
		self assert: (r at: 1) description: name , ' answered ' , (r at: 2)].
	^ checks

]

{ #category : 'Grail-Setup' }
IRCopyRoutesTestCase >> tearDown [
	importlib ___irCensusOn: false.
	importlib ___irCensusReset___.
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
	#(#'ir_copies_without_text' #'grail_smalltalk_class' #'ir_copies_no_builder' #'ir_copies_no_share') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testACopyWithNoBuilderSharesOnItsOwnClassAndRefusesElsewhere [
	"The fixture loaded from a copy that is then DELETED, with the session's
	builders dropped: no copy can rebuild a builder, as for a module whose
	source is gone or changed since it was built.  Until P2.3b each copy then
	recompiled the method's Smalltalk text twin; there is none now.

	  * The del shadow is on the method's own class, so it SHARES it, and the
	    captured method still runs.
	  * A special receiver cannot run a shared method, and the direct copy
	    onto Away would be Home's: both raise a TypeError that names the
	    module and says why.
	  * The dispatcher's shadow on Sub is Base's own method, shared, as it is
	    with a builder: it needs none, so the patch still reaches Sub's
	    self-sends."

	| path mod checks counts |
	path := self tmp: 'ir_copies_no_builder.py'.
	(GsFile openWriteOnServer: path)
		nextPutAll: (GsFile openReadOnServer: importlib grailDir , '/tests/python/ir_copies_without_text.py') contents;
		close.
	mod := self ___load___: path as: 'ir_copies_no_builder' ir: true.
	GsFile removeServerFile: path.
	importlib ___irBuilderCacheReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	checks := [self ___checksOf___: mod] ensure: [importlib ___irCensusOn: false].
	self assert: ((checks at: 'del_keeps_a_captured_method') at: 1)
		description: 'del_keeps_a_captured_method answered ' , ((checks at: 'del_keeps_a_captured_method') at: 2).
	#('special_receiver' 'five_on_another_class') do: [:name |
		| answer |
		answer := (checks at: name) at: 2.
		self assert: (answer includesString: 'TypeError: Grail cannot copy')
			description: name , ' answered ' , answer.
		self assert: (answer includesString: '(module ''ir_copies_no_builder'')')
			description: name , ' answered ' , answer.
		self assert: (answer includesString: 'is gone')
			description: name , ' answered ' , answer].
	self assert: ((checks at: 'dispatch_on_a_subclass') at: 1)
		description: 'dispatch_on_a_subclass answered ' , ((checks at: 'dispatch_on_a_subclass') at: 2).
	counts := importlib ___irCensus___ at: #counts.
	self assert: (counts at: #'cp:del-shadow:shared' otherwise: 0) > 0.
	self assert: (counts at: #'cp:dispatch-shadow:shared' otherwise: 0) > 0.
	self assert: (counts at: #'cp:dispatch-shadow:refused' otherwise: 0) equals: 0.
	#(#'cp:special:refused' #'cp:direct:refused') do: [:k |
		self assert: (counts at: k otherwise: 0) > 0 description: k , ' did not count'].
	self assert: (counts at: #'cp:del-shadow:regen' otherwise: 0) equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testADefsClassHelperIsReachedByEveryCopy [
	"A def that defines a class sends its class statement's helper
	(``___irClassDef_<n>_<C>___''), a method of the def's own class.  No
	copier copies a helper on its own; each copy has to REACH the def's.  The
	dispatcher's shadow on a SUBCLASS is the definer's method itself, which
	reaches the definer's helper by inheritance,
	and the del shadow is on the definer itself, so both are generated with
	no text and no helper of their own.  The direct copy onto an UNRELATED
	class cannot reach it, nor can a special receiver's class (SmallInteger,
	SmallDouble): those copies PERFORM the helper generated for their own
	class, installed nowhere (P2.3a), where they used to keep the def's text
	twin, which built the class inline.  So does a __new__'s, whose helper is
	filed on the metaclass too (P2.3b): with an int, or an Away, for its
	receiver, the receiver's class is what the helper is generated for.  So
	every run-time copy here is generated, none is refused, and neither Away
	nor SmallInteger gains a helper."

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
	self assert: (self ___helpersOf___: SmallInteger) isEmpty.
	self assert: (self ___helpersOf___: SmallDouble) isEmpty.
	self assert: (self ___helpersOf___: delLocal) size equals: 1.
	shadow := lsub compiledMethodAt: #'___grailOrig_build' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow inClass == lbase.
	self assert: (BaseException ___isIRPythonMethod___: shadow).
	shadow := delLocal compiledMethodAt: #'___grailOrig_m' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow selector equals: #'___grailOrig_m'.
	self assert: (BaseException ___isIRPythonMethod___: shadow).
	self assert: (self ___count___: 'cp:direct:refused') equals: 0.
	self assert: (self ___count___: 'cp:special:refused') equals: 0.
	"five_local and five_captures on Away; kind_local on SmallInteger, and
	kind_captures on SmallInteger and SmallDouble."
	self assert: (self ___count___: 'cp:helper:performed') >= 5.
	#('Away>>___irClassDef_' 'SmallInteger>>___irClassDef_' 'SmallDouble>>___irClassDef_')
		do: [:what |
			self assert: ((self ___examples___: 'cp:helper:performed') anySatisfy: [:e |
				e includesString: what])].
	"NewHome.__new__ on SmallInteger and SmallDouble, NewFive.__new__ on Away."
	self assert: (self ___count___: 'cp:helper:class-performed') >= 3.
	#('Away>>___irClassDef_' 'SmallInteger>>___irClassDef_' 'SmallDouble>>___irClassDef_')
		do: [:what |
			self assert: ((self ___examples___: 'cp:helper:class-performed') anySatisfy: [:e |
				e includesString: what])]

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testAShadowOnASubclassIsTheDefinersMethod [
	"Patching ``Sub.label'' needs a shadow of Base's label on Sub.  It is
	Base's method itself, shared under the shadow key (P2.3b): the
	dispatcher's own-shadow check looks in Sub's own dictionary, not at
	whichClassIncludesSelector: (which answers the method's inClass, Base),
	so the dispatcher installs and the patch reaches Sub's self-sends."

	| mod sub base shadow |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	sub := mod @env1:___pyAttrLoad___: #'Sub'.
	base := mod @env1:___pyAttrLoad___: #'Base'.
	shadow := sub compiledMethodAt: #'___grailOrig_label' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow inClass == base.
	self assert: shadow selector equals: #'label'.
	self assert: (sub includesSelector: #'___grailOrig_label' environmentId: 1).
	self deny: (base includesSelector: #'___grailOrig_label' environmentId: 1).
	self assert: (self ___count___: 'cp:dispatch-shadow:shared') > 0.
	self assert: (self ___count___: 'cp:dispatch-shadow:regen') equals: 0.
	self assert: (self ___count___: 'cp:dispatch-shadow:refused') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testAShadowOnItsDefinerWithNoBuilderIsSharedNotRebuilt [
	"With no builder cached -- a warm session reinstalling the dispatchers of
	committed overrides, most of them on the class that defines the method --
	the dispatcher's shadow on the DEFINER shares the method instead of
	rebuilding the class from source (P2.3b): a rebuild costs 0.3-0.6 s a
	class, at every session start.  The shared shadow is the definer's own,
	so the dispatcher installs and the patch reaches the self-send."

	| mod patched shadow answer |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	patched := mod @env1:___pyAttrLoad___: #'Patched'.
	importlib ___irBuilderCacheReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	answer := [((mod @env1:___pyAttrLoad___: #'patch_on_the_definer') @env1:__call__) @env1:__repr__ asString]
		ensure: [importlib ___irCensusOn: false].
	self assert: answer equals: '(''Patched'', ''patched'', ''patched'')'.
	shadow := patched compiledMethodAt: #'___grailOrig_label' environmentId: 1 otherwise: nil.
	self assert: shadow notNil.
	self assert: shadow inClass == patched.
	self assert: shadow selector equals: #'label'.
	self assert: (self ___count___: 'cp:dispatch-shadow:shared') > 0.
	self assert: (self ___count___: 'cp:dispatch-shadow:regen') equals: 0.
	self assert: (self ___count___: 'cp:rebuild:ok') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testAShadowThatCannotShareWarns [
	"The one shape left that can neither share nor generate: a method held
	in the dictionary of a class that does NOT inherit its class -- here
	Home's name_of put into Away's dictionary, as a stale shared copy would
	be -- with no builder to be had (the module's source deleted).  The
	store keeps its value, but with no shadow there is no dispatcher, and
	that is VISIBLE: a cp:dispatch-shadow:refused row and a RuntimeWarning
	naming the method, its module and the cause, where a TypeError would be
	swallowed by the store's handler."

	| path mod home away messages |
	path := self tmp: 'ir_copies_no_share.py'.
	(GsFile openWriteOnServer: path)
		nextPutAll: (GsFile openReadOnServer: importlib grailDir , '/tests/python/ir_copies_without_text.py') contents;
		close.
	mod := self ___load___: path as: 'ir_copies_no_share' ir: true.
	GsFile removeServerFile: path.
	home := mod @env1:___pyAttrLoad___: #'Home'.
	away := mod @env1:___pyAttrLoad___: #'Away'.
	importlib ___installMethod___: (home compiledMethodAt: #'name_of' environmentId: 1)
		in: away as: #'name_of' category: 'Grail-Class Methods'.
	importlib ___irBuilderCacheReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	messages := [((mod @env1:___pyAttrLoad___: #'patch_and_record') @env1:value: { away. 'name_of' } value: nil)
			asArray collect: [:m | m asString]]
		ensure: [importlib ___irCensusOn: false].
	self assert: (self ___count___: 'cp:dispatch-shadow:refused') > 0.
	self assert: (messages anySatisfy: [:m |
			(m includesString: 'Grail cannot copy Home.name_of')
				and: [(m includesString: '(module ''ir_copies_no_share'')')
				and: [m includesString: 'not by its own methods']]])
		description: messages printString.
	self deny: (away includesSelector: #'___grailOrig_name_of' environmentId: 1)

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testASubclassShadowKeepsSuperAndSlotsWithNoRebuild [
	"SLeaf patches greet (SBase's, which reads a slot) and shout (SMid's,
	which calls super()).  With no builder cached -- a warm session -- each
	shadow on SLeaf is the definer's method, shared, and nothing is rebuilt.
	describe(), SBase's, self-sends both and reaches the patches; the
	originals, reached through SBase.greet / SMid.shout and from the patch
	itself, still read SLeaf's slots and walk super() from their DEFINING
	class, as CPython's do (fixture check
	subclass_shadow_with_super_and_slots)."

	| mod leaf answer |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	leaf := mod @env1:___pyAttrLoad___: #'SLeaf'.
	importlib ___irBuilderCacheReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	answer := [((mod @env1:___pyAttrLoad___: #'_subclass_shadow_with_super_and_slots') @env1:__call__)
			@env1:__repr__ asString]
		ensure: [importlib ___irCensusOn: false].
	self assert: answer
		equals: '(''base:1|MB'', ''patched:1:2|MB'', ''patched:1:2|PMB'', ''base:1'', ''MB'', ''base:3|MB'')'.
	self assert: (leaf compiledMethodAt: #'___grailOrig_greet' environmentId: 1) inClass
		== (mod @env1:___pyAttrLoad___: #'SBase').
	self assert: (leaf compiledMethodAt: #'___grailOrig_shout' environmentId: 1) inClass
		== (mod @env1:___pyAttrLoad___: #'SMid').
	self assert: (self ___count___: 'cp:dispatch-shadow:shared') >= 2.
	self assert: (self ___count___: 'cp:dispatch-shadow:refused') equals: 0.
	self assert: (self ___count___: 'cp:rebuild:ok') equals: 0.
	self assert: (self ___count___: 'cp:rebuild:refused') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testEveryRuntimeCopyAvoidsTheTextTwin [
	"The del shadow, the special receiver and the direct copy recompile no
	text twin: each is generated under the selector it is installed by (the
	special receiver's is installed nowhere, and keeps the method's own).
	The special receiver's cases are an int, a float, True and False, and
	#2256's lambda in a comprehension whose target shadows the receiver
	parameter.  (None, checked beside them, does not need this form.)  A def
	that defines a class is no exception since P2.3a: the copy performs its
	class statement's helper generated for the copy's class
	(testADefsClassHelperIsReachedByEveryCopy)."

	| mod |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text'.
	self ___runChecksCounting___: mod.
	#('del-shadow' 'direct' 'special') do: [:site |
		self assert: (self ___count___: 'cp:' , site , ':shared') equals: 0.
		self assert: (self ___count___: 'cp:' , site , ':refused') equals: 0].
	self assert: (self ___count___: 'cp:dispatch-shadow:refused') equals: 0.
	self assert: (self ___count___: 'cp:del-shadow:regen') > 0.
	self assert: (self ___count___: 'cp:direct:regen') > 0.
	self assert: (self ___count___: 'cp:special:regen') > 0

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
	self assert: (self ___count___: 'cp:st-class:refused') equals: 0

]

{ #category : 'Grail-Tests' }
IRCopyRoutesTestCase >> testSmalltalkClassTakesALocalClassHelperWithItsDef [
	"A def that defines a class (grail_local_class) is regenerated onto the
	Smalltalk class with its class statement's helper, which is the Smalltalk
	class's own and filed under 'Grail-ST-Extension' with the def, so it goes
	when the extension methods do.  On the text path (the control) the def is
	recompiled from its text, which builds the class inline: no helper."

	#(true false) do: [:regen |
		| helpers result |
		self tearDown.
		self ___load___: 'grail_smalltalk_class.py' as: 'grail_smalltalk_class' ir: regen.
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
	"The control: the same fixture compiled on the TEXT path
	(GRAIL_IR_CODEGEN=0).  Every copy is a text method recompiled from its own
	source, none is generated, and the checks pass: the two paths agree.
	(Until P2.3b the control was the IR path with regeneration turned off,
	which sent every IR copy back to its text twin.)"

	| mod |
	mod := self ___load___: 'ir_copies_without_text.py' as: 'ir_copies_without_text' ir: false.
	self ___runChecksCounting___: mod.
	self assert: (self ___count___: 'cp:dispatch-shadow:regen') equals: 0.
	self assert: (self ___count___: 'cp:dispatch-shadow:text') > 0.
	self assert: (self ___count___: 'cp:special:text') > 0

]
