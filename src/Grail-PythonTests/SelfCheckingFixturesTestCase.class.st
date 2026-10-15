Class {
	#name : 'SelfCheckingFixturesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SelfCheckingFixturesTestCase >> ___failingChecksIn___: aName [
	"Load tests/python/<aName>.py fresh and call each function in its CHECKS,
	answering the names of those that did not answer True (a raise counts as
	a failure, and is named with its exception).  AlmostOutOfStack is passed
	on, never swallowed: catching it would spend the VM's one warning."

	| mods module checks failing |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	module := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	checks := module @env1:___pyAttrLoad___: #'CHECKS'.
	failing := OrderedCollection new.
	checks do: [:fn | | name result |
		name := (fn @env1:___pyAttrLoad___: #'__name__') asString.
		result := [(fn @env1:___pyCallValue___: #() kw: nil) == true
				ifTrue: [nil]
				ifFalse: [name]]
			on: AbstractException
			do: [:ex |
				(AlmostOutOfStackError handles: ex) ifTrue: [ex pass].
				ex return: name , ' raised ' , ex messageText asString].
		result isNil ifFalse: [failing add: result]].
	^ failing asArray

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testCodecsCjkAndIdna [
	"The CJK codecs, IDNA over stringprep, and unicodedata.ucd_3_2_0."
	self assert: (self ___failingChecksIn___: 'codecs_cjk_idna') equals: #()

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testCodecsConformance [
	"The codec behaviours test_codecs exposed: the charmap contract,
	bytes-like decoder input, UTF-8 well-formedness, the UTF-16/32 BOM
	contract, UTF-7, escape warnings, the registry and keyword calls."
	self assert: (self ___failingChecksIn___: 'codecs_conformance') equals: #()

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testMroBuiltinsAndMiClosures [
	"PR #1126's fixture, which until now was only ever run under CPython."
	self assert: (self ___failingChecksIn___: 'mro_builtins_and_mi_closures') equals: #()

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testSessionPatching [
	"Monkey-patching through session methods: an instance patch reaches only
	its instance, a builtin patch reaches bare calls, and a class carrying a
	patch can still have methods removed."
	self assert: (self ___failingChecksIn___: 'session_patching') equals: #()

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testUnicodedataCurrent [
	"unicodedata's module-level category / bidirectional / combining /
	decomposition / normalize / is_normalized, over the generated current
	database -- and urllib.parse's NFKC netloc check, which the old
	pass-through normalize() silently disabled."
	self assert: (self ___failingChecksIn___: 'unicodedata_current') equals: #()

]

{ #category : 'Grail-Tests' }
SelfCheckingFixturesTestCase >> testUnittestSubtestSkip [
	"A skipTest() inside a subTest skips that subtest only; the method goes
	on to the next one.  It used to end the whole method, so later subtests
	never ran and the test still passed."
	self assert: (self ___failingChecksIn___: 'unittest_subtest_skip') equals: #()

]
