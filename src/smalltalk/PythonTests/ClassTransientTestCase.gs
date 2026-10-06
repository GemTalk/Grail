! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassTransientTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassTransientTestCase'
  instVarNames: #( )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassTransientTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassTransientTestCase - class-level __transient__, within one session
! ===============================================================================
! docs/App_Namespaces_Design.md §6.3.  The instance attributes a class names in
! __transient__ get no slot position: object class >>
! ___grailInstallTransientAttrs___ routes them to session storage keyed by the
! object, so they are never committed, while reading, writing, deleting and
! listing them behave as for any attribute.  The cross-session half --
! nothing committed, an abort leaves them, __session_init__ rebuilds them in a
! new session -- is tests/scripts/runClassTransientTest.gs, since it commits.
! ===============================================================================

expectvalue /Metaclass3
doit
ClassTransientTestCase removeAllMethods.
ClassTransientTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
conn
	"A Conn with name 'db' and a transient _sock."

	^ self eval: '
class Conn:
    __transient__ = ("_sock",)
    def __init__(self):
        self.name = "db"
        self._sock = [1, 2]
Conn()'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testTransientAttributeReadsAndLists
	"Read, listed by vars() as any attribute is in CPython, and hasattr."

	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
    def __init__(self):
        self.name = "db"
        self._sock = [1, 2]
c = Conn()
repr((c._sock, sorted(vars(c)), hasattr(c, "_sock")))')
		equals: '([1, 2], [''_sock'', ''name''], True)'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testTransientNameGetsNoSlot
	"The name is kept out of the indexed layout, so it is never in the
	object's own storage."

	| c |
	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
    def __init__(self):
        self.name = "db"
        self._sock = 1
repr([str(n) for n in Conn.___pySlotLayout___()])') equals: '[''name'']'.
	c := self conn.
	self deny: ((c _instvarNamesAfter: c namedSize) includes: #'_sock').
	self deny: ((1 to: c _basicSize) anySatisfy: [:i | (c _at: i) isKindOf: list])
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testDeleteAndRebind
	"del unbinds it, hasattr then answers False, and it can be bound again --
	through the attribute, setattr and getattr alike."

	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
    def __init__(self):
        self._sock = 1
c = Conn()
del c._sock
r = [hasattr(c, "_sock")]
setattr(c, "_sock", 7)
r.append(getattr(c, "_sock"))
c._sock = 8
r.append(c._sock)
r') asArray equals: { false. 7. 8 }
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testUnsetReadsRaiseAttributeError
	"Never assigned in this session and no __session_init__: AttributeError,
	as for any unassigned attribute."

	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
c = Conn()
try:
    c._sock
    r = "no error"
except AttributeError:
    r = "AttributeError"
r') equals: 'AttributeError'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testSubclassAddsNames
	"A subclass's names join its base's: both stay out of the layout, and the
	class side answers the union."

	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
    def __init__(self):
        self.name = "db"
        self._sock = 1
class Pool(Conn):
    __transient__ = "_cache"
    def __init__(self):
        Conn.__init__(self)
        self._cache = 2
        self.size = 3
p = Pool()
repr(([str(n) for n in Pool.___pyTransientAttrs___()], list(Pool.___pySlotLayout___()), sorted(vars(p))))')
		equals: '([''_sock'', ''_cache''], [''name'', ''size''], [''_cache'', ''_sock'', ''name'', ''size''])'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testSubclassOfTransientBaseInfersNoSlot
	"A subclass that declares nothing but assigns the base's transient name
	in its own __init__ does not give it a slot."

	self assert: (self eval: '
class Conn:
    __transient__ = ("_sock",)
class Sub(Conn):
    def __init__(self):
        self._sock = 1
        self.other = 2
Sub()
repr([str(n) for n in Sub.___pySlotLayout___()])') equals: '[''other'']'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testSlotsConflictRaisesValueError
	"A name in both __slots__ and __transient__ is refused, as CPython refuses
	a __slots__ name that conflicts with a class variable."

	self assert: (self eval: '
try:
    class Bad:
        __slots__ = ("x",)
        __transient__ = ("x",)
    r = "no error"
except ValueError as e:
    r = str(e)
r') equals: '''x'' in __slots__ conflicts with __transient__'
%

category: 'Grail-Tests-transient'
method: ClassTransientTestCase
testNonStringValueRaisesTypeError
	"__transient__ is a str or a collection of str."

	self assert: (self eval: '
r = []
for value in (5, ("a", 3)):
    try:
        class Bad:
            __transient__ = value
        r.append("no error")
    except TypeError as e:
        r.append(str(e))
r') asArray equals: #('__transient__ must be a str or a sequence of str, not ''int''' '__transient__ items must be str, not ''int''')
%
