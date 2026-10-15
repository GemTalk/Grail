Class {
	#name : 'FunctionTypeParamsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionTypeParamsTestCase >> assertCheckPasses: aName [
	"The fixture answers true, or a string naming what it saw.  The refusal
	checks in particular answer the WRONG MESSAGE rather than false, because
	getting the class right and the wording wrong is the likely failure."

	| answer |
	answer := testModule @env0:perform: aName asSymbol env: 1.
	self assert: (answer = true)
		description: 'type-params check failed: ' , aName , ' -> ' , answer printString.

]

{ #category : 'Grail-Setup' }
FunctionTypeParamsTestCase >> setUp [
	"Reloaded per test: assigning_a_tuple_is_allowed_and_reads_back WRITES a
	function's __type_params__, and although it restores them, a shared module
	would make that cleanup load-bearing for the other tests rather than tidy."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_type_params' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_type_params.py')
		name: 'function_type_params'.

]

{ #category : 'Grail-Tests - Reading' }
FunctionTypeParamsTestCase >> testAGenericDefReportsItsTypeParams [
	"Shape and arity of the tuple, and the name it carries.  Nested defs, which
	is what test___type_params__ uses -- they compile to BLOCKS."

	self assertCheckPasses: 'a_generic_def_reports_its_type_params'.
	self assertCheckPasses: 'a_type_param_carries_its_name'.

]

{ #category : 'Grail-Tests - TypeVar Is A Class' }
FunctionTypeParamsTestCase >> testAParamSpecAndATypeVarTupleAreNotTypeVars [
	"Why TypeVar SUBCLASSES _TypeVarInstance rather than renaming it.  A rename
	would have made every ParamSpec and TypeVarTuple answer True to
	isinstance(x, TypeVar), where CPython says False -- one wrong answer traded
	for another."

	self assertCheckPasses: 'a_paramspec_is_not_a_typevar'.
	self assertCheckPasses: 'a_typevartuple_is_not_a_typevar'.

]

{ #category : 'Grail-Tests - Reading' }
FunctionTypeParamsTestCase >> testAPlainDefAndALambdaHaveNoTypeParams [
	"An empty tuple, not None and not an error -- functools.update_wrapper copies
	this name, so a raise here breaks every decorator."

	self assertCheckPasses: 'a_plain_def_has_no_type_params'.
	self assertCheckPasses: 'a_lambda_has_no_type_params'.

]

{ #category : 'Grail-Tests - Write Guards' }
FunctionTypeParamsTestCase >> testAssigningANonTupleIsRefused [
	"Was ACCEPTED before: ``f.__type_params__ = 42'' stored the integer, so a
	later read handed a non-iterable to code that unpacks it.  The lambda case is
	separate because it is a different object reaching the same guard."

	self assertCheckPasses: 'assigning_a_non_tuple_is_refused'.
	self assertCheckPasses: 'assigning_a_non_tuple_to_a_lambda_is_refused'.

]

{ #category : 'Grail-Tests - Write Guards' }
FunctionTypeParamsTestCase >> testAssigningATupleIsAllowed [
	"The guard refuses a bad TYPE, not the attribute: a real tuple still writes
	through and reads back.  A guard that refused everything would pass both
	refusal tests above and be wrong."

	self assertCheckPasses: 'assigning_a_tuple_is_allowed_and_reads_back'.

]

{ #category : 'Grail-Tests - TypeVar Is A Class' }
FunctionTypeParamsTestCase >> testATypeParamIsATypeVarInstance [
	"THE CHECK THIS WORK EXISTS FOR.  Before it, isinstance RAISED TypeError
	because typing.TypeVar was a function -- an unusable answer rather than a
	wrong one, since isinstance against a non-type cannot answer False."

	self assertCheckPasses: 'a_type_param_is_a_typevar_instance'.

]

{ #category : 'Grail-Tests - Write Guards' }
FunctionTypeParamsTestCase >> testDeletingTypeParamsIsRefused [
	"NOT like __defaults__, whose delete is legal and clears it to None.  CPython
	routes this through the setter and has no clearing path, so the delete fails
	the tuple check and reports the SET message.  Before, it answered
	``AttributeError: __type_params__'' -- the wrong class AND the wrong claim,
	for an attribute every function has."

	self assertCheckPasses: 'deleting_type_params_is_refused'.

]

{ #category : 'Grail-Tests - TypeVar Is A Class' }
FunctionTypeParamsTestCase >> testTypeVarIsAClass [
	"Stated directly as well as through isinstance: the isinstance check would
	also pass if TypeVar were some other class T happened to instantiate, and
	this names the property that actually changed."

	self assertCheckPasses: 'typevar_is_a_class'.

]

{ #category : 'Grail-Tests - TypeVar Is A Class' }
FunctionTypeParamsTestCase >> testTypeVarStillAcceptsItsOldSignature [
	"The function it replaced took constraints and keyword-only options, and call
	sites pass them.  A class whose __init__ dropped them would fail here rather
	than silently ignore them -- which is the failure mode that would have
	surfaced somewhere else entirely."

	self assertCheckPasses: 'typevar_still_accepts_its_old_signature'.

]
