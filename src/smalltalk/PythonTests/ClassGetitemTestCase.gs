! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassGetitemTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ClassGetitemTestCase comment:
'PEP 560: ``C[x]'' means ``C.__class_getitem__(x)''.

It is an IMPLICIT classmethod -- the class is bound as cls whether the
subscript went to that class or to a subclass, which is what makes D[int]
answer ``D[int]'' rather than ``C[int]''.

Grail routed every class subscript to one permissive default on Metaclass3
that answered the class itself, so a user-defined __class_getitem__ was never
called at all.  Honouring it meant recognising FOUR storage shapes, because
Grail keeps them in four different places:

	def __class_getitem__(cls, item)	an env-1 INSTANCE method
	def __class_getitem__(*args)		the varargs instance selector
	@classmethod def __class_getitem__	metaclass-side, one argument
	__class_getitem__ = <anything>		a unary accessor on the metaclass

The metaclass-side probe has to check the DEFINER, not just presence: every
class answers that selector because object supplies the permissive default
there, so only a definer other than object''s metaclass is a real override.
And a class-body ``= classmethod(f)'' assigns a DESCRIPTOR -- the wrapper is
not callable in Grail or in CPython, so it is unwrapped and given the class,
which is what __get__ would have produced.

The permissive default STAYS for a class with no __class_getitem__ at all.
CPython raises there; Grail cannot, because ``class Foo(list[V])'' has to keep
compiling to ``class Foo(list)'' and annotations subscript classes constantly.
That divergence is asserted in the fixture as an XFAIL rather than left to
chance, and half the fixture is regression cover for ordinary subscripting.

See tests/python/class_getitem.py.'
%

expectvalue /Class
doit
ClassGetitemTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ClassGetitemTestCase removeAllMethods: 0.
ClassGetitemTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassGetitemTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_getitem' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_getitem.py')
		name: 'class_getitem'.
%

category: 'Grail-Helpers'
method: ClassGetitemTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ClassGetitemTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the four shapes'
method: ClassGetitemTestCase
testEveryDefinitionShapeIsHonoured
	"A plain def, an explicit @classmethod, and an assigned classmethod
	descriptor -- three different places in Grail, one protocol."

	self assertAll: #('plain_def' 'classmethod_def' 'assigned_callable')
%

category: 'Grail-Tests - the four shapes'
method: ClassGetitemTestCase
testANonCallableAssignmentRaises
	"An assignment that is not callable -- ``__class_getitem__'' bound to a
	string -- is a TypeError, not a silently ignored subscript."

	self assertAll: #('non_callable_assignment_raises')
%

category: 'Grail-Tests - cls binding'
method: ClassGetitemTestCase
testTheClassIsBoundAsCls
	"A subclass inheriting the method still sees ITSELF, which is the whole
	point of the protocol being an implicit classmethod."

	self assertAll: #('subclass_inherits_and_binds_itself'
		'base_still_binds_itself' 'subclass_can_override'
		'classmethod_form_also_binds_the_subclass')
%

category: 'Grail-Tests - the subscript'
method: ClassGetitemTestCase
testTheSubscriptIsPassedThrough
	"Several subscripts arrive as ONE tuple; a single one is not wrapped; a
	class is an ordinary item."

	self assertAll: #('multiple_subscripts_arrive_as_a_tuple'
		'single_subscript_is_not_wrapped' 'item_may_be_a_class')
%

category: 'Grail-Tests - unchanged'
method: ClassGetitemTestCase
testOrdinarySubscriptingIsUnaffected
	"Every class subscript in Grail goes through the method this changes --
	including the list[int] in an annotation -- so instances, containers and
	strings are all cover here, not decoration."

	self assertAll: #('plain_class_stays_subscriptable'
		'builtin_container_stays_subscriptable' 'instance_subscript_unaffected'
		'list_subscript' 'dict_subscript' 'tuple_subscript' 'str_subscript')
%

category: 'Grail-Tests - unchanged'
method: ClassGetitemTestCase
testTheProtocolIsClassSideOnly
	"An INSTANCE of a class defining __class_getitem__ is not subscriptable
	through it."

	self assertAll: #('instance_does_not_get_class_getitem')
%
