Class {
	#name : 'AstColumnOffsetsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AstColumnOffsetsTestCase >> testAstParseGivesEveryNodeCPythonColumns [
	"tests/python/ast_column_offsets.py: ast.parse gives every located node
	CPython's col_offset and end_col_offset, in UTF-8 bytes from the start of
	the line, so ast.get_source_segment finds its text.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'ast_column_offsets' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ast_column_offsets.py')
		name: 'ast_column_offsets'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '2 checks, 0 disagreeing [], keys match: True'

]
