! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeAliasValueAst
expectvalue /Class
doit
ExpressionAst subclass: 'TypeAliasValueAst'
  instVarNames: #( aliasName value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TypeAliasValueAst comment:
'The right-hand side of a PEP 695 ``type X = V'' statement, as an
EXPRESSION node.

It exists so the binding can go through AssignAst.  A type alias binds
its name exactly as an assignment does, and ``exactly as'' covers a
long cascade -- module-scope stores route through the module''s dynamic
instVars, a ``global'' inside a doit goes through the scope handle, a
``nonlocal'' inside a class method goes through a setter cell, a
class-body binding becomes a class attribute.  Emitting ``X := ...''
directly reproduced none of it, so a module-level ``type X = int''
compiled to an undefined symbol.

The VALUE is emitted as a THUNK, never evaluated here: PEP 695 makes
``__value__'' lazy so an alias may name something defined later, or name
itself.  See TypeAliasType.
'
%

expectvalue /Class
doit
TypeAliasValueAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TypeAliasValueAst
removeallmethods TypeAliasValueAst
removeallclassmethods TypeAliasValueAst

set compile_env: 0

category: 'Grail-other'
method: TypeAliasValueAst
printSmalltalkOn: aStream
	"``TypeAliasType ___named___: 'X' valueThunk: [V]'' -- V inside a
	block, so it is not evaluated until __value__ is read."

	aStream nextPutAll: 'TypeAliasType @env1:___named___: '''.
	aStream nextPutAll: aliasName asString.
	aStream nextPutAll: ''' valueThunk: ['.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ']'
%

category: 'Grail-other'
method: TypeAliasValueAst
printSmalltalkWithParenthesisOn: aStream
	"A keyword send needs parenthesising wherever it is used as a
	sub-expression."

	aStream nextPut: $(.
	self printSmalltalkOn: aStream.
	aStream nextPut: $)
%

method: TypeAliasValueAst
aliasName
	^aliasName
%

method: TypeAliasValueAst
aliasName: newValue
	aliasName := newValue
%

method: TypeAliasValueAst
value
	^value
%

method: TypeAliasValueAst
value: newValue
	value := newValue
%
