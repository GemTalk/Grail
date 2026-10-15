Class {
	#name : 'ClassBodyMethodDecoratorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> loadFixture [
	"Load tests/python/class_body_decorators.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'class_body_decorators' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_decorators.py')
		name: 'class_body_decorators'

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testACaptureStampedByAnotherSessionReachesTheOriginal [
	"A decorator's capture outlives the session that made it -- a deployed
	module commits it inside the wrapper -- and a later session replays the
	dispatcher and its pin under its OWN pin generations.  When those counted
	from 0 in every session, a capture stamped late in the deploy session read
	as newer than the binding session's pin, ran the dispatcher, and the
	dispatcher's override is the wrapper holding that capture: typing's
	``@_tp_cache def __getitem_inner__'' overflowed the stack on the first
	``Callable[[], bytes]'' in CI (werkzeug's ClosingIterator).

	Both halves of the fix, with the capture's stamp set as another session's
	would be: a session's pins start at the clock, so a stamp from an EARLIER
	session is below all of them; a stamp above this session's current
	generation came from a LATER one.  Either way the capture predates every
	pin this session can know of, and must reach the original."

	| fixture handle slot saved pinnedAt |
	fixture := self loadFixture.
	handle := (fixture @env1:captured) @env1:__getitem__: 0.
	self assert: (handle isKindOf: UnboundMethod).
	pinnedAt := BoundMethod @env1:___grailPinnedAt___: #'__probe__:'.
	self deny: pinnedAt isNil.
	"Clock-based: a counter from 0 would need a billion pins to get here."
	self assert: pinnedAt > 1048576000.
	slot := UnboundMethod allInstVarNames indexOf: #pinGeneration.
	saved := handle instVarAt: slot.
	[handle instVarAt: slot
		put: (BoundMethod @env1:___grailPinGeneration___) + 1000000000.
	 self assert: fixture @env1:captured_dunder_reaches_the_original equals: true]
		ensure: [handle instVarAt: slot put: saved].
	self assert: fixture @env1:captured_dunder_reaches_the_original equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testAFailingDecoratorPropagates [
	"A decorator that raises makes the class statement raise, as in CPython.
	This test used to assert the opposite -- that the compiled method survived
	undecorated -- which is what hid a stub getfullargspec and missing
	test.support decorators (issue #1369)."

	self assert: self loadFixture @env1:a_failing_decorator_propagates
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testAPlainInstanceIsStillNotCallable [
	"The other side of that fix: callable() decides by asking which class
	OWNS a call entry point, so PythonInstance's new inherited forwarder
	must be excluded exactly like its value:value: already was, or every
	object in the image reports callable."

	self assert: self loadFixture @env1:a_plain_instance_is_still_not_callable
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testClassAccessedMethodIsCallable [
	"``callable(Cls.m)''.  An UnboundMethod implements the call protocol as
	value:value:, not __call__, so callable() answered False -- and unittest
	discovery, which keeps a name only when ``callable(getattr(cls, name))'',
	dropped rebound test methods entirely rather than failing them."

	self assert: self loadFixture @env1:class_accessed_method_is_callable
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDeclarativeDecoratorsAreUntouched [
	"@staticmethod / @classmethod / @property are handled at PARSE time by
	re-classing the def; re-applying them at class-build time would double-handle
	them."

	self assert: self loadFixture @env1:declarative_decorators_are_untouched
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDecoratedMethodIsInherited [
	"A subclass with no override sees the parent's decorated method."

	self assert: self loadFixture @env1:decorated_method_is_inherited equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDecoratorAppliedToFreshAndExistingInstances [
	"The rebinding is a CLASS attribute, so instances created before it and
	after it both see it."

	self assert: self loadFixture
		@env1:decorator_applied_to_fresh_and_existing_instances
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDecoratorIsApplied [
	"The whole point: a class-body method decorator takes effect at all."

	self assert: self loadFixture @env1:decorator_is_applied equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDecoratorIsNotReappliedOnReimport [
	"Re-executing a class body must REPLACE the wrapper, not stack another layer
	on it.  The rebinding stores onto the committed class, so reading the base
	back as ``Cls.m'' picked up the previous run's wrapper -- flask's
	``@setupmethod'' ended up applied twice, and its inner guard raised
	NotImplementedError on every Flask() construction.  The base is therefore
	minted as an UnboundMethod for the compiled method instead.

	Driven from Smalltalk because it needs the module evicted from sys.modules
	and re-imported, which is what the codegen actually has to survive."

	| path results |
	path := importlib grailDir , '/tests/python/class_body_decorators.py'.
	results := OrderedCollection new.
	1 to: 3 do: [:i |
		| mod cls inst |
		importlib @env1:modules removeKey: #'class_body_decorators' ifAbsent: [nil].
		mod := importlib loadModuleFromPath: path name: 'class_body_decorators'.
		cls := mod @env1:___pyAttrLoad___: #'Stacked'.
		inst := cls @env1:value: #() value: nil.
		results add: ((inst @env1:___pyAttrLoad___: #'m') @env1:value: #() value: nil) asString].
	"One layer of each decorator on every import, never two."
	self assert: results asArray
		equals: (Array with: 'OUT(IN(base))' with: 'OUT(IN(base))' with: 'OUT(IN(base))')

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testDundersCanBeDecorated [
	"__init__ and __repr__ are ordinary methods as far as this goes."

	self assert: self loadFixture @env1:dunders_can_be_decorated equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testInstanceDecoratorIsApplied [
	"A decorator that is a callable INSTANCE rather than a function was
	dropped in silence: codegen applies it through ___pyCallValue___:kw:,
	which only object implemented -- as the TypeError ``not callable'' --
	and the application guard discarded that.  PythonInstance now forwards
	___pyCallValue___:kw: to its value:value:, which does the real __call__
	dispatch."

	self assert: self loadFixture @env1:instance_decorator_is_applied
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testMonkeyPatchingAMethodIsVisibleThroughInstances [
	"The independent bug the shadowing rule fixes: ``A.m = f'' was visible as
	``A.m'' but ``a.m()'' still ran the original compiled method."

	self assert: self loadFixture
		@env1:monkey_patching_a_method_is_visible_through_instances
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testNonCallableClassAttributeShadowsAMethod [
	"Assigning a non-callable over a method answers the VALUE, not a bound
	method -- CPython replaces the class-dict entry outright."

	self assert: self loadFixture @env1:non_callable_class_attribute_shadows_a_method
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testPropertySetterStillWorks [
	"``@x.setter'' is an accessor form, not a decorator to apply."

	self assert: self loadFixture @env1:property_setter_still_works equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testStackedDecoratorsApplyBottomUp [
	"``@A @B def m'' is A(B(m)) -- the decorator nearest the def runs first."

	self assert: self loadFixture @env1:stacked_decorators_apply_bottom_up
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testSuperSeesTheParentsDecoratedMethod [
	"super() has its own lookup, which walked compiled methods only."

	self assert: self loadFixture @env1:super_sees_the_parents_decorated_method
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testUnboundMethodIsCallableThroughABinding [
	"A decorator that returns its argument unchanged (@unittest.skip and
	friends) leaves an UnboundMethod as the class attribute; an instance read
	has to bind self to it like any other function in a class dict."

	self assert: self loadFixture @env1:unbound_method_is_callable_through_a_binding
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testUnboundMethodReportsItsOwnMetadata [
	"``Cls.m.__name__'' / ``__qualname__'' independent of any decorator."

	self assert: self loadFixture @env1:unbound_method_reports_its_own_metadata
		equals: true

]

{ #category : 'Grail-Tests-ClassBodyMethodDecorator' }
ClassBodyMethodDecoratorTestCase >> testWrapsCopiesNameOffTheUnboundMethod [
	"functools.wraps reads __name__ off what it is handed -- an UnboundMethod
	for a class-body decorator.  update_wrapper SKIPS a name it cannot read, so
	the missing accessor made @wraps look like a silent no-op."

	self assert: self loadFixture @env1:wraps_copies_name_off_the_unbound_method
		equals: true

]
