! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssignedNewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AssignedNewTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AssignedNewTestCase comment:
'Assigning ``__new__'' on a class: it must be STORED, and then CALLED.

	A.__new__ = staticmethod(f)

is how a class''s allocator is replaced after the fact, and PEP 702''s
@deprecated does exactly that to make instantiation warn.  Grail got both
halves wrong, for unrelated reasons.

STORING.  __setattr__ and ___pyAttrStore___ both read a unary ``name'' plus a
one-argument ``name:'' as a @property getter/setter pair and dispatch to the
setter.  The shape is right for class-body data and for @property -- and
__new__ is the one name where it LIES, because ``__new__:'' takes the class to
instantiate rather than a value to store.  So the assignment CALLED
object.__new__(f), reaching the allocator with the assigned function standing
in for cls: ``a PyStaticMethod does not understand #new''.  The rule now lives
in one predicate, ___mayDispatchToSetter___, that both sites consult.

Of every name a class answers in both forms, only __new__ is shaped this way.
__doc__ and __module__ are genuine value setters, and the fixture asserts they
still dispatch -- the guard had to be narrow, not merely effective.

CALLING.  An assigned __new__ lives in the class-attribute store, not as a
compiled method, so ___allocateInstance___ could not see it and fell through to
plain allocation -- the function was stored, and then ignored.  It now looks
__new__ up on the TYPE by the same MRO walk setattr(cls, ...) writes to, and
calls it with the class first, so a subclass inherits a parent''s assigned
__new__ and can override it.

See tests/python/assigned_new.py.'
%

expectvalue /Class
doit
AssignedNewTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
AssignedNewTestCase removeAllMethods: 0.
AssignedNewTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AssignedNewTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'assigned_new' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/assigned_new.py')
		name: 'assigned_new'.
%

category: 'Grail-Helpers'
method: AssignedNewTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AssignedNewTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - storing'
method: AssignedNewTestCase
testAssignmentStoresRatherThanCalls
	"The assignment itself must not invoke the allocator -- a __new__ that
	raises proves it, since assigning it is silent and only the later
	instantiation raises."

	self assertAll: #('assignment_does_not_invoke' 'assigned_new_reads_back')
%

category: 'Grail-Tests - calling'
method: AssignedNewTestCase
testAssignedNewIsCalledOnInstantiation
	"Stored and then honoured: the function runs, and the result is an
	instance of the class."

	self assertAll: #('assigned_new_is_called'
		'plain_function_assignment_works')
%

category: 'Grail-Tests - calling'
method: AssignedNewTestCase
testItReceivesTheClassAndTheArguments
	"CPython treats __new__ as an implicit staticmethod: the class is passed
	explicitly, followed by the call''s own positional and keyword arguments."

	self assertAll: #('receives_class_and_arguments')
%

category: 'Grail-Tests - inheritance'
method: AssignedNewTestCase
testInheritanceFollowsTheMro
	"A subclass inherits a parent''s assigned __new__ -- and gets its OWN
	class, not the parent''s -- and can override it with another assignment."

	self assertAll: #('subclass_inherits_assigned_new'
		'subclass_can_override_it')
%

category: 'Grail-Tests - PEP 702'
method: AssignedNewTestCase
testDeprecatedClassWarnsOnInstantiation
	"The case that drove the whole fix: @deprecated on a class marks it AND
	warns when one is built."

	self assertAll: #('deprecated_class_warns_on_instantiation')
%

category: 'Grail-Tests - unchanged'
method: AssignedNewTestCase
testGenuineSetterPairsStillDispatch
	"__doc__ and __module__ are the other two names a class answers in both
	forms, and both ARE setters.  The guard had to be narrow, not merely
	effective."

	self assertAll: #('doc_assignment_still_works'
		'module_assignment_still_works' 'ordinary_class_attributes')
%

category: 'Grail-Tests - unchanged'
method: AssignedNewTestCase
testClassBodyNewAndPlainClassesAreUntouched
	"A ``def __new__'' in the class body still runs, and a class with no
	__new__ anywhere still instantiates -- the probe added to the allocation
	path must not have changed either."

	self assertAll: #('class_body_new_still_runs' 'plain_class_unaffected')
%
