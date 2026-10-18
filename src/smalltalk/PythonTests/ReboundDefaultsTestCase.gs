! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReboundDefaultsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReboundDefaultsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReboundDefaultsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReboundDefaultsTestCase - a __defaults__ / __kwdefaults__ assignment that
! changes the SHAPE of a module-level function's or a method's defaults binds
! (#1714)
! ===============================================================================
! Whether a parameter has a default is compiled into the function's
! ``_name:kw:'' prologue, so #1669's same-shape write could not carry None,
! another length, or a keyword-only name added or removed: the value read back
! and the call ignored it.  Such a write now installs a SESSION ``_name:kw:''
! on the defining class (Behavior >> ___grailRebind___:code:receiverOffset:
! value:kw:initial:) that binds against the new defaults and runs the original
! method (object >> ___grailReboundCall___:pos:kw:).  No other function pays
! anything per call.  Nested functions and lambdas keep the limit
! FunctionDefaultsTestCase documents.
! tests/python/rebound_defaults.py holds the 17 checks, measured on CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReboundDefaultsTestCase removeAllMethods.
ReboundDefaultsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReboundDefaultsTestCase
setUp

	importlib @env1:modules removeKey: #'rebound_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rebound_defaults.py')
		name: 'rebound_defaults'
%

category: 'Grail-Helpers'
method: ReboundDefaultsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ReboundDefaultsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - module functions'
method: ReboundDefaultsTestCase
testDefaultsAddedOrRemovedBind

	self assertAll: #('defaults_added_to_a_def_that_had_none_bind'
		'later_writes_of_any_shape_take_effect' 'defaults_set_to_none_stop_binding'
		'too_many_positional_names_the_new_range'
		'deleting_defaults_stops_binding_and_reads_none')
%

category: 'Grail-Tests - module functions'
method: ReboundDefaultsTestCase
testEveryParameterKindBinds

	self assertAll: #('keyword_only_defaults_added_mutated_and_removed'
		'positional_only_parameters_take_their_defaults' 'a_varargs_def_takes_new_defaults'
		'a_longer_tuple_supplies_the_last_parameters'
		'keywords_mix_with_new_defaults_and_every_missing_one_is_named')
%

category: 'Grail-Tests - module functions'
method: ReboundDefaultsTestCase
testCallSitesAndCallers

	self assertAll: #('a_call_compiled_in_the_same_module_binds'
		'the_callers_keyword_dict_is_untouched')
%

category: 'Grail-Tests - methods'
method: ReboundDefaultsTestCase
testMethodsRebind

	self assertAll: #('a_methods_new_defaults_bind_however_it_is_called'
		'a_methods_defaults_set_to_none_stop_binding'
		'a_subclass_shares_the_function_and_an_override_keeps_its_own'
		'the_method_is_still_a_bound_method' 'a_methods_keyword_only_defaults_bind')
%

category: 'Grail-Tests - methods'
method: ReboundDefaultsTestCase
testARebuiltClassIsRebindableAgain
	"Loading the fixture again in the same session rebuilds its classes in
	place (they are canonical), recompiling ``_m:kw:'' -- which displaces the
	first load's session entry point while its record survives.  The record is
	recognised as stale and dropped, so the second load's writes rebind afresh
	rather than updating a record nothing reads.  Measured: without that,
	a_methods_new_defaults_bind_however_it_is_called failed on every load after
	the first."

	importlib @env1:modules removeKey: #'rebound_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rebound_defaults.py')
		name: 'rebound_defaults'.
	(self results @env1:keys) @env0:do: [:name |
		self assert: (self results @env1:__getitem__: name) == true
			description: 'second load: ' , name asString]
%

category: 'Grail-Tests - methods'
method: ReboundDefaultsTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 17
%
