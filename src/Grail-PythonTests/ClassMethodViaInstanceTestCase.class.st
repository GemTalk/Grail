Class {
	#name : 'ClassMethodViaInstanceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> loadFixture [
	"Load tests/python/classmethod_via_instance.py once per suite run
	and return the cached module.  The fixture is a read-only set of
	function evaluators, so one import serves every test — recompiling
	its seven classes for each of the cases below would burn transient
	code space for nothing (the reason FlaskScaffoldingTestCase caches
	the same way)."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'classmethod_via_instance' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_via_instance.py')
		name: 'classmethod_via_instance'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testAttributeStoreStillWorks [
	"Guard: ``self.stored = v'' on a class that ALSO carries class
	methods must still write an instance attribute.  The forward is
	reached from the same keyword-selector branch that implements
	attribute stores, so this pins that adding it did not turn ordinary
	1-arg attribute writes into dispatch failures.

	This uses a NON-colliding name; the same-name case is
	testAttributeStoreWinsOverSameNamedClassMethod."

	self assert: self loadFixture @env1:setter_still_works equals: 42

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testAttributeStoreWinsOverSameNamedClassMethod [
	"``self.value = v'' where the class ALSO defines a ``value'' class
	method.  CPython stores an instance attribute — a classmethod is not
	a data descriptor, so it does not intercept assignment — and Grail
	agrees, because an attribute STORE is emitted directly against
	dynamic-instVar storage and never reaches the DNU keyword branch the
	forward lives in.  Pinned so the forward cannot later be moved
	somewhere that would start intercepting these writes."

	self assert: self loadFixture @env1:colliding_setter equals: 'stored'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testBytesSubclassClassMethodViaSelf [

	self assert: self loadFixture @env1:bytessub_cm equals: 'cm:BytesSub:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testClsBindsToDerivedClass [
	"Python binds ``cls'' to the receiver's own class, not the class
	that defined the method."

	self assert: self loadFixture @env1:derived_binds_derived equals: 'cm:Derived:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testDictSubclassClassMethodViaSelf [

	self assert: self loadFixture @env1:dictsub_cm equals: 'cm:DictSub:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testListSubclassClassMethodViaSelf [

	self assert: self loadFixture @env1:listsub_cm equals: 'cm:ListSub:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testPlainClassMethodViaSelf [
	"Baseline: a plain class already reached its 1-arg class method."

	self assert: self loadFixture @env1:plain_cm equals: 'cm:Plain:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testPlainStaticMethodViaSelf [
	"@staticmethod through an instance kept working throughout — guard
	against the forward disturbing it."

	self assert: self loadFixture @env1:plain_static equals: 'sm:3'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testPlainVarargsClassMethodViaSelf [
	"A defaulted signature compiles to ``_cmv:kw:''; the forward probes
	that form too."

	self assert: self loadFixture @env1:plain_varargs equals: 'cmv:Plain:7:2'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testPlainZeroArgClassMethodViaSelf [
	"``self.cm0()'' is a UNARY send, so it missed the keyword-branch
	forward and raised even on a plain class."

	self assert: self loadFixture @env1:plain_cm0 equals: 'cm0:Plain'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testStrSubclassClassMethodViaSelf [
	"THE markupsafe case: a str subclass is not a PythonInstance."

	self assert: self loadFixture @env1:strsub_cm equals: 'cm:StrSub:1'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testStrSubclassVarargsClassMethodViaSelf [

	self assert: self loadFixture @env1:strsub_varargs equals: 'cmv:StrSub:7:2'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testStrSubclassZeroArgClassMethodViaSelf [

	self assert: self loadFixture @env1:strsub_cm0 equals: 'cm0:StrSub'

]

{ #category : 'Grail-Tests-ClassMethodViaInstance' }
ClassMethodViaInstanceTestCase >> testTupleSubclassClassMethodViaSelf [

	self assert: self loadFixture @env1:tuplesub_cm equals: 'cm:TupleSub:1'

]
