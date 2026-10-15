Class {
	#name : 'MethodDefaultSharingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - defaults' }
MethodDefaultSharingTestCase >> testDefTimeDefaults [
	"Every check answers true when Grail agrees with CPython."

	| mod |
	importlib @env1:modules removeKey: #'method_default_sharing' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_default_sharing.py')
		name: 'method_default_sharing'.
	#( 'a_method_shares_one_mutable_default'
	   'a_method_default_is_shared_across_instances'
	   'a_method_default_is_evaluated_once'
	   'a_method_default_of_none_still_binds'
	   'an_explicit_argument_still_wins'
	   'a_subclass_reaching_super_keeps_its_own_default'
	   'a_staticmethod_default_still_works'
	   'a_classmethod_default_still_works'
	   'a_nested_def_captures_at_def_time'
	   'a_module_level_class_body_local_can_be_a_default'
	   'a_nested_class_body_local_can_be_a_default'
	   "KEYWORD-ONLY defaults -- the same rule, the same two generators, and
	    until this list grew, the same defect unfixed.  See the fixture's
	    section comment."
	   'a_class_body_name_resolves_in_a_keyword_only_default'
	   'the_urllib3_connection_shape_constructs'
	   'a_module_level_class_body_local_can_be_a_keyword_only_default'
	   'a_method_shares_one_mutable_keyword_only_default'
	   'a_module_level_def_shares_one_mutable_keyword_only_default'
	   'a_keyword_only_default_is_evaluated_once'
	   'a_keyword_only_default_of_none_still_binds'
	   'an_explicit_keyword_argument_still_wins'
	   'a_missing_required_keyword_only_still_raises'
	   'a_subclass_reaching_super_keeps_its_own_keyword_only_default'
	   'varargs_then_a_keyword_only_default_resolves'
	   'a_keyword_only_default_alongside_kwargs_resolves'
	   'a_keyword_only_default_may_be_a_call'
	   'a_staticmethod_keyword_only_default_still_works'
	   'a_classmethod_keyword_only_default_still_works'
	   "The last two are NEGATIVE CONTROLS: the closure generator, which was
	    already right and must not be routed through the new store, and the
	    method BODY, which must keep skipping the class namespace."
	   'a_nested_def_keyword_only_default_still_works'
	   'the_body_does_not_see_the_class_scope' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		"Report what the check ANSWERED: these return evidence rather than false
		 (``second call saw [2]''), which is the difference between a diagnosis and
		 a rerun."
		self assert: (answer = true)
			description: 'default-sharing check failed: ' , k , ' -> ' , answer printString].

]
