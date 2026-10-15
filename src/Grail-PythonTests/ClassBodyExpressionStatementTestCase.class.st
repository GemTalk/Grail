Class {
	#name : 'ClassBodyExpressionStatementTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyExpressionStatementTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
ClassBodyExpressionStatementTestCase >> setUp [
	"Reload tests/python/class_body_expression_statements.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_expression_statements' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_expression_statements.py')
		name: 'class_body_expression_statements'.

]

{ #category : 'Grail-Tests - The statement runs' }
ClassBodyExpressionStatementTestCase >> testABareCallRuns [
	"The whole statement used to vanish, side effect and all."

	self assert: (self check: #'a_bare_call_runs') equals: true.

]

{ #category : 'Grail-Tests - Comprehension scope' }
ClassBodyExpressionStatementTestCase >> testAClassBodyComprehensionMayNotWalrus [
	"PEP 572 forbids it: a walrus binds in the scope ENCLOSING the
	comprehension, and a comprehension cannot write to a class namespace, so
	CPython refuses the program at compile time rather than pick an answer.
	Grail had no complaint only because the statement was dropped; emitting it
	turned the name into a Smalltalk CompileError, which Python cannot catch."

	self assert: (self check: #'a_class_body_comprehension_may_not_walrus') equals: true.

]

{ #category : 'Grail-Tests - Comprehension scope' }
ClassBodyExpressionStatementTestCase >> testAClassBodyComprehensionSkipsClassScope [
	"A comprehension is its own scope and does not see the class namespace, so
	the name is a global read.  Under exec a bare identifier for it is a
	SMALLTALK CompileError that kills the whole exec; CPython raises NameError."

	self assert: (self check: #'a_class_body_comprehension_skips_class_scope') equals: true.

]

{ #category : 'Grail-Tests - The statement runs' }
ClassBodyExpressionStatementTestCase >> testADocstringIsNotExecutedAsAStatement [
	"The leading bare string is lifted into __doc__, not evaluated -- so it is
	excluded, along with every other pure constant."

	self assert: (self check: #'a_docstring_is_not_executed_as_a_statement') equals: true.

]

{ #category : 'Grail-Tests - Enum members' }
ClassBodyExpressionStatementTestCase >> testADuplicateMemberIsStillRefused [
	"The write reaches enum's namespace, so the namespace can REFUSE it.  A
	bulk store that bypassed __setitem__ would take the last value silently."

	self assert: (self check: #'a_duplicate_member_is_still_refused') equals: true.

]

{ #category : 'Grail-Tests - Comprehension scope' }
ClassBodyExpressionStatementTestCase >> testAWalrusInAMethodComprehensionIsFine [
	"Guard rail.  The enclosing scope is then the function, not the class, so
	the rule above must not fire."

	self assert: (self check: #'a_walrus_in_a_method_comprehension_is_fine') equals: true.

]

{ #category : 'Grail-Tests - Mutating the namespace' }
ClassBodyExpressionStatementTestCase >> testVarsSetdefaultDefinesOne [
	"An insertion binds; a key already present is answered untouched."

	self assert: (self check: #'vars_setdefault_defines_one') equals: true.

]

{ #category : 'Grail-Tests - Mutating the namespace' }
ClassBodyExpressionStatementTestCase >> testVarsUpdateDefinesClassAttributes [
	"``.update()'' has to reach the class the way ``vars()[k] = v'' already did."

	self assert: (self check: #'vars_update_defines_class_attributes') equals: true.

]

{ #category : 'Grail-Tests - Enum members' }
ClassBodyExpressionStatementTestCase >> testVarsUpdateDefinesEnumMembers [
	"The shape test_enum uses -- members computed at class-definition time."

	self assert: (self check: #'vars_update_defines_enum_members') equals: true.

]

{ #category : 'Grail-Tests - Mutating the namespace' }
ClassBodyExpressionStatementTestCase >> testVarsUpdateKeywordFormDefinesThemToo [
	"The varargs form needs its own routing: dict's stores the keywords with
	at:put: directly rather than delegating."

	self assert: (self check: #'vars_update_keyword_form_defines_them_too') equals: true.

]
