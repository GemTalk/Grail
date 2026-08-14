! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassMethodsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassMethodsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassMethodsTestCase - a ``metaclass='' keyword makes that metaclass's
! methods reachable on the class, which is what ABCMeta.register needs.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassMethodsTestCase removeAllMethods.
MetaclassMethodsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - metaclass'
method: MetaclassMethodsTestCase
testMetaclassMethodsAreReachableOnTheClass
	"Grail RECORDS a metaclass rather than building the class through one, so
	the methods it contributes are not in the class's Smalltalk chain and have
	to be found deliberately: by ___pyAttrLoad___ for ``B.register(V)'', and by
	the DNU handler for a self-send between two metaclass methods, where
	codegen takes the fast path and never loads an attribute at all.

	abc.ABCMeta was a bare marker class before this -- ``class B(...,
	metaclass=ABCMeta)'' left B with no register/__subclasscheck__ at all,
	which is where test.test_binop stopped at import.  The metaclass is
	INHERITED, as in CPython, so a subclass of an ABC can register too.

	Also covers object.__subclasshook__, whose default must DECLINE
	(NotImplemented) rather than answer False: ABCMeta consults its registry
	only on a declined hook, so False there hides every virtual subclass.  It
	raised outright until now, being an unfinished stub."

	| mod results |
	importlib @env1:modules removeKey: #'metaclass_methods' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_methods.py')
		name: 'metaclass_methods'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('register_returns_argument' 'register_is_reachable'
	  'virtual_issubclass' 'virtual_isinstance'
	  'unregistered_is_not_subclass' 'unregistered_is_not_instance'
	  'subclass_of_registered' 'real_subclass_without_register'
	  'inherited_metaclass_register' 'inherited_metaclass_issubclass'
	  'derived_registration_reaches_base' 'metaclass_method_reachable'
	  'metaclass_self_send' 'metaclass_varargs' 'metaclass_varargs_full'
	  'metaclass_method_not_on_instance' 'default_subclasshook_declines'
	  'mro_is_a_list' 'mro_starts_at_self' 'mro_includes_base'
	  'mro_ends_at_object' 'mro_matches_dunder' 'mro_is_a_fresh_list') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
