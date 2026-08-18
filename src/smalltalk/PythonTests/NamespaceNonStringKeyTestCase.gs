! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NamespaceNonStringKeyTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NamespaceNonStringKeyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NamespaceNonStringKeyTestCase - non-string keys in __dict__ and globals().
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NamespaceNonStringKeyTestCase removeAllMethods.
NamespaceNonStringKeyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Namespaces'
method: NamespaceNonStringKeyTestCase
testANamespaceTakesNonStringKeys
	"An instance dict and a module dict are ordinary dicts in CPython, so they
	take any hashable key: ``inst.__dict__[0] = 1'' and ``globals()[0] = 1'' are
	both legal.  Such a key is unreachable through attribute SYNTAX -- ``obj.x''
	can only spell a string -- so it is dict-only by construction rather than by
	omission.  The mirror rule is that a non-string ATTRIBUTE NAME is rejected.

	Grail had the two rules the wrong way round: it refused the legal dict key and
	accepted the illegal attribute name.  This covers the refusal.

	IT WAS NOT A CONTAINER SWAP.  A namespace dict is not a dictionary at all
	here: ``obj.__dict__'' is a LIVE VIEW -- PyInstanceDict, or PyModuleDict for a
	module -- over GemStone dynamic instance variables, and ``dynamicInstVarAt:put:''
	is a primitive whose key must be a Symbol.  Non-string keys now live in a real
	dict parked in one reserved Symbol slot, which the view merges on read; see
	PyInstanceDict >> ___overflowSlot___.

	The check that ties this to where it came from is
	``dunder_dir_reports_the_key_itself_not_a_lookalike_string''.  Every
	enumerator used to hand its keys to Python through ``asString'', which turns
	the int 0 into '0' -- and CPython's traceback.py sifts a __dir__ result with
	``isinstance(x, str)'' before offering a ``Did you mean'', so a lookalike
	string does not get filtered and reads as a name.  Storing the key was only
	half the job.

	All fifteen checks answer identically under real CPython, verified by running
	the fixture.  See tests/python/namespace_non_string_keys.py."

	| mod |
	importlib @env1:modules removeKey: #'namespace_non_string_keys' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/namespace_non_string_keys.py')
		name: 'namespace_non_string_keys'.
	#( 'an_int_key_can_be_stored'
	   'an_int_key_reports_present'
	   'an_int_key_counts_towards_len'
	   'an_int_key_appears_in_keys_as_an_int'
	   'an_int_key_appears_in_items_as_an_int'
	   'an_int_key_can_be_popped'
	   'a_mixed_dict_keeps_both_kinds'
	   'clearing_removes_a_non_string_key_too'
	   'get_and_setdefault_reach_a_non_string_key'
	   'a_non_string_key_is_not_an_attribute'
	   'dir_still_reports_the_string_attributes'
	   'dunder_dir_reports_the_key_itself_not_a_lookalike_string'
	   'globals_takes_a_non_string_key'
	   'deleting_a_non_string_global_works'
	   'a_str_subclass_key_is_reachable_as_an_attribute' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'namespace key check failed: ' , k , ' -> ' , answer printString]
%
