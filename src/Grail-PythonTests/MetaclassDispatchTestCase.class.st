Class {
	#name : 'MetaclassDispatchTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassDispatchTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
MetaclassDispatchTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_dispatch.py')
		name: 'metaclass_dispatch'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - Return value' }
MetaclassDispatchTestCase >> testAMetaclassMayReturnSomethingThatIsNotAClass [
	"CPython binds whatever __new__ answers, so a class name need not hold a
	class.  test_super returns None and test_subclassinit returns 0.

	This is what forced the dispatch to be the LAST class-construction step:
	sitting at the ___pyClassDefined___ hook, every send after it was aimed at
	None."

	self assert: (self at: 'new_returning_none') equals: true.
	self assert: (self at: 'new_returning_zero') equals: true.

]

{ #category : 'Grail-Tests - Guards' }
MetaclassDispatchTestCase >> testAMetaclassThatConstructsNothingIsLeftAlone [
	"ABCMeta overrides neither __new__ nor __init__ and must not be handed the
	construction protocol.

	It nearly was.  ``object'' defines ___new__:kw: and type inherits it, so
	testing for the method with an attribute load answered true for EVERY
	metaclass: ABCMeta was handed a namespace, and type.__new__ wrote that
	namespace back over the class's own methods.  ``class B(OperationLogger,
	metaclass=ABCMeta)'' lost its __ge__ to an UnboundMethod owned by ABCMeta,
	and a comparison that should end in TypeError raised AttributeError
	(test_binop test_comparison_orders).  The defining class must be STRICTLY
	below type."

	self assert: (self at: 'nonconstructing_metaclass_untouched') @env0:asString
		equals: 'TypeError'.
	self assert: (self at: 'nonconstructing_keeps_its_type') @env0:asString
		equals: 'ABCMeta'.

]

{ #category : 'Grail-Tests - Namespace' }
MetaclassDispatchTestCase >> testAnAdditionToTheNamespaceReachesTheClass [
	"``ns['injected'] = ...'' before super().__new__ lands as a class
	attribute, because ``build a class with this namespace'' is what
	type.__new__ MEANS.  Grail's class already carries every binding the body
	made; this is the write the metaclass itself made afterwards, which is the
	whole reason several metaclasses override __new__ (``namespace
	['__classcell__'] = cell'')."

	self assert: (self at: 'ns_injection_lands') @env0:asString
		equals: 'from_namespace'.

]

{ #category : 'Grail-Tests - Dispatch' }
MetaclassDispatchTestCase >> testMetaclassNewAndInitBothRun [
	"``M.__new__'' then ``M.__init__'', in that order, over the class being
	defined.  Neither was reached before: a ``metaclass='' was a RECORD, and
	nothing dispatched it."

	self assert: (self at: 'new_ran') @env0:asString equals: 'new'.
	self assert: (self at: 'init_ran') @env0:asString equals: 'init'.

]

{ #category : 'Grail-Tests - Dispatch' }
MetaclassDispatchTestCase >> testTheClassBodySurvivesTheMetaclass [
	"The guard that matters for the inverted order.  ``super().__new__''
	answers the class UNDER CONSTRUCTION rather than building a second one, so
	the body's attributes and methods are still there afterwards -- a fresh
	class built from the namespace would have lost whatever the namespace does
	not carry."

	self assert: ((self at: 'body_survives') asArray
			collect: [:e | e @env0:asString])
		equals: #( '2' 'm' ).

]

{ #category : 'Grail-Tests - Dispatch' }
MetaclassDispatchTestCase >> testTheDispatchedMetaclassIsStillReportedByType [
	"The dispatch must not disturb what #459 established."

	self assert: (self at: 'type_is_meta') @env0:asString equals: 'MSelf'.
	self assert: (self at: 'isinstance_of_meta') equals: true.

]

{ #category : 'Grail-Tests - Namespace' }
MetaclassDispatchTestCase >> testTheNamespaceCarriesTheWholeBody [
	"``ns'' is a real mapping holding the class body -- assignments AND defs,
	which is what the class-body namespace staging put there.  Every metaclass
	in the corpus that overrides __new__ reads or mutates it, so handing over an
	empty one would be worse than not dispatching at all."

	self assert: ((self at: 'ns_keys') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'a' 'f' ).

]
