Class {
	#name : 'FastapiWallsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FastapiWallsTestCase >> ___assertEveryCheckIn___: aModule label: aString [
	| results bad |
	results := aModule @env1:___pyAttrLoad___: #RESULTS.
	bad := OrderedCollection new.
	self ___names___ do: [:name |
		| v |
		v := results @env1:__getitem__: name.
		v = true ifFalse: [bad add: name , ' -> ' , v printString]].
	self assert: bad isEmpty
		description: aString , ': ' , bad asArray printString.
	self assert: (results @env1:__len__) equals: self ___names___ size

]

{ #category : 'Grail-Private' }
FastapiWallsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/fastapi_walls.py'

]

{ #category : 'Grail-Private' }
FastapiWallsTestCase >> ___irModule___ [
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'faw_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'faw_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'faw_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
FastapiWallsTestCase >> ___names___ [
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('a_blank_module_namespace'
	    'a_builtin_new_called_with_its_subclass'
	    'a_class_body_def_named_doc_is_its_binding'
	    'a_class_defined_under_a_class_body_if'
	    'a_decorator_named_like_its_def'
	    'a_decorator_rooted_at_the_defs_own_name_reads_the_earlier_binding'
	    'a_deployed_class_private_default'
	    'a_hash_bound_under_a_class_body_if'
	    'a_metaclass_binary_operator_applies_to_its_classes'
	    'a_method_decorator_error_raises'
	    'a_module_decorator_error_raises'
	    'a_secondary_bases_attributes_are_not_in_the_subclass_dict'
	    'a_wrapped_property_setter_is_a_function'
	    'an_mro_earlier_definer_beats_a_left_bases_ancestor'
	    'annotations_of_a_wrapper_of_a_builtin'
	    'asyncio_callback_pairs'
	    'asyncio_threads'
	    'asyncio_vendored_names'
	    'bounded_semaphore_over_release'
	    'class_body_del_dunder'
	    'class_body_readback_dunders'
	    'class_eq_assigned'
	    'class_eq_assigned_in_dict'
	    'class_eq_assigned_unchanged'
	    'class_hash_assigned'
	    'class_module_follows_a_renamed_module'
	    'classmethod_defaults'
	    'classmethod_keyword_errors'
	    'classmethod_keywords'
	    'classmethod_override_four_args'
	    'classmethod_overriding_under_a_metaclass'
	    'cleandoc_keeps_a_form_feed'
	    'closure_defaults_per_def'
	    'closure_kwdefaults'
	    'closure_mutable_default_shared'
	    'closure_signature'
	    'condition_over_rlock_releases_all'
	    'condition_waits'
	    'contextvars_per_thread'
	    'dataclass_frozen_hash'
	    'dataclass_frozen_refuses'
	    'dataclass_order_kw_only'
	    'dataclass_post_init'
	    'dataclass_repr_eq'
	    'dataclass_signature'
	    'dataclass_slots'
	    'del_self'
	    'dict_copy_of_a_subclass_is_a_plain_dict'
	    'dict_update_too_many_args'
	    'dunder_class_property'
	    'each_lambda_evaluation_is_distinct'
	    'ellipsis_body_is_not_a_docstring'
	    'email_message_get_params'
	    'fastapi_shape_depends'
	    'four_dot_relative_import_parses'
	    'from_package_import_is_case_exact'
	    'future_result_waits'
	    'futures_timeout_is_builtin'
	    'generic_alias_dict_is_the_origins'
	    'get_ident_in_generator'
	    'getsourcelines_finds_the_block'
	    'hash_none'
	    'idle_loop_woken_by_thread'
	    'init_signature'
	    'init_signature_value'
	    'instance_dict_update_forms'
	    'instance_eq_assigned'
	    'interpreters_all'
	    'interpreters_error_bases'
	    'interpreters_is_shareable'
	    'io_open_code_reads_bytes'
	    'isinstance_none_mapping_after'
	    'json_dumps_indent_order'
	    'json_dumps_insertion_order'
	    'json_dumps_sort_keys'
	    'keyword_call_to_a_classmethod_through_cls'
	    'lambda_defaults'
	    'lambda_dunders_instance'
	    'metadata_raises_for_a_missing_distribution'
	    'method_defaults_bound'
	    'method_defaults_unbound'
	    'module_default_is_call_value'
	    'module_defaults'
	    'module_dict_update_forms'
	    'module_getattr_stored_through_a_frame'
	    'module_kwdefaults'
	    'module_level_def_has_its_cleaned_docstring'
	    'module_signature_str'
	    'module_signature_values'
	    'module_type_subclass'
	    'multiprocessing_context_imports'
	    'nested_def_defaults'
	    'nested_def_defaults_written_through'
	    'no_defaults'
	    'object_eq_over_inherited_def'
	    'object_lt_assigned_raises'
	    'ordered_dict_mutators_keep_order'
	    'os_process_cpu_count'
	    'patch_create_binds_and_removes_a_missing_name'
	    'patching_a_native_module_function_is_seen'
	    'pkgutil_get_importer_of_a_file'
	    'process_pool_name_resolves'
	    'queue_ping_pong'
	    'queue_simple_and_shutdown'
	    'rebinding_one_class_leaves_another_alone'
	    'rlock_owner_across_generator'
	    'run_path_namespace'
	    'run_path_run_name_and_init_globals'
	    'run_path_runs_the_file'
	    'runpy_all'
	    'runpy_run_module_through_the_path_finder'
	    'runtime_object_repr'
	    'semaphore_acquire'
	    'sha224_and_sha384'
	    'shlex_join_quote'
	    'shlex_lexer_comma_separated'
	    'shlex_lexer_tokens'
	    'shlex_split'
	    'signal_getsignal_returns_enum'
	    'signal_handlers_members'
	    'signal_sig_dfl_is_handler'
	    'signal_sigint_default_handler'
	    'signal_sigint_is_int'
	    'signal_sigint_is_member'
	    'signal_signal_is_the_wrapper'
	    'signal_signal_returns_enum'
	    'signal_signals_lookup'
	    'signal_signals_name'
	    'signal_valid_signals_are_members'
	    'signature_eval_str_evaluates_string_annotations'
	    'signature_keeps_a_zero_arg_return_annotation'
	    'signature_of_a_callable_instance'
	    'signature_of_a_classmethod_bound_through_get'
	    'signature_of_a_partial'
	    'signature_renders_a_generic_alias'
	    'slotted_dataclass_has_no_dict'
	    'spooled_temporary_file'
	    'staticmethod_keywords'
	    'staticmethod_override_five_args'
	    'subprocess_args_past_latin1'
	    'subprocess_cwd_may_be_a_path'
	    'the_running_loop_is_per_thread'
	    'thread_pool_executor'
	    'type_made_class_init'
	    'type_made_class_no_init_refuses_args'
	    'type_of_a_module_is_module_type'
	    'union_has_no_dict'
	    'vars_is_the_live_dict'
	    'vars_uses_a_dict_property'
	    'yield_from_checks_its_operand')

]

{ #category : 'Grail-Setup' }
FastapiWallsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'faw_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'fastapi_walls' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'faw_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - fastapi walls' }
FastapiWallsTestCase >> testEveryCheckAgreesWithCPython [
	| fixture |
	(importlib @env1:modules) removeKey: #'fastapi_walls' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'fastapi_walls'.
	self ___assertEveryCheckIn___: fixture label: 'default path'

]

{ #category : 'Grail-Tests - fastapi walls' }
FastapiWallsTestCase >> testEveryCheckAgreesWithCPythonUnderIR [
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'

]

{ #category : 'Grail-Tests - fastapi walls' }
FastapiWallsTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers under IR prove nothing if every def
	fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #compiled) > 0
		description: 'IR compiled nothing: ' , stats printString

]
