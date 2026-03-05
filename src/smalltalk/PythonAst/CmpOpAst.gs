! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for CmpOpAst
expectvalue /Class
doit
AbstractNode subclass: 'CmpOpAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CmpOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.cmpop

Comparison operator base class.

This is an abstract base class for all comparison operator tokens (Eq, NotEq, Lt, LtE, Gt, GtE, Is, IsNot, In, NotIn).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
'
%

expectvalue /Class
doit
CmpOpAst category: 'Parser'
%

! ------------------- Remove existing behavior from CmpOpAst
removeallmethods CmpOpAst
removeallclassmethods CmpOpAst

set compile_env: 0

category: 'other'
classmethod: CmpOpAst
isAbstract

	^self == CmpOpAst
%

category: 'other'
method: CmpOpAst
printSmalltalkOn: aStream left: left rightList: right rhsTemp: rhsName lhsTemp: lhsName

	" right size ~= 1 ifTrue: [
		aStream nextPut: $(.
	]. "
	aStream nextPut: $(.

	left ifNil: [
		aStream nextPutAll: rhsName.
	] ifNotNil: [
		 left printSmalltalkWithParenthesisOn: aStream.
	].

	self printSmalltalkOn: aStream.
	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPutAll: '(' , rhsName , ' := '.
		right first printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].

	" right size ~= 1 ifTrue: [
		aStream nextPut: $).
	]. "
	aStream nextPut: $).
%
