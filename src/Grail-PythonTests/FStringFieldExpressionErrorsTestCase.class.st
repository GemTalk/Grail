Class {
	#name : 'FStringFieldExpressionErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringFieldExpressionErrorsTestCase >> testFieldThatIsNotAnExpressionIsCPythonsFieldError [
	"tests/python/fstring_field_expression_errors.py: a replacement field with
	no expression, a stray token after one, or something after its debug
	``='' is CPython's field error at the token it names, and an error of the
	expression's own is that error at its place in the source.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_field_expression_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_field_expression_errors.py')
		name: 'fstring_field_expression_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
