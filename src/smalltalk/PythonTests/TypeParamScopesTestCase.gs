! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeParamScopesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeParamScopesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeParamScopesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeParamScopesTestCase - PEP 695 scopes, and what test_typing hit next
! ===============================================================================
! ``class C[T]'' and ``type A[T] = V'' are rewritten by the parser into the
! annotation scope CPython's compiler builds (PythonParser >>
! ___rewriteTypeParamStatement___), so T is bound in the body, a Generic[T]
! base is added and a parameterised alias exists at all -- which is what let
! test_typing import.  The neighbouring checks are the shared-machinery
! defects the module then hit.
!
! tests/python/type_param_scopes.py holds the checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeParamScopesTestCase removeAllMethods.
TypeParamScopesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeParamScopesTestCase
setUp

	importlib @env1:modules removeKey: #'type_param_scopes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_scopes.py')
		name: 'type_param_scopes'
%

category: 'Grail-Helpers'
method: TypeParamScopesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: TypeParamScopesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testClassParametersAreBoundAndGeneric

	self assertAll: #('class_params_are_bound_in_the_body'
		'class_params_add_a_generic_base'
		'a_parameterised_class_is_subscriptable'
		'the_scope_function_is_invisible'
		'the_generic_base_follows_positional_bases'
		'a_local_class_keeps_its_qualname'
		'type_params_are_not_inherited'
		'a_parameterised_protocol')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testBoundsAreLazyAndKindsAreRight

	self assertAll: #('bounds_constraints_and_kinds'
		'a_bound_is_evaluated_lazily')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testParameterisedAliases

	self assertAll: #('a_parameterised_alias'
		'only_a_generic_alias_is_subscriptable'
		'an_alias_value_sees_its_params_and_itself')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testTypeVarModules

	self assertAll: #('a_typevar_belongs_to_its_module'
		'the_typing_classes_report_typing')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testAttributeAndDirNeighbours

	self assertAll: #('an_annotated_attribute_store_stores'
		'every_name_dir_lists_is_gettable'
		'the_class_dict_names_each_method_once'
		'a_bare_annotation_binds_nothing'
		'getattr_static_raises_for_a_missing_name')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testMetaclassNeighbours

	self assertAll: #('a_metaclass_repr_may_call_super'
		'a_subclass_of_any_reprs_as_a_class'
		'a_metaclass_keeps_its_classes_init_subclass')
%

category: 'Grail-Tests'
method: TypeParamScopesTestCase
testCallingANonCallableInstanceIsCatchable

	self assertAll: #('calling_a_non_callable_instance_is_a_type_error')
%

