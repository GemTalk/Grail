! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for InAst
expectvalue /Class
doit
CmpOpAst subclass: 'InAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
InAst comment:
'https://docs.python.org/3/library/ast.html#ast.In

Comparison operator token for membership test (in).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        InAst
'
%

expectvalue /Class
doit
InAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from InAst
removeallmethods InAst
removeallclassmethods InAst

set compile_env: 0

category: 'Grail-other'
method: InAst
printSmalltalkOn: aStream

	self error: 'InAst should be printed via printSmalltalkOn:left:rightList:'.
%

category: 'Grail-other'
method: InAst
printSmalltalkOn: aStream left: left rightList: right rhsTemp: rhsName lhsTemp: lhsName

	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPutAll: '(((' , lhsName , ' := '.
		(right at: 1) printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].

	aStream nextPutAll: ' __contains__: '.

	left ifNil: [
		aStream nextPutAll: rhsName.
	] ifNotNil: [
		left printSmalltalkWithParenthesisOn: aStream.
	].

	right size ~= 1 ifTrue: [
		aStream nextPutAll: ') ___ignore: (' , rhsName , ' := ' , lhsName , ')'.
	]
%
