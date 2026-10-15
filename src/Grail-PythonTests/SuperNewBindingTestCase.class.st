Class {
	#name : 'SuperNewBindingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperNewBindingTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperNewBindingTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_new_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_new_binding.py')
		name: 'super_new_binding'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - Class side' }
SuperNewBindingTestCase >> testAMetaclassInheritingAMetaclass [
	"Both conventions in one call chain: M2's super() lands on M1's
	PYTHON-written __new__ (instance-side, stripped) and M1's lands on type's
	(class-side, not stripped).  The class is stamped by both, so a rule
	applied uniformly in either direction fails here."

	self assert: (self at: 'metaclass_chain') @env0:asString
		equals: '(True, True, ''M2'')'.

]

{ #category : 'Grail-Tests - Namedtuple' }
SuperNewBindingTestCase >> testANamedtupleSubclassDelegatesWithSuper [
	"urllib3's ``Url'': a namedtuple subclass whose __new__ normalises its
	arguments and then delegates.  This is the last blocker for kaggle, which
	imported and authenticated and then failed its first network call with
	``Url() takes 7 positional arguments but 8 were given'' -- the same defect
	at arity 7."

	self assert: (self at: 'url_scheme') @env0:asString equals: 'http'.
	self assert: (self at: 'url_values') @env0:asString
		equals: '(''http'', ''example.com'')'.
	self assert: (self at: 'url_class') @env0:asString equals: 'Url'.

]

{ #category : 'Grail-Tests - Class side' }
SuperNewBindingTestCase >> testBuiltinBasesAreUntouched [
	"str / int / tuple subclasses delegate to a CLASS-side built-in __new__ that
	takes the class explicitly.  They fail for a fix that strips on both sides,
	which is the other way to get this wrong."

	self assert: (self at: 'str_sub') @env0:asString equals: '(''AB'', ''S1'')'.
	self assert: (self at: 'int_sub') @env0:asString equals: '(6, ''I1'')'.
	self assert: (self at: 'tuple_sub') @env0:asString
		equals: '((1, 2), ''TDerived'')'.

]

{ #category : 'Grail-Tests - Instance side' }
SuperNewBindingTestCase >> testEveryLevelOfTheChainSeesTheMostDerivedClass [
	"Three levels, each forwarding.  The receiver has to be the class the CALL
	passed -- the most derived one -- and not the class whose __new__ is
	running, which is what makes ``strip the leading argument and use it'' the
	rule rather than ``keep super()'s own object''."

	self assert: (self at: 'chain_value') equals: 12.
	self assert: (self at: 'chain_class') @env0:asString equals: 'D3'.

]

{ #category : 'Grail-Tests - Instance side' }
SuperNewBindingTestCase >> testKeywordAndSplatCallSitesTakeTheSameCorrection [
	"A keyword argument routes to the varargs selector ``___new__:kw:'' and a
	splat fixes its arity only at run time -- two more resolution paths through
	the same lookup, and the varargs selector is the one that exists on BOTH
	sides with different conventions."

	self assert: (self at: 'kwargs') @env0:asString equals: '(1, 9)'.
	self assert: (self at: 'splat') @env0:asString equals: '(1, 2, 3)'.

]

{ #category : 'Grail-Tests - Class side' }
SuperNewBindingTestCase >> testMetaclassNewStillGetsTheClass [
	"THE CONTROL.  ``super().__new__(mcls, name, bases, ns)'' resolves
	class-side onto ``type >> __new__:_:_:_:'', which takes the metaclass as a
	real argument and needs all four.  A fix that stopped passing the leading
	class everywhere would break exactly this, and that is why the naive
	correction was deferred twice rather than shipped."

	self assert: (self at: 'metaclass_stamped') equals: true.
	self assert: (self at: 'metaclass_type') @env0:asString equals: 'Meta'.

]

{ #category : 'Grail-Tests - Class side' }
SuperNewBindingTestCase >> testObjectNewThroughSuperIsUnchanged [
	"``super().__new__(cls)'' with no further arguments must still find
	``object class >> __new__:'' -- the class-side form, with the class as its
	argument -- rather than an instance-side zero-argument __new__.  The
	commonest super().__new__ in the corpus, and the one the fix rewrites the
	resolution of without meaning to change."

	self assert: (self at: 'object_new_class') @env0:asString equals: 'C0'.

]

{ #category : 'Grail-Tests - Instance side' }
SuperNewBindingTestCase >> testSuperNewDoesNotBindTheClassTwice [
	"The repro, in two plain classes.  ``A.__new__() takes 2 positional
	arguments but 3 were given'' before the fix -- Grail's own complaint about
	a call Grail had malformed by passing cls as both the receiver and the
	first argument."

	self assert: (self at: 'plain_pair') @env0:asString equals: '(1, 2)'.
	self assert: (self at: 'plain_class') @env0:asString equals: 'B'.

]

{ #category : 'Grail-Tests - Instance side' }
SuperNewBindingTestCase >> testTheClassPassedIsTheClassConstructed [
	"``super().__new__(H2, a)'' from inside H3 builds an H2.  super()'s bound
	object and the argument coincide for every ordinary call, so this is the
	one check that says WHICH of the two the receiver comes from."

	self assert: (self at: 'constructs_the_named_class') @env0:asString
		equals: 'H2'.

]

{ #category : 'Grail-Tests - Instance side' }
SuperNewBindingTestCase >> testTheExplicitTwoArgumentSuperFormToo [
	"``super(G2, cls).__new__(cls, a)'' reaches the same proxy by a different
	codegen path.  Pinned because the zero-argument and two-argument rewrites
	are separate emissions in CallAst and only one of them was exercised by the
	repro."

	self assert: (self at: 'explicit_super') @env0:asString equals: '(7, ''G2'')'.

]
