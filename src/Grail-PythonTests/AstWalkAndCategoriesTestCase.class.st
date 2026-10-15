Class {
	#name : 'AstWalkAndCategoriesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
AstWalkAndCategoriesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
AstWalkAndCategoriesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
AstWalkAndCategoriesTestCase >> setUp [

	importlib @env1:modules removeKey: #'ast_walk_and_categories' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ast_walk_and_categories.py')
		name: 'ast_walk_and_categories'

]

{ #category : 'Grail-Tests - ast' }
AstWalkAndCategoriesTestCase >> testDecoratorsAreNames [

	self assertAll: #('bare_decorators_are_names'
		'stacked_decorators'
		'a_decorator_name_reads_as_load')

]

{ #category : 'Grail-Tests - ast' }
AstWalkAndCategoriesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14

]

{ #category : 'Grail-Tests - ast' }
AstWalkAndCategoriesTestCase >> testParseEval [

	self assertAll: #('parse_eval_answers_an_expression')

]

{ #category : 'Grail-Tests - ast' }
AstWalkAndCategoriesTestCase >> testVisitorsAndLocationHelpers [

	self assertAll: #('node_visitor'
		'node_transformer'
		'copy_location_keeps_the_line'
		'fix_missing_locations'
		'increment_lineno')

]

{ #category : 'Grail-Tests - ast' }
AstWalkAndCategoriesTestCase >> testWalkFindsStatementsAndCategories [

	self assertAll: #('walk_finds_every_statement'
		'categories'
		'location_attributes'
		'iter_fields'
		'iter_child_nodes')

]
