"A str subclass whose value holds a lone surrogate -- what email builds from
undecodable header bytes -- is an instance of the subclass's twin
(PyStrSurrogate class >> ___twinFor___:).  tests/python/str_subclass_surrogates.py
holds CPython-checked behaviour beyond AStrSubclassHoldsALoneSurrogateTestCase's
fixture: class and static methods read through an instance, a class attribute
named like a str method, vars().  These pin what a fixture cannot: that the
twin never shows, and the divergences the twin leaves."
Class {
	#name : 'StrSubclassSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrSubclassSurrogateTestCase >> testAReplacedOrDeletedMethodIsNotSeenByATwin [
	"A DELIBERATE DIVERGENCE, pinned.  CPython answers ['replaced', 'raised']:
	the class dict is the one place a method lives.  A twin carries the
	subclass's compiled methods, installed once per session when it is made
	ready (PyStrSurrogate class >> ___twinReady___), so replacing or deleting
	the subclass's method afterwards leaves the installed one answering.
	A method ADDED by assignment is seen (the same eval checks it): that lands
	in the subclass's holder, which the twin reads live."

	self
		assert: (self eval: 'class Tag(str):
    def shout(self):
        return "shout"
    def gone(self):
        return "gone"
t = Tag("a\udcacb")
Tag.late = lambda self: "late"
Tag.shout = lambda self: "replaced"
del Tag.gone
[t.late(), t.shout(), t.gone()]') printString
		equals: (self eval: '["late", "shout", "gone"]') printString

]

{ #category : 'Grail-Tests' }
StrSubclassSurrogateTestCase >> testAStrEnumWithASurrogateValueStillRaises [
	"A DIVERGENCE, pinned.  CPython builds the member.  Grail raises
	NotImplementedError, as every str subclass did before twins: a str-mixin
	enum builds its members with its own string copy (Enum class >>
	___grailNewMember:content:), which never reaches str.__new__ and so never
	makes the twin (PyStrSurrogate class >> ___twinFor___:)."

	self
		assert: (self eval: 'import enum
try:
    class E(str, enum.Enum):
        A = "a\udcacb"
    got = "built"
except NotImplementedError:
    got = "raised"
got')
		equals: 'raised'

]

{ #category : 'Grail-Tests' }
StrSubclassSurrogateTestCase >> testTheFixtureAgreesWithCPython [
	"tests/python/str_subclass_surrogates.py: construction, type, isinstance,
	repr, str(), the str methods, equality and hashing, the subclass's own
	methods, properties, class and static methods, class attributes (one set
	after the twin exists), instance attributes, copy and pickle -- each as
	CPython 3.14 answers it."

	| fixture |
	importlib @env1:modules removeKey: #'str_subclass_surrogates' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_subclass_surrogates.py')
		name: 'str_subclass_surrogates'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
StrSubclassSurrogateTestCase >> testTheTwinIsNeverVisible [
	"type(), __class__, __mro__ and the error messages name the subclass,
	never the twin, and the subclass's __subclasses__ does not list it."

	self
		assert: (self eval: 'class Tag(str):
    pass
t = Tag("a\udcacb")
try:
    t.nope
except AttributeError as e:
    msg = str(e)
[type(t) is Tag, t.__class__ is Tag, type(t).__mro__ == Tag.__mro__,
 Tag.__subclasses__(), msg]') printString
		equals: (self eval: '[True, True, True, [], "''Tag'' object has no attribute ''nope''"]') printString

]
