"
P2.1's regenerate API: an IR-built class method generated again for ANOTHER
class (importlib ___irRegenerate___:onto:category:, ___irMethodFor___:on:),
from a cached builder or from one rebuilt from the def's Python source.

The fixture, tests/python/ir_regenerate_onto_another_class.py, is its own
CPython oracle: its PLAN names copies between classes, CPython makes them by
setattr of the function objects, and run_checks says what each copy must do.
These tests make the same copies through the API and run the same checks.
"
Class {
	#name : 'IRRegenerateTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___checksOf___: aModule [
	"name -> { ok. actual repr } for every check in the fixture's run_checks."

	| out |
	out := Dictionary new.
	((aModule @env1:___pyAttrLoad___: #'run_checks') @env1:__call__) do: [:t |
		out at: (t @env1:__getitem__: 0) asString
			put: { (t @env1:__getitem__: 1) == true. (t @env1:__getitem__: 2) @env1:__repr__ asString }].
	^ out

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___class___: aName of: aModule [
	^ aModule @env1:___pyAttrLoad___: aName asSymbol

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___copy___: aSource onto: aTarget [
	"What the MI merge does with a secondary base: every IR method of aSource,
	both sides, that aTarget does not define itself, regenerated onto aTarget.
	Answer the selectors that would not regenerate."

	| failed |
	failed := OrderedCollection new.
	{ aSource -> aTarget. aSource class -> aTarget class } do: [:pair |
		(pair key methodDictForEnv: 1) keysAndValuesDo: [:sel :meth |
			((BaseException ___isIRPythonMethod___: meth)
				and: [(pair value includesSelector: sel environmentId: 1) not])
				ifTrue: [
					(importlib ___irRegenerate___: meth onto: pair value
						category: 'Grail-Class Methods') isNil
							ifTrue: [failed add: pair key name , '>>' , sel]]]].
	^ failed

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___copyPlanOf___: aModule [
	| failed |
	failed := OrderedCollection new.
	(aModule @env1:___pyAttrLoad___: #'PLAN') do: [:pair |
		failed addAll: (self
			___copy___: (self ___class___: (pair @env1:__getitem__: 0) of: aModule)
			onto: (self ___class___: (pair @env1:__getitem__: 1) of: aModule))].
	^ failed

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/ir_regenerate_onto_another_class.py'

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___irMethodsOf___: aClass [
	"Every IR-built method of aClass, both sides."

	| out |
	out := OrderedCollection new.
	{ aClass. aClass class } do: [:c |
		(c methodDictForEnv: 1) keysAndValuesDo: [:sel :meth |
			(BaseException ___isIRPythonMethod___: meth) ifTrue: [out add: meth]]].
	^ out

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___load___: aPath as: aName [
	"A fresh forced-IR import, so the class methods are built in this session."

	^ self ___load___: aPath as: aName ir: true

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___load___: aPath as: aName ir: aBoolean [
	"A fresh import on the arm aBoolean names."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: aBoolean.
	^ importlib loadModuleFromPath: aPath name: aName

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___signatureOf___: aMethod depth: anInteger [
	"Everything a generated method holds, its block methods compared the same
	way rather than by identity: the source (with its position map), the
	argument count, and every slot."

	| out |
	out := OrderedCollection new.
	out add: aMethod sourceString; add: aMethod numArgs; add: aMethod size.
	1 to: aMethod size do: [:i |
		| e |
		e := aMethod at: i.
		(e isKindOf: ExecBlock) ifTrue: [e := e method].
		((e isKindOf: GsNMethod) and: [anInteger < 6])
			ifTrue: [e := self ___signatureOf___: e depth: anInteger + 1].
		out add: e].
	^ out asArray

]

{ #category : 'Grail-Private' }
IRRegenerateTestCase >> ___verifyCopiesWithCacheLimit___: aLimitOrNil [
	| mod checks |
	aLimitOrNil notNil ifTrue: [
		importlib ___irBuilderCacheReset___.
		importlib ___irBuilderCacheLimit: aLimitOrNil].
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	aLimitOrNil = 0 ifTrue: [self assert: importlib ___irBuilderCache___ isEmpty].
	self assert: (self ___copyPlanOf___: mod) asArray equals: #().
	checks := self ___checksOf___: mod.
	self assert: checks size equals: 13.
	checks keysAndValuesDo: [:name :r |
		name = 'super_stranger'
			ifTrue: [
				"A KNOWN GRAIL BUG, not a regeneration one: zero-argument super()
				does not check that the receiver is an instance of the defining
				class, on either arm and without any copy (``C.f(S())'' answers
				where CPython raises TypeError).  The copy agrees with Grail's
				uncopied call."
				self assert: (r at: 2) equals: '(''Child'', ''Base'', ''Stranger'')']
			ifFalse: [
				self assert: (r at: 1) description: name , ' answered ' , (r at: 2)]]

]

{ #category : 'Grail-Setup' }
IRRegenerateTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irBuilderCacheLimit: nil.
	#(#'ir_regen_fixture' #'ir_regen_stale') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testACopyCanItselfBeRegenerated [
	"A method the MI merge put on a class has THAT class as its inClass, and a
	subclass's merge copies it on.  It carries its def id, so it can be rebuilt
	from source with the original's builder gone."

	| mod target stranger copy again |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	target := self ___class___: 'Target' of: mod.
	stranger := self ___class___: 'Stranger' of: mod.
	copy := importlib
		___irRegenerate___: ((self ___class___: 'Base' of: mod) compiledMethodAt: #'plain:' environmentId: 1)
		onto: target category: 'Grail-Class Methods'.
	self assert: copy notNil.
	self assert: copy inClass == target.
	importlib ___irBuilderCacheReset___.
	again := importlib ___irRegenerate___: copy onto: stranger category: 'Grail-Class Methods'.
	self assert: again notNil description: 'a copy whose builder is gone could not be rebuilt'.
	self assert: again inClass == stranger.
	self assert: (importlib ___irDefIdOf___: again) equals: (importlib ___irDefIdOf___: copy).
	self assert: (self eval: 's = S()
s.v = 40
s.plain(2)' with: { #S -> stranger }) equals: 42

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testAMissRebuildsTheMethodTheBuildMade [
	"The rebuild from Python source must give the method the cold build gave,
	slot for slot: re-running the class's emit is what supplies the compile
	context, and nothing about it may drift.  Every IR method of the fixture,
	regenerated onto its own class from the cached builder and from a rebuilt
	one."

	| mod methods |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	methods := OrderedCollection new.
	#('Base' 'Child' 'Slotted' 'Padded' 'Target') do: [:n |
		methods addAll: (self ___irMethodsOf___: (self ___class___: n of: mod))].
	self assert: methods size >= 15
		description: 'only ' , methods size printString , ' IR methods; the fixture was not IR-built'.
	methods do: [:m |
		| cached rebuilt |
		cached := importlib ___irBuilderCache___ at: m otherwise: nil.
		self assert: cached notNil description: m inClass name , '>>' , m selector , ' was not cached'.
		rebuilt := importlib ___irRebuildBuilderFor___: m.
		self assert: rebuilt notNil description: m inClass name , '>>' , m selector , ' could not be rebuilt'.
		self
			assert: (self ___signatureOf___: (rebuilt ___irGenerateFor___: m inClass) depth: 0)
			equals: (self ___signatureOf___: (cached ___irGenerateFor___: m inClass) depth: 0)]

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testAnUninstalledMethodMustReachItsClassHelper [
	"Base's with_class holds a class statement, carried as a text helper the
	method sends to its receiver.  The helper is on Base, so a method generated
	for a subclass reaches it; one generated for an unrelated class would DNU
	at the class statement, and ___irMethodFor___:on: -- which installs nothing,
	helpers included -- answers nil so the consumer keeps its text route."

	| mod meth |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	meth := (self ___class___: 'Base' of: mod) compiledMethodAt: #'with_class' environmentId: 1.
	self assert: (importlib ___irMethodFor___: meth on: (self ___class___: 'GrandChild' of: mod)) notNil.
	self assert: (importlib ___irMethodFor___: meth on: (self ___class___: 'Stranger' of: mod)) isNil.
	self deny: ((self ___class___: 'Stranger' of: mod) includesSelector: #'with_class' environmentId: 1)

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testARebuildRefusesASourceThatChanged [
	"A def id names offsets into the module's source.  Once the file has
	changed under a loaded module, those offsets name something else, and the
	rebuild refuses rather than build it."

	| path mod meth src |
	path := self tmp: 'ir_regen_stale.py'.
	src := (GsFile openReadOnServer: self ___fixturePath___) contents.
	(GsFile openWriteOnServer: path) nextPutAll: src; close.
	mod := self ___load___: path as: 'ir_regen_stale'.
	meth := (self ___class___: 'Base' of: mod) compiledMethodAt: #'plain:' environmentId: 1.
	importlib ___irBuilderCacheReset___.
	self assert: (importlib ___irRebuildBuilderFor___: meth) notNil
		description: 'the unchanged file did not rebuild, so the refusal below proves nothing'.
	importlib ___irBuilderCacheReset___.
	(GsFile openWriteOnServer: path)
		nextPutAll: (src copyReplaceAll: 'return self.v + x' with: 'return self.v - x');
		close.
	SessionTemps current removeKey: #'GrailSourceHashNow' ifAbsent: [].
	self assert: (importlib ___irRebuildBuilderFor___: meth) isNil.
	self assert: (importlib ___irRegenerate___: meth
			onto: (self ___class___: 'Target' of: mod) category: 'Grail-Class Methods') isNil.
	GsFile removeServerFile: path

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testATextMethodHasNoBuilder [
	| mod |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture' ir: false.
	self assert: (importlib
			___irBuilderForMethod___: ((self ___class___: 'Base' of: mod) compiledMethodAt: #'plain:' environmentId: 1))
		isNil

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testEveryClassMethodCarriesItsDefId [
	"The def id is in the method, so a later session -- or a copy on another
	class -- can find the def again."

	| mod methods |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	methods := self ___irMethodsOf___: (self ___class___: 'Base' of: mod).
	self assert: methods size >= 12.
	methods do: [:m |
		| id |
		id := importlib ___irDefIdOf___: m.
		self assert: id notNil description: m selector , ' carries no def id'.
		self assert: ((id subStrings: '|') at: 1) equals: 'ir_regen_fixture'.
		self assert: ((id subStrings: '|') at: 5)
			equals: (m inClass isMeta ifTrue: ['c'] ifFalse: ['i']).
		self assert: (importlib ___irBuilderCache___ includesKey: m)]

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testRegeneratedCopiesBehaveAsCPythonCopies [
	"The copies the fixture's PLAN names, made from the builders the cold build
	cached."

	self ___verifyCopiesWithCacheLimit___: nil

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testRegeneratedCopiesBehaveAsCPythonCopiesWhenRebuiltFromSource [
	"The same copies with nothing cached, so every builder is rebuilt from the
	fixture's Python source -- what a class deployed by an earlier session
	gets."

	self ___verifyCopiesWithCacheLimit___: 0

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testTheCacheIsBounded [
	| mod |
	importlib ___irBuilderCacheReset___.
	importlib ___irBuilderCacheLimit: 4.
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	self assert: importlib ___irBuilderCache___ size <= 4.
	self assert: (self ___copyPlanOf___: mod) isEmpty.
	self assert: importlib ___irBuilderCache___ size <= 4

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testTheCacheReleasesAModuleThatIsRebuilt [
	| mod old |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	old := self ___irMethodsOf___: (self ___class___: 'Base' of: mod).
	self assert: (old allSatisfy: [:m | importlib ___irBuilderCache___ includesKey: m]).
	self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	self deny: (old anySatisfy: [:m | importlib ___irBuilderCache___ includesKey: m])

]

{ #category : 'Grail-Tests' }
IRRegenerateTestCase >> testTheMethodForASpecialReceiverIsNotInstalled [
	"UnboundMethod's special-receiver form needs a method compiled against
	SmallInteger, run with performMethod:, and SmallInteger's dictionary left
	alone.  ``Base.describe(3)'' in CPython is ('int', 4)."

	| mod meth special result |
	mod := self ___load___: self ___fixturePath___ as: 'ir_regen_fixture'.
	meth := (self ___class___: 'Base' of: mod) compiledMethodAt: #'describe' environmentId: 1.
	special := importlib ___irMethodFor___: meth on: SmallInteger.
	self assert: special notNil.
	self assert: special inClass == SmallInteger.
	self deny: (SmallInteger includesSelector: #'describe' environmentId: 1).
	result := 3 performMethod: special.
	self assert: (result @env1:__getitem__: 0) asString equals: 'int'.
	self assert: (result @env1:__getitem__: 1) equals: 4

]
