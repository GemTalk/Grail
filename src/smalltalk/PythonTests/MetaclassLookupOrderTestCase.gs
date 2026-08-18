! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassLookupOrderTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassLookupOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassLookupOrderTestCase - the order Cls.name searches with a metaclass.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassLookupOrderTestCase removeAllMethods.
MetaclassLookupOrderTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Attribute Protocol'
method: MetaclassLookupOrderTestCase
testMetaclassDoesNotShadowTheClassesOwnMethods
	"``type.__getattribute__(cls, name)'' searches in three steps: the metatype
	first but only accepting a DATA DESCRIPTOR, then ``cls.__mro__'', then the
	metatype again accepting anything.  So a class's own method outranks a plain
	method of the same name on its metaclass.

	Grail ran the third step before the second, so a metaclass method SHADOWED a
	method the class itself defines.  The symptom is quiet, which is why it
	survived: ``Sub.both'' answered a BoundMethod on the metaclass where CPython
	answers the class's own function, so ``Sub.both()'' RAN the metaclass method
	and returned a value instead of raising TypeError for the missing ``self''.
	Nothing crashed -- the wrong method simply ran.

	It surfaced through ``__dir__''.  CPython's traceback.py reaches a metaclass
	__dir__ by calling ``obj.__dir__()'' and catching the TypeError a CLASS
	receiver produces, and that TypeError is exactly what the second step has to
	produce an unbound function for.  With the order reversed there was no
	TypeError, so the metaclass __dir__ was never consulted -- test_traceback's
	test_getattr_suggestions_with_custom___dir__.

	The second step asks specifically for a method compiled from a PYTHON CLASS
	BODY, not for anything the Smalltalk chain owns.  Grail's ``object'' IS the
	kernel ``Object'', so the chain ends in methods that stand in for CPython's
	``object.__dict__'' without matching it -- ``__subclasshook__'' is an instance
	method here and a CLASSMETHOD there.  The first version of this fix counted
	those, and ABCMeta's ``B.register(V)'' broke; the last check below is that
	case.

	All eight checks answer identically under real CPython, verified by running
	the fixture.  See tests/python/metaclass_lookup_order.py."

	| mod |
	importlib @env1:modules removeKey: #'metaclass_lookup_order' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_lookup_order.py')
		name: 'metaclass_lookup_order'.
	#( 'the_classes_own_method_wins_over_the_metaclasss'
	   'the_instance_still_gets_the_classes_method'
	   'a_dunder_follows_the_same_rule'
	   'the_control_class_is_unaffected'
	   'a_metaclass_only_method_is_still_reachable'
	   'the_metaclass_dir_is_reachable_through_the_type'
	   'a_class_attribute_still_outranks_the_metaclass'
	   'an_abcmeta_class_can_still_register' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'metaclass lookup check failed: ' , k , ' -> ' , answer printString]
%
