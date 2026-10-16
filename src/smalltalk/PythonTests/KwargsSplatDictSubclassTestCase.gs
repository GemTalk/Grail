! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KwargsSplatDictSubclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KwargsSplatDictSubclassTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
KwargsSplatDictSubclassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KwargsSplatDictSubclassTestCase - ``f(**m)'' hands f a plain dict of its own,
! whatever dict subclass m is (#1686)
! ===============================================================================
! object >> ___pyKwargsSplatFor___: passed a dict subclass through, and the
! callee's binding copied it with its class and attributes, so an OrderedDict's
! kwargs shared the caller's _order list.  A ``kwargs.pop(k)'' in the callee
! then broke the caller's dict, and botocore failed to build every client after
! a process's first one.  The copy follows CPython's dict_merge: keys() and
! __getitem__ when the class overrides __iter__, the raw entries otherwise.
! tests/python/kwargs_splat_dict_subclass.py holds the 11 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KwargsSplatDictSubclassTestCase removeAllMethods.
KwargsSplatDictSubclassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: KwargsSplatDictSubclassTestCase
setUp

	importlib @env1:modules removeKey: #'kwargs_splat_dict_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/kwargs_splat_dict_subclass.py')
		name: 'kwargs_splat_dict_subclass'
%

category: 'Grail-Helpers'
method: KwargsSplatDictSubclassTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: KwargsSplatDictSubclassTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - OrderedDict'
method: KwargsSplatDictSubclassTestCase
testACalleesPopLeavesTheCallersOrderedDictAlone

	self assertAll: #('an_ordered_dicts_kwargs_is_a_plain_dict'
		'a_pop_in_the_callee_leaves_the_caller_alone' 'the_same_ordered_dict_splats_again'
		'a_classmethod_pops_from_the_same_rule_twice')
%

category: 'Grail-Tests - OrderedDict'
method: KwargsSplatDictSubclassTestCase
testTheKwargsKeepTheOrderedDictsOrder

	self assertAll: #('the_kwargs_keep_the_ordered_dicts_order')
%

category: 'Grail-Tests - other subclasses'
method: KwargsSplatDictSubclassTestCase
testAnyDictSubclassGivesAPlainDict

	self assertAll: #('a_dict_subclasss_kwargs_is_its_own_plain_dict'
		'a_counter_and_a_defaultdict_give_plain_dicts')
%

category: 'Grail-Tests - other subclasses'
method: KwargsSplatDictSubclassTestCase
testOnlyAnIterOverrideIsReadThroughKeys

	self assertAll: #('keys_without_iter_is_not_consulted'
		'an_iter_override_reads_keys_and_getitem')
%

category: 'Grail-Tests - unchanged'
method: KwargsSplatDictSubclassTestCase
testPlainAndMixedSplatsAreUnchanged

	self assertAll: #('a_plain_dicts_kwargs_is_still_a_copy' 'mixed_with_named_keywords_too')
%

category: 'Grail-Tests - unchanged'
method: KwargsSplatDictSubclassTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 11
%
