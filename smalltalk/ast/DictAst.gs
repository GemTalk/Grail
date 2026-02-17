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
DictAst category: 'Parser'
%

! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst

set compile_env: 0

category: 'other'
method: DictAst
printSmalltalkOn: aStream

	keys isEmpty ifTrue: [
		aStream nextPutAll: '(KeyValueDictionary perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '([:___d | '.
	1 to: keys size do: [:i |
		aStream nextPutAll: '___d __setitem__: '.
		(keys at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ' _: '.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___d] value: (KeyValueDictionary perform: #new env: 0))'.
%
