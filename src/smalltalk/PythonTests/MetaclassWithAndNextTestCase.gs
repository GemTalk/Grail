! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassWithAndNextTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MetaclassWithAndNextTestCase comment:
'A metaclass''s __enter__ / __exit__ / __next__ reach the statement.

The companion to MetaclassOperatorDispatchTestCase, and the same cause: a
synthesized DEFAULT resolves the env-1 send, so the recorded metaclass is
never asked.  ``with SomeClass:'''' said the class did not support the
context manager protocol, and ``next(SomeClass)'''' said it was not
iterable -- both naming a protocol the class demonstrably had, and the
second naming the WRONG one.

WHERE THE DEFAULTS LIVE DIFFERS, which is why this took three changes and
not one:

  * __enter__ / __exit__ / __aenter__ / __aexit__ are defaults on object,
    so they shadow the metaclass the same way __iter__ and __contains__
    did, and take the same delegation.
  * __next__ is NOT on object at all -- a class whose metaclass defines
    one would have reached it through doesNotUnderstand: -- but a Python
    class inherits PythonInstance, which DOES carry a default, and that
    resolves the send first.
  * even with that fixed, ``next(x)'''' never sends __next__ to a class:
    builtins >> ___asIterator___: diverts a receiver that does not answer
    __next__ to its __iter__, and ___respondsTo___ cannot see a method on
    the metaclass.  So the bridge had to learn the same question.

THE PROBE REFUSES AN IMPLEMENTATION OWNED BY object OR PythonInstance.  A
metaclass is itself a Python class and inherits the very same defaults, so
an ungated lookup finds the default again -- and performing it would
re-enter the method on the same receiver, forever.  A metaclass defining
neither is tested for exactly that.

The regression half is asserted throughout: a plain class still refuses,
instances are untouched, and next() still bridges a receiver that answers
__iter__ but not __next__ -- the eager generator-expression case
___asIterator___: exists for in the first place.'
%

doit
MetaclassWithAndNextTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MetaclassWithAndNextTestCase removeAllMethods: 0.
MetaclassWithAndNextTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassWithAndNextTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_with_and_next' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_with_and_next.py')
		name: 'metaclass_with_and_next'.
%

category: 'Grail-Helpers'
method: MetaclassWithAndNextTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MetaclassWithAndNextTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testWithUsesTheMetaclass
	"Enter, body, exit in order; the value __enter__ answers; an INHERITED
	metaclass, since ___grailMetaclass___ walks the superclass chain."

	self assertAll: #('with_uses_the_metaclass' 'an_inherited_metaclass_too')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testExitIsToldWhatHappenedAndCanSuppress
	"The half a delegation that only covered __enter__ would break: the
	block's exception has to reach the metaclass's __exit__, and its
	return value has to be honoured."

	self assertAll: #('the_exception_reaches_exit'
		'the_metaclass_can_suppress')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testNextUsesTheMetaclass
	"Two obstacles, not one: PythonInstance's default __next__ resolved the
	send, and builtins >> ___asIterator___: diverted to __iter__ before
	the send was even made."

	self assertAll: #('next_uses_the_metaclass')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testAClassWithNoMetaclassStillRefuses
	"The error messages these defaults exist to produce."

	self assertAll: #('a_plain_class_is_still_not_a_manager'
		'a_plain_object_is_still_not_an_iterator')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testAMetaclassWithoutThemStillRefuses
	"The recursion guard: a metaclass inherits object's defaults, so an
	ungated probe finds the default again and performing it re-enters the
	same method on the same receiver forever."

	self assertAll: #('a_metaclass_without_them_still_refuses')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testInstancesAndTheIteratorBridgeAreUntouched
	"The hot path is an instance, and next() still materialises a receiver
	that answers __iter__ but not __next__ -- the eager
	generator-expression case ___asIterator___: exists for."

	self assertAll: #('instances_are_unaffected'
		'next_still_bridges_an_iterable')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testAsyncWithUsesTheMetaclass
	"``async with'' does not reach object's defaults the way ``with'' does:
	AsyncWithAst emits a PREFLIGHT as the block's first statement, because
	CPython's BEFORE_ASYNC_WITH loads both halves before calling either.

	The preflight asked ___definesProtocolMethod___:selectors:, which probes
	``self class'' -- the SMALLTALK metaclass, ``Managed class'', whose
	superclass is ``PythonInstance class''.  ``class Managed(metaclass=Meta)''
	does not put Meta there, so a class whose metaclass supplies the whole
	protocol read as supplying none of it and the statement refused before
	__aenter__ could run.  The delegation added for ``with'' never got a
	chance, which is why this needed a second fix rather than the same one."

	self assertAll: #('async_with_uses_the_metaclass'
		'the_exception_reaches_aexit' 'the_metaclass_can_suppress_async')
%

category: 'Grail-Tests'
method: MetaclassWithAndNextTestCase
testTheAsyncPreflightStillRefusesHalfAProtocol
	"What the preflight exists FOR, and the half teaching it about the
	metaclass could have broken: a metaclass with __aenter__ and no
	__aexit__ must refuse BEFORE the body runs, not lazily at whichever
	call fell through.  The body not having run is asserted, not just the
	error."

	self assertAll: #('half_a_protocol_refuses_before_the_body'
		'async_with_on_a_plain_class_still_refuses'
		'an_async_instance_is_unaffected')
%
