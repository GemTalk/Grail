! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for CallAst
expectvalue /Class
doit
ExpressionAst subclass: 'CallAst'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CallAst comment:
'https://docs.python.org/3/library/ast.html#ast.Call

A function call.

func is the function, which will often be a Name or Attribute object.
args holds a list of the arguments passed by position.
keywords holds a list of keyword objects representing arguments passed by keyword.

Example:
>>> print(ast.dump(ast.parse(''func(a, b=c, *d, **e)'', mode=''eval''), indent=4))
Expression(
    body=Call(
        func=Name(id=''func'', ctx=Load()),
        args=[Name(id=''a'', ctx=Load()), Starred(...)],
        keywords=[keyword(arg=''b'', value=Name(id=''c'', ctx=Load())), ...]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CallAst(func args keywords)
'
%

expectvalue /Class
doit
CallAst category: 'Parser'
%

! ------------------- Remove existing behavior from CallAst
removeallmethods CallAst
removeallclassmethods CallAst

set compile_env: 0

category: 'Accessing'
method: CallAst
arguments

	^arguments
%

category: 'Accessing'
method: CallAst
function

	^function
%

category: 'Accessing'
method: CallAst
keywords

	^keywords
%

category: 'other'
method: CallAst
printSmalltalkOn: aStream

	function printSmalltalkOn: aStream.
	
	"Build positional arguments array"
	aStream nextPutAll: ' value: { '.
	arguments do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $.; space.
	].
	aStream nextPutAll: '} value: '.
	
	keywords isEmpty ifTrue: [
		aStream nextPutAll: 'nil'.
	] ifFalse: [
		"Build keywords dictionary"
		keywords keysAndValuesDo: [:key :value |
			aStream nextPutAll: ' at: #'; nextPutAll: key; nextPutAll: ' put: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $;.
		].
		aStream nextPutAll: ' yourself)'.
	].
%
