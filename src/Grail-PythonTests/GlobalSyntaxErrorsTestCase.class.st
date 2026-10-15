Class {
	#name : 'GlobalSyntaxErrorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GlobalSyntaxErrorsTestCase >> assertMatchesCPythonAt: key [
	self
		assert: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key) asString
		equals: ((testModule @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
GlobalSyntaxErrorsTestCase >> setUp [
	"Reload tests/python/global_syntax_errors.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_syntax_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/global_syntax_errors.py')
		name: 'global_syntax_errors'.

]

{ #category : 'Grail-Tests - Still Legal' }
GlobalSyntaxErrorsTestCase >> testAComprehensionTargetDoesNotBlockTheDeclaration [
	"The false positive this fixture actually caught.  A comprehension is
	its OWN scope in Python 3, so its target neither binds nor reads in
	the enclosing function -- but the reads emitted inside it DO land in
	the enclosing scope's readStack, which reported ``used prior to
	global declaration'' for code CPython compiles fine."

	self assertMatchesCPythonAt: 'comprehension_target'.

]

{ #category : 'Grail-Tests - Rejections' }
GlobalSyntaxErrorsTestCase >> testANameAssignedBeforeTheDeclarationIsRejected [
	self assertMatchesCPythonAt: 'assigned_before'.

]

{ #category : 'Grail-Tests - Rejections' }
GlobalSyntaxErrorsTestCase >> testANameReadBeforeTheDeclarationIsRejected [
	self assertMatchesCPythonAt: 'used_before'.

]

{ #category : 'Grail-Tests - Rejections' }
GlobalSyntaxErrorsTestCase >> testAnAnnotatedNameCannotBeDeclaredGlobal [
	"``x: int'' with no value BINDS NOTHING, so it never reaches the
	write set -- yet it still makes a later ``global x'' an error, and
	with a different message.  That is why annotations are tracked
	separately from writes."

	self assertMatchesCPythonAt: 'annotated_before'.

]

{ #category : 'Grail-Tests - Rejections' }
GlobalSyntaxErrorsTestCase >> testAParameterCannotBeDeclaredGlobal [
	"Needs its own tracking: a parameter registers through
	declareVariable:, which is also used for unrelated scope hints, so
	``in variables but not in writes'' would misidentify it."

	self assertMatchesCPythonAt: 'parameter'.

]

{ #category : 'Grail-Tests - Still Legal' }
GlobalSyntaxErrorsTestCase >> testAReadInsideANestedDefBelongsToThatDef [
	"The false positive the CPYTHON CORPUS caught, after the fixture had
	already passed: test_builtin declares ``global all, any, tuple''
	after several nested defs that CALL all/any/tuple, and rejecting it
	made the whole module fail to import.

	Grail propagates free names OUT of a nested scope into the enclosing
	read set, so that scope could answer closures and locals() -- which
	makes the enclosing read set TRANSITIVE, and unable to answer ``was
	this name read in THIS scope?''.  The check reads a separate own-reads
	set that popScope deliberately does not propagate."

	self assertMatchesCPythonAt: 'nested_def_read'.
	self assertMatchesCPythonAt: 'nested_def_genexp_read'.

]

{ #category : 'Grail-Tests - Still Legal' }
GlobalSyntaxErrorsTestCase >> testDeclaringBeforeUseStaysLegal [
	"The normal, correct spelling -- and by far the most common one in
	real code, so a check that got this wrong would be caught by the
	whole corpus failing to import rather than by one test."

	self assertMatchesCPythonAt: 'declared_first'.
	self assertMatchesCPythonAt: 'declared_first_then_read'.

]

{ #category : 'Grail-Tests - Rejections' }
GlobalSyntaxErrorsTestCase >> testEachNameInAMultiNameDeclarationIsChecked [
	"``global a, b'' where only b is already bound: the statement is
	rejected on b, so checking merely the first name would accept it."

	self assertMatchesCPythonAt: 'multiple_names'.

]

{ #category : 'Grail-Tests - Still Legal' }
GlobalSyntaxErrorsTestCase >> testModuleLevelAndClassBodyDeclarationsStayLegal [
	"At module level ``global'' is a legal no-op, and a CLASS body may
	declare it -- Grail already depends on the latter, since it rebinds
	the module's name and leaves the class without the attribute.
	Applying the function-scope rule to either would break importing."

	self assertMatchesCPythonAt: 'module_level'.
	self assertMatchesCPythonAt: 'class_body'.

]

{ #category : 'Grail-Tests - Still Legal' }
GlobalSyntaxErrorsTestCase >> testTheCheckIsPerScope [
	"An inner function has its own scope, so an outer binding -- or an
	outer PARAMETER -- of the same name must not poison it.  Consulting
	the enclosing scope's sets instead of the current one's would reject
	all three of these."

	self assertMatchesCPythonAt: 'inner_scope_is_separate'.
	self assertMatchesCPythonAt: 'sibling_scopes'.
	self assertMatchesCPythonAt: 'outer_param_inner_global'.

]
