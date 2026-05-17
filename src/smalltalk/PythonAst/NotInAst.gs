! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotInAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotInAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NotInAst comment:
'https://docs.python.org/3/library/ast.html#ast.NotIn

Comparison operator token for negative membership test (not in).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        NotInAst
'
%

expectvalue /Class
doit
NotInAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NotInAst
removeallmethods NotInAst
removeallclassmethods NotInAst

set compile_env: 0

category: 'Grail-other'
method: NotInAst
printSmalltalkOn: aStream

	self error: 'NotInAst should be printed via printSmalltalkOn:left:rightList:'.
%

category: 'Grail-other'
method: NotInAst
printSmalltalkOn: aStream left: left rightList: right rhsTemp: rhsName lhsTemp: lhsName
	"Emit Python ``X not in Y`` as `((Y __contains__: X) ___isTruthy___)
	@env0:not`.  `__contains__` may return a non-Boolean (e.g. integer
	from C extensions), so coerce through ___isTruthy___ before negating."

	aStream nextPutAll: '(('.

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
	].

	aStream nextPutAll: ') ___isTruthy___) @env0:not'.
%
