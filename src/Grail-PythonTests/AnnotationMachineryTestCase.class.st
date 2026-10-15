Class {
	#name : 'AnnotationMachineryTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AnnotationMachineryTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
AnnotationMachineryTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'annotation_machinery' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/annotation_machinery.py')
		name: 'annotation_machinery'.

]

{ #category : 'Grail-Tests - class annotation scope' }
AnnotationMachineryTestCase >> testClassAnnotationsEvaluateInTheClassBody [
	"A class annotation reads the class namespace first and the enclosing scope
	second, including a nonlocal inside a method; a class body can read a
	sibling def's annotations while it runs."

	self assertMatchesCPythonAt: 'class_attr_shadows_enclosing'.
	self assertMatchesCPythonAt: 'method_nested_class_nonlocal'.
	self assertMatchesCPythonAt: 'class_body_reads_method_annotations'.

]

{ #category : 'Grail-Tests - Controls' }
AnnotationMachineryTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '35 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - FORWARDREF' }
AnnotationMachineryTestCase >> testForwardRefPartialEvaluation [
	"FORWARDREF defers only what fails: ``set[undefined]'' keeps its structure,
	each key stands alone, a closure variable bound after the def resolves
	on a later evaluate(), and an AttributeError defers like a NameError."

	self assertMatchesCPythonAt: 'fwd_evaluate_partial'.
	self assertMatchesCPythonAt: 'fwd_per_key'.
	self assertMatchesCPythonAt: 'fwd_closure_bound_later'.
	self assertMatchesCPythonAt: 'fwd_attribute_error_deferred'.

]

{ #category : 'Grail-Tests - generic aliases' }
AnnotationMachineryTestCase >> testStarredSubscriptsAndBuiltinAliases [
	"``x[*y]'' is ``x[(*y,)]''; tuple, set, frozenset and dict subscript to a
	real GenericAlias; an alias iterates to its unpacked twin; range refuses."

	self assertMatchesCPythonAt: 'starred_subscript'.
	self assertMatchesCPythonAt: 'tuple_alias'.
	self assertMatchesCPythonAt: 'unpacked_alias'.
	self assertMatchesCPythonAt: 'builtin_aliases'.
	self assertMatchesCPythonAt: 'alias_arg_repr'.
	self assertMatchesCPythonAt: 'alias_as_base'.
	self assertMatchesCPythonAt: 'range_not_subscriptable'.

]

{ #category : 'Grail-Tests - PEP 750 template strings' }
AnnotationMachineryTestCase >> testTemplateSourceText [
	"type_repr and Format.STRING render a template as the t-string literal
	CPython's ast._Unparser would write."

	self assertMatchesCPythonAt: 'template_type_repr'.
	self assertMatchesCPythonAt: 'tstring_string_format'.

]

{ #category : 'Grail-Tests - PEP 750 template strings' }
AnnotationMachineryTestCase >> testTemplateStrings [
	"A t-string builds a string.templatelib Template, with CPython's parts,
	iteration, concatenation, errors and read-only Interpolation."

	self assertMatchesCPythonAt: 'tstring_repr'.
	self assertMatchesCPythonAt: 'tstring_parts'.
	self assertMatchesCPythonAt: 'tstring_iter_drops_empty'.
	self assertMatchesCPythonAt: 'tstring_concat'.
	self assertMatchesCPythonAt: 'tstring_implicit_concat'.
	self assertMatchesCPythonAt: 'tstring_plus_str'.
	self assertMatchesCPythonAt: 'str_plus_tstring'.
	self assertMatchesCPythonAt: 'template_bad_arg'.
	self assertMatchesCPythonAt: 'interpolation_readonly'.
	self assertMatchesCPythonAt: 'interpolation_bad_conversion'.
	self assertMatchesCPythonAt: 'templatelib_module'.
	self assertMatchesCPythonAt: 'interpolation_match'.
	self assertMatchesCPythonAt: 'tstring_mixed_with_str'.

]

{ #category : 'Grail-Tests - PEP 695 type parameters' }
AnnotationMachineryTestCase >> testTypeParameterKindsOnEveryDefShape [
	"``*Ts'' is a TypeVarTuple and ``**P'' a ParamSpec, on a module-level def,
	a class, a method and a nested def; the objects are stable across reads."

	self assertMatchesCPythonAt: 'def_type_params'.
	self assertMatchesCPythonAt: 'class_type_params'.
	self assertMatchesCPythonAt: 'method_type_params'.
	self assertMatchesCPythonAt: 'nested_def_type_params'.
	self assertMatchesCPythonAt: 'type_params_are_stable'.
	self assertMatchesCPythonAt: 'plain_defs_have_empty_type_params'.

]
