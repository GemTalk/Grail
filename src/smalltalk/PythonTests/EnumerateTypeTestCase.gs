! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EnumerateTypeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumerateTypeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumerateTypeTestCase - enumerate is a lazy TYPE, and reversed honours the
! old-style sequence protocol.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumerateTypeTestCase removeAllMethods.
EnumerateTypeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - builtins'
method: EnumerateTypeTestCase
testEnumerateIsATypeAndReversedFollowsTheProtocol
	"enumerate was a builtins FUNCTION that drained its argument into a list
	and answered that list's iterator.  As a lazy TYPE it gains the three
	things CPython promises and Grail could not express: ``class
	MyEnum(enumerate)'' has a class to subclass -- a NameError before, and
	where test.test_enumerate stopped at import -- ``type(enumerate(s))'' is
	enumerate rather than list_iterator, and an exception raised by the source
	arrives when iteration reaches it instead of at construction.

	Being a type also means being CALLED like one, and the call arrives by
	three different roads: CallAst's fixed-arity class-call fast path, the
	keyword-bearing ``value:value:'' route, and a subclass's own
	instantiation.  All three land on the same argument checking, which is
	what test_argumentcheck and test_kwargs pin down.

	The builtins methods that used to implement it are GONE rather than kept
	as shorthand: NameAst treats any name builtins publishes a method for as a
	fast-path builtin and emits a BoundMethod, so while they existed the bare
	name ``enumerate'' evaluated to that wrapper instead of the class.

	reversed had no old-style sequence path: a class answering __len__ and
	__getitem__ fell through to the env-0 ``reverseDo:'' -- an uncatchable
	MNU, not the TypeError Python code catches.  Native sequences keep the
	reverseDo: route deliberately: their iterator TYPE is observable through
	pickle, and routing tuples through seq_iterator made a reversed tuple
	reload as a different type than it started as."

	| mod results |
	importlib @env1:modules removeKey: #'enumerate_type' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enumerate_type.py')
		name: 'enumerate_type'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('is_a_type' 'result_type_is_enumerate' 'iter_returns_self'
	  'basic_pairs' 'start_positional' 'start_keyword' 'iterable_keyword'
	  'both_keywords_reversed_order' 'empty_source' 'subclassable'
	  'subclass_type_is_subclass' 'subclass_takes_start' 'no_arguments'
	  'non_iterable' 'start_not_an_int' 'too_many_arguments'
	  'unknown_keyword_with_good_positional' 'unknown_keyword_only'
	  'bool_start_accepted' 'not_iterable_at_construction'
	  'iter_returns_non_iterator' 'construction_is_lazy'
	  'source_exception_propagates' 'getitem_only_source'
	  'pickle_preserves_type' 'pickle_preserves_contents'
	  'pickle_resumes_where_it_left_off' 'pickle_keeps_start'
	  'reversed_sequence_protocol' 'reversed_empty_sequence'
	  'reversed_builtins_unchanged' 'reversed_range_unchanged'
	  'reversed_without_len' 'reversed_without_getitem'
	  'reversed_blocked_by_none' 'reversed_prefers_dunder') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
