! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictAst'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DictAst comment:
'https://docs.python.org/3/library/ast.html#ast.Dict

A dictionary.

keys and values hold lists of nodes representing the keys and the values respectively,
in matching order (what would be returned when calling dictionary.keys() and dictionary.values()).

When doing dictionary unpacking using dictionary literals the expression to be expanded
goes in the values list, with a None at the corresponding position in keys.

Example:
>>> print(ast.dump(ast.parse(''{"a":1, **d}'', mode=''eval''), indent=4))
Expression(
    body=Dict(
        keys=[Constant(value=''a''), None],
        values=[Constant(value=1), Name(id=''d'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictAst(keys values)
'
%

expectvalue /Class
doit
DictAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst

set compile_env: 0

category: 'Grail-other'
method: DictAst
printSmalltalkOn: aStream

	keys isEmpty ifTrue: [
		aStream nextPutAll: '(PyDict perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '([:___d | '.
	1 to: keys size do: [:i |
		(keys at: i) isNil
			ifTrue: [
				"Dictionary unpacking ``{**expr}``: the parser puts the
				mapping in `values` with a None (nil) at the matching
				`keys` position.  Merge the mapping's items into the
				accumulator (later keys overwrite earlier ones, matching
				CPython's left-to-right literal evaluation)."
				aStream nextPutAll: '___d update: '.
				(values at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. '.
			]
			ifFalse: [
				"Wrap both key and value in parens so keyword-form
				expressions (e.g. AttributeAst's ``obj @env1:___pyAttrLoad___:
				#x``) don't merge with the surrounding ``__setitem__:_:``
				selector."
				aStream nextPutAll: '___d __setitem__: '.
				(keys at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' _: '.
				(values at: i) printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. '.
			].
	].
	aStream nextPutAll: '___d] value: (PyDict perform: #new env: 0))'.
%
