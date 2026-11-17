Class {
	#name : 'AStrSubclassHoldsALoneSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AStrSubclassHoldsALoneSurrogateTestCase >> loadFixture [

	importlib @env1:modules removeKey: #'a_str_subclass_holds_a_lone_surrogate' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_str_subclass_holds_a_lone_surrogate.py')
		name: 'a_str_subclass_holds_a_lone_surrogate'

]

{ #category : 'Grail-Tests' }
AStrSubclassHoldsALoneSurrogateTestCase >> testAStrSubclassHoldsALoneSurrogate [
	"tests/python/a_str_subclass_holds_a_lone_surrogate.py: a str subclass
	built from a surrogateescape'd string is that subclass to type(),
	isinstance and super(), has its methods, property and class attributes,
	answers plain strs from str's methods, survives copy and pickle -- and an
	email with an 8-bit header parses and flattens.  Each check agrees with
	CPython 3.14."

	self
		assert: (self loadFixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
AStrSubclassHoldsALoneSurrogateTestCase >> testATwinFromAnotherSessionGetsItsMethodsBack [
	"A twin's methods are session methods, so a twin instance committed in one
	session arrives in the next without them.  Its first attribute read
	installs them again (PyStrSurrogate class >> ___twinReady___).  Simulated
	here by dropping them and forgetting that this session installed them."

	| fixture t twin ready |
	fixture := self loadFixture.
	t := fixture @env1:___pyAttrLoad___: #t.
	twin := t class.
	self assert: twin ___twinOf___ == (fixture @env1:___pyAttrLoad___: #T).
	twin @env1:___dropSessionMethods___.
	ready := SessionTemps current at: #'GrailSurrogateTwinsReady'.
	ready remove: twin.
	self deny: (twin includesSelector: #describe environmentId: 1).
	self
		assert: ((t @env1:___pyAttrLoad___: #describe) @env1:___pyCallValue___: #() kw: nil) asString
		equals: 'x/class attr/mixin'.
	self assert: (ready includes: twin)

]

{ #category : 'Grail-Tests' }
AStrSubclassHoldsALoneSurrogateTestCase >> testOneTwinPerClassAndNoneForPlainContent [
	"The twin is made once per subclass in a session, and only content holding
	a surrogate takes it: the same subclass built from ASCII is the subclass
	itself, a kernel string."

	| fixture plain |
	fixture := self loadFixture.
	plain := fixture @env1:___pyAttrLoad___: #Plain.
	self
		assert: (fixture @env1:___pyAttrLoad___: #p) class
		identical: (PyStrSurrogate ___twinFor___: plain).
	self assert: ((plain @env1:___pyCallValue___: { 'ascii' } kw: nil) class) identical: plain.
	self assert: PyStrSurrogate ___twinOf___ isNil

]
